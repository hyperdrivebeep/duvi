"""Seeded E01 diagnostics; keys come from existing fixtures and observed grading."""

import json
from pathlib import Path
from random import Random
from tempfile import TemporaryDirectory

from .fixtures import suite
from .grader import Failure, grade, rescore, trace_score
from .protocol import Tools, canonical, digest_bytes, metadata, learner_config
from .replay import replay
from .solutions import reference


def configure(parser):
    sub = parser.add_subparsers(dest="assessment_action", required=True)
    for name in ("form", "key", "score"):
        p = sub.add_parser(name)
        p.add_argument("--seed", required=True, type=int)
        if name != "key":
            p.add_argument("--output", required=name == "form", type=Path)
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


def build(seed):
    rng = Random(seed)
    positive, _, signed, faulty = suite(seed)
    key = {}
    with TemporaryDirectory() as tmp:
        directory = Path(tmp)
        rows, path, diagnoses = observed_case(faulty, directory)
        diagnosis_rows = [item["seq"] for item in diagnoses]
        for i, item in enumerate(diagnoses, 1):
            key[f"fault_{i}"] = item["label"]

        clean, _, _ = observed_case(signed, directory)
        decisions = [positive, signed]
        rng.shuffle(decisions)
        cards = {}
        for letter, case in zip(("A", "B"), decisions):
            submission = []
            tools = Tools(case, submission.append)
            tools.measure(next(x for x in case.config["points"] if x > 0))
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

        first = rng.choice(rows[::2])
        matching = [row for row in rows[1::2] if all(row[field] == first[field]
                                                     for field in ("call_id", "tool", "input"))]
        if len(matching) != 1:
            raise ValueError("검증된 로그에서 반환을 하나로 연결할 수 없습니다.")
        key["pair"] = matching[0]["seq"]
        returns = compact(rows[1::2])
        rng.shuffle(returns)
        before = digest_bytes(path.read_bytes())
        ops = [("replay", {"normalized_hash": replay(faulty.config, rows)}),
               ("rescore", {"task_score": rescore(faulty, path)["task_score"]})]
        if before != digest_bytes(path.read_bytes()):
            raise ValueError("작업이 원본을 변경했습니다.")
        rng.shuffle(ops)
        outputs = {}
        for letter, (name, output) in zip(("A", "B"), ops):
            key[f"operation_{letter}"] = name
            outputs[letter] = output

    form = {
        "version": 1, "seed": seed,
        "items": {
            "pair": {"prompt": "제시한 요청에 대응하는 반환의 원래 행 번호(seq)를 숫자로 쓰세요.",
                     "request": compact([first])[0], "choices": returns},
            "operations": {"prompt": "같은 원본을 바꾸지 않고 얻은 두 출력입니다. 각각 replay 또는 rescore를 고르세요.",
                           "outputs": outputs},
            "faults": {"prompt": "첫 번째·두 번째 지정 반환의 원인 라벨을 각각 쓰세요. "
                                 "선택지: 주입된 일시 오류 / 원인 불명",
                       "rows": [row for row in compact(rows) if row["seq"] in diagnosis_rows]},
            "deferral": {"prompt": "각 상황에서 다음 행동으로 submit(null)을 하면 정당한가요? "
                                   "후보 표와 성공한 측정을 보고 각각 정당 또는 불필요를 쓰세요.",
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
        "answer_template": dict.fromkeys((*sorted(key), "explanation")),
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
        if isinstance(actual, str):
            actual = actual.strip()
        points[item] = int(type(actual) is type(expected) and actual == expected)
    return {"objective_score": sum(points.values()), "objective_max": len(key),
            "points_by_item": points, "free_text": "human-review-required"}


def execute(args):
    form, key = build(args.seed)
    if args.assessment_action == "key":
        return {"version": 1, "seed": args.seed, "answers": key}
    if args.assessment_action == "form":
        output = form
    else:
        answers = json.loads(args.answers.read_text(encoding="utf-8-sig"))
        output = {"version": 1, "seed": args.seed} | score(key, answers)
    if args.output is None:
        return output
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as file:
        json.dump(output, file, indent=2, ensure_ascii=False)
        file.write("\n")
    return {"output": str(args.output), "seed": args.seed}
