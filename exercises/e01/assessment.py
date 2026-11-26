"""Seeded E01 diagnostics; keys come from existing fixtures and observed grading."""

import json
from pathlib import Path
from random import Random
from tempfile import TemporaryDirectory

from .fixtures import deferral_probes, suite
from .grader import Failure, grade, rescore, trace_score
from .protocol import Tools, canonical, digest, digest_bytes, metadata, learner_config, no_tools
from .replay import Diverged, replay
from .solutions import reference


VERSION = 3


def configure(parser):
    sub = parser.add_subparsers(dest="assessment_action", required=True)
    for name in ("form", "key", "score"):
        p = sub.add_parser(name)
        p.add_argument("--seed", required=True, type=int)
        if name != "key":
            p.add_argument("--output", required=name == "form", type=Path)
        if name == "form":
            p.add_argument("--hide-seed", action="store_true", help="학습자용 파일과 출력에서 시드 숨기기")
        if name == "score":
            p.add_argument("answers", type=Path)


def observed_case(case, directory):
    config = learner_config(case.config)
    logger = reference.Logger(config)
    tools = Tools(case, logger.record)
    reference.solve(config, tools.measure, tools.submit)
    rows = [row | metadata(case.config) for row in logger.rows]
    path = directory / (case.config["run_id"] + ".jsonl")
    path.write_bytes("".join(canonical(row) + "\n" for row in rows).encode("utf-8"))
    _, diagnoses = trace_score(case, rows)
    grade(case, path, diagnoses)
    return rows, path, diagnoses


def compact(rows):
    return [{k: row[k] for k in ("seq", "kind", "call_id", "tool", "input", "return",
                                "remaining_turns", "remaining_measurements", "termination")}
            for row in rows]


def pairing_item(rng, logs):
    trace = rng.choice(("L", "R"))
    rows = logs[trace]
    # The second request for the same coordinate is the retry, not the original call.
    seen = set()
    for request in rows[::2]:
        identity = (request["tool"], request["input"])
        if identity in seen:
            target = request
            break
        seen.add(identity)
    else:
        raise ValueError("짝 문항에 재시도 요청이 없습니다.")
    fields = ("seq", "call_id", "tool", "input")
    issued = [{k: row[k] for k in fields} | {"trace": trace}
              for row in rows[::2] if row["input"] == target["input"]]
    picks = [{k: row[k] for k in fields} | {"trace": source}
             for source, log in logs.items() for row in log[1::2]
             if row["tool"] == target["tool"] and row["input"] == target["input"]]
    rng.shuffle(picks)
    for line, row in enumerate(picks, 1):
        row["line"] = line
    matches = [row["line"] for row in picks if row["trace"] == trace
               and all(row[k] == target[k] for k in ("call_id", "tool", "input"))
               and row["seq"] == target["seq"] + 1]
    if len(matches) != 1:
        raise ValueError("검증된 로그에서 반환을 하나로 연결할 수 없습니다.")
    return {
        "prompt": "L과 R은 서로 다른 실행입니다. 재시도 요청의 반환을 "
                  "목록의 line 번호로 쓰세요.",
        "requests": issued, "choices": picks,
    }, matches[0]


def fault_item(rng, rows, diagnoses):
    by_seq = {row["seq"]: row for row in rows}
    failure_rows = [by_seq[item["seq"]] for item in diagnoses]
    refs = dict(zip((row["seq"] for row in failure_rows), rng.sample(range(100, 1000), len(failure_rows))))
    audit = [{"ref": refs[row["seq"]], "action": "시험 장치가 측정을 한 번 차단함"}
             for row in failure_rows if row["return"].get("evidence") == "injected_transient"]
    rng.shuffle(diagnoses)
    fields = ("seq", "call_id", "tool", "input")
    targets = [{k: by_seq[item["seq"] - 1][k] for k in fields} for item in diagnoses]
    returns = [{k: row[k] for k in fields} | {"value": None, "ref": refs[row["seq"]]}
               for row in failure_rows]
    return {
        "prompt": "fault_1과 fault_2는 아래 요청 순서입니다. 각각 근거 반환 행 번호(seq)와 "
                  "원인 라벨(label: 주입된 일시 오류 또는 원인 불명)을 쓰세요.",
        "requests": targets, "returns": returns, "audit": audit,
    }, {f"fault_{i}": item for i, item in enumerate(diagnoses, 1)}


