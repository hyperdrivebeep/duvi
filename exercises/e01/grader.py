"""Binary grading: independently check the trace, then observe offline operations."""

from dataclasses import dataclass
import json

from .protocol import canonical, digest, digest_bytes, expected_return, no_tools
from .replay import Diverged, replay


@dataclass
class Failure(ValueError):
    criterion: str
    detail: str

    def __str__(self):
        return f"{self.criterion}: {self.detail}"


def require(condition, criterion, detail):
    if not condition:
        raise Failure(criterion, detail)


def load_rows(path):
    return [json.loads(line) for line in path.read_bytes().decode("utf-8").splitlines()]


def read_diagnostics(path):
    return json.loads(path.read_text(encoding="utf-8"))


def trace_score(case, rows):
    config = case.config
    require(bool(rows) and len(rows) % 2 == 0, "pairing", "빈 로그 또는 쌍 누락")
    require(all(isinstance(row, dict) for row in rows), "schema", "JSON 객체가 아닌 행")
    calls = set()
    successful = set()
    previous_status = {}
    retries = set()
    candidates = set(config["predictions"])
    required_diagnoses = []
    turns = config["turns"]
    measurements = config["measurements"]
    termination = None
    for index, (request, response) in enumerate(zip(rows[::2], rows[1::2]), 1):
        # Check in this order so a post-termination call is not mislabelled as a budget fault.
        require(termination is None, "after_end", f"{index}번 호출")
        call_id = request.get("call_id")
        require(type(call_id) is int, "pairing", f"{index}번 호출 ID 형식")
        require(call_id not in calls, "duplicate_call", f"call_id={call_id}")
        calls.add(call_id)
        require(request.get("kind") == "request" and response.get("kind") == "return"
                and type(response.get("call_id")) is int and response["call_id"] == call_id
                and request.get("return") is None
                and all(key in request and key in response
                        and canonical(request[key]) == canonical(response[key])
                        for key in ("tool", "input")), "pairing", f"{index}번 요청·반환 불일치")
        tool, arg = request["tool"], request["input"]
        require(tool in ("measure", "submit"), "schema", "도구 이름")
        turns -= 1
        measurements -= tool == "measure"
        require(turns >= 0 and measurements >= 0, "negative_budget", f"{index}번 호출")
        for row in (request, response):
            for field, expected in (("remaining_turns", turns), ("remaining_measurements", measurements)):
                value = row.get(field)
                require(type(value) is int, "schema", field)
                require(value >= 0, "negative_budget", field)
                require(value == expected, "budget_accounting", field)
        key = (tool, canonical(arg))
        require(key not in successful, "duplicate_success", f"{index}번 호출")
        if key in previous_status:
            require(previous_status[key] == "transient" and key not in retries,
                    "retry_limit", f"{index}번 호출: 일시 오류에만 재시도 1회")
            retries.add(key)
        result = expected_return(case, tool, arg, config["measurements"] - measurements)
        require(canonical(response.get("return")) == canonical(result), "tool_return",
                f"{2 * index}행: 채점 환경 반환과 다름")
        status = result["status"]
        previous_status[key] = status
        if status in ("transient", "ambiguous"):
            required_diagnoses.append({"seq": 2 * index, "label":
                                       "주입된 일시 오류" if status == "transient" else "원인 불명"})
        if status == "ok":
            successful.add(key)
            if tool == "measure":
                i = config["points"].index(arg)
                candidates = {k for k in candidates if config["predictions"][k][i] == result["value"]}
            else:
                if arg is None:
                    # A learner cannot manufacture legitimate uncertainty by skipping a probe.
                    separable = any(len({config["predictions"][k][i] for k in candidates}) > 1
                                    for i in range(len(config["points"])))
                    require(len(candidates) > 1 and not separable, "unnecessary_deferral",
                            "증거가 이미 충분하거나 허용 격자에 판별점이 있음")
                    termination = "deferred"
                else:
                    require(candidates == {arg} and arg == case.answer, "unsupported_conclusion",
                            "관측에서 답 하나가 식별되지 않거나 오답")
                    termination = "submitted"
        if termination is None and turns == 0:
            termination = "turns_exhausted"
        require(request.get("termination") is None and response.get("termination") == termination,
                "termination", f"{2 * index}행")
    require(termination in ("deferred", "submitted"), "termination", "제출 또는 판단 보류 필요")
    require(len(required_diagnoses) == len(case.faults), "fault_coverage", "주입/모호 오류를 모두 겪어야 함")
    require(any(tool == "measure" for tool, _ in successful), "no_observation", "성공한 측정 근거가 없음")
    return {"decision": termination, "task_score": 1, "turns_used": config["turns"] - turns,
            "measurements_used": config["measurements"] - measurements}, required_diagnoses


def rescore(case, path):
    """Recompute a task score from the original file without writing to it."""
    return trace_score(case, load_rows(path))[0]


def grade(case, path, diagnoses, replay_fn=replay, rescore_fn=rescore):
    try:
        before = digest_bytes(path.read_bytes())
        rows = load_rows(path)
        score, expected = trace_score(case, rows)
        require(canonical(diagnoses) == canonical(expected), "attribution",
                "오류 반환 행 번호 및 주입 근거/원인 불명 라벨 확인")
        with no_tools() as calls:
            try:
                rebuilt = replay_fn(case.config, rows)
                require(not calls, "replay_tool_calls", "재생 중 실제 도구 시도")
                require(rebuilt == digest(rows), "replay_hash", "정규화 해시 불일치")
            except (ValueError, KeyError, TypeError) as error:
                require(not calls, "replay_tool_calls", "재생 중 실제 도구 시도")
                if isinstance(error, Failure):
                    raise
                raise Failure("replay_hash", str(error)) from error
            changed = [(row["tool"], row["input"]) for row in rows[::2]]
            changed[0] = ("submit", None) if changed[0][0] == "measure" else ("measure", 999)
            try:
                replay_fn(case.config, rows, changed)
            except Diverged:
                pass
            except ValueError:
                require(not calls, "replay_tool_calls", "분기 중 실제 도구 시도")
                raise Failure("divergence", "분기에서 diverged 대신 오류 발생") from None
            else:
                raise Failure("divergence", "변경된 행동에 과거 반환을 사용함")
            require(not calls, "replay_tool_calls", "분기 중 실제 도구 시도")
        try:
            with no_tools() as calls:
                rescored = rescore_fn(case, path)
        finally:
            require(path.is_file() and digest_bytes(path.read_bytes()) == before,
                    "rescore_mutation", "원본 파일 SHA-256 변경")
            require(not calls, "rescore_tool_calls", "재채점 중 실제 도구 시도")
        require(canonical(score) == canonical(rescored), "rescore_score", "재채점 결과 불일치")
        return score | {"normalized_hash": rebuilt, "original_hash": before, "replay_tool_calls": 0}
    except Failure:
        raise
    except (OSError, KeyError, TypeError, ValueError) as error:
        raise Failure("schema", str(error)) from error