def operation_item(rng, case, rows, path):
    actions = [(row["tool"], row["input"]) for row in rows[::2]]
    changed = [("measure", 999)] + actions[1:]

    def probe(method, proposed):
        before = digest_bytes(path.read_bytes())
        with no_tools() as calls:
            if method == replay:
                try:
                    result = method(case.config, rows, proposed)
                except Diverged as error:
                    result = digest(str(error))
            else:
                result = digest(method(case, path))
        return {"fingerprint": result, "tool_calls": len(calls),
                "file_before": before, "file_after": digest_bytes(path.read_bytes())}

    methods = [(replay, "replay"), (rescore, "rescore")]
    rng.shuffle(methods)
    outputs = {letter: [probe(method, actions), probe(method, changed)]
               for letter, (method, _) in zip(("A", "B"), methods)}
    return {
        "prompt": "각 작업의 결과는 기록 행동 / 첫 입력만 999로 바꾼 제안 순으로 표시됩니다. "
                  "A와 B에 각각 replay 또는 rescore를 쓰세요.",
        "record_fingerprint": digest(rows), "outputs": outputs,
    }, {f"operation_{letter}": name for letter, (_, name) in zip(("A", "B"), methods)}


def build(seed):
    rng = Random(seed)
    _, other_faulty, signed, faulty = suite(seed)
    key = {}
    with TemporaryDirectory() as tmp:
        directory = Path(tmp)
        rows, path, diagnoses = observed_case(faulty, directory)
        other_rows, _, _ = observed_case(other_faulty, directory)
        pair, key["pair"] = pairing_item(rng, {"L": rows, "R": other_rows})
        faults, fault_key = fault_item(rng, rows, diagnoses)
        operations, operation_key = operation_item(rng, faulty, rows, path)
        key.update(fault_key | operation_key)
        clean, _, _ = observed_case(signed, directory)
        decisions = deferral_probes(seed)
        rng.shuffle(decisions)
        cards = {}
        for letter, (case, observed_point) in zip(("A", "B"), decisions):
            submission = []
            tools = Tools(case, submission.append)
            tools.measure(observed_point)
            tools.submit(None)
            submission = [row | {"seq": i} for i, row in enumerate(submission, 1)]
            try:
                result, _ = trace_score(case, submission)
            except Failure as error:
                if error.criterion != "unnecessary_deferral":
                    raise
                key[f"defer_{letter}"] = "불필요"
            else:
                if result["decision"] != "deferred":
                    raise ValueError("평가 상황이 보류를 검사하지 못했습니다.")
                key[f"defer_{letter}"] = "정당"
            cards[letter] = {
                "points": case.config["points"], "predictions": case.config["predictions"],
                "observations": [compact(submission)[1]],
            }

    form = {
        "version": VERSION, "seed": seed,
        "items": {
            "pair": pair,
            "operations": operations,
            "faults": faults,
            "deferral": {"prompt": "각 상황에서 다음 행동인 submit(null)을 "
                                   "정당 또는 불필요로 판정하세요.",
                         "situations": cards},
            "explanation": {
                "prompt": "별도 사례의 전체 로그를 읽으세요. ① 첫 호출에서 실제로 일어난 일과 "
                          "남은 예산, ② 로그를 그대로 재생할 때와 첫 입력만 바꿀 때의 차이 및 "
                          "무엇을 고정했는지, ③ 어느 행과 허용 후보·좌표를 근거로 결론을 내릴 수 "
                          "있으며 그 결론의 범위는 어디까지인지 자기 말로 쓰세요.",
                "changed_first_input": 999,
                "settings": learner_config(signed.config), "log": compact(clean),
            },
        },
        "answer_template": {
            item: {"seq": None, "label": None} if isinstance(key.get(item), dict) else None
            for item in (*sorted(key), "explanation")
        },
    }
    return form, key


def score(key, answers):
    if not isinstance(answers, dict) or answers.keys() - (key.keys() | {"explanation"}):
        raise ValueError("답안은 문항 ID를 키로 갖는 JSON 객체여야 합니다.")
    if "explanation" in answers and answers["explanation"] is not None and not isinstance(answers["explanation"], str):
        raise ValueError("explanation은 문자열이어야 합니다.")
    points = {}
    for item, expected in key.items():
        actual = answers.get(item)
        if isinstance(expected, dict):
            points[item] = int(isinstance(actual, dict) and actual.keys() == expected.keys()
                               and type(actual["seq"]) is int and actual["seq"] == expected["seq"]
                               and isinstance(actual["label"], str)
                               and actual["label"].strip() == expected["label"])
            continue
        if isinstance(actual, str):
            actual = actual.strip()
        points[item] = int(type(actual) is type(expected) and actual == expected)
    return {"objective_score": sum(points.values()), "objective_max": len(key),
            "points_by_item": points, "free_text": "human-review-required"}


def execute(args):
    form, key = build(args.seed)
    if args.assessment_action == "key":
        return {"version": VERSION, "seed": args.seed, "answers": key}
    if args.assessment_action == "form":
        output = form
        if args.hide_seed:
            del output["seed"]
    else:
        answers = json.loads(args.answers.read_text(encoding="utf-8-sig"))
        output = {"version": VERSION, "seed": args.seed} | score(key, answers)
    if args.output is None:
        return output
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as file:
        json.dump(output, file, indent=2, ensure_ascii=False)
        file.write("\n")
    return {"output": str(args.output)} | ({"seed": args.seed} if "seed" in output else {})
