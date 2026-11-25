"""Public JSONL protocol, state transitions, and live tool boundary."""

from contextlib import contextmanager
from contextvars import ContextVar
from copy import deepcopy
from hashlib import sha256
import json


def digest_bytes(data):
    return sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return digest_bytes(canonical(value).encode("utf-8"))


def metadata(config):
    return {key: config[key] for key in ("version", "run_id", "world_id", "seed")} | {
        "config_hash": digest(config),
    }


def learner_config(config):
    return deepcopy({key: config[key] for key in ("turns", "measurements", "points", "predictions")})


def initial(config):
    return {"remaining_turns": config["turns"], "remaining_measurements": config["measurements"],
            "termination": None}


def begin(state, tool):
    """Every accepted request consumes one turn; any measure attempt consumes one measurement."""
    if state["termination"] is not None or state["remaining_turns"] <= 0:
        raise ValueError("종료 후 호출")
    if tool not in ("measure", "submit"):
        raise ValueError("알 수 없는 도구")
    if tool == "measure" and state["remaining_measurements"] <= 0:
        raise ValueError("측정 예산 소진")
    return state | {
        "remaining_turns": state["remaining_turns"] - 1,
        "remaining_measurements": state["remaining_measurements"] - (tool == "measure"),
    }


def end(state, tool, arg, result):
    if tool == "submit" and result["status"] == "ok":
        return state | {"termination": "deferred" if arg is None else "submitted"}
    if state["remaining_turns"] == 0:
        return state | {"termination": "turns_exhausted"}
    return state


def event(kind, call_id, tool, arg, result, state):
    return dict(kind=kind, call_id=call_id, tool=tool, input=arg, **{"return": result}, **state)


def state_hash(previous, payload):
    return digest([previous, payload])


def expected_return(case, tool, arg, measurement_number):
    """Oracle for live tools and grading; never used in replay."""
    config = case.config
    if tool == "submit":
        # A receipt, not a correctness oracle for the learner.
        return {"status": "ok"} if arg is None or (
            isinstance(arg, str) and arg in config["predictions"]
        ) else {"status": "invalid"}
    if type(arg) is not int or arg not in config["points"]:
        return {"status": "invalid"}
    fault = case.faults.get(measurement_number)
    if fault == "transient":
        return {"status": "transient", "evidence": "injected_transient"}
    if fault == "ambiguous":
        return {"status": "ambiguous", "message": "measurement unavailable"}
    index = config["points"].index(arg)
    return {"status": "ok", "value": config["predictions"][case.answer][index]}


_watch = ContextVar("e01_tool_watch", default=None)


@contextmanager
def no_tools():
    attempted = []
    token = _watch.set(attempted)
    try:
        yield attempted
    finally:
        _watch.reset(token)


class Tools:
    def __init__(self, case, record):
        self._case = case
        self._record = record
        self._state = initial(case.config)
        self.trace = []

    def measure(self, x):
        return self._call("measure", x)

    def submit(self, candidate):
        return self._call("submit", candidate)

    def _emit(self, payload):
        self.trace.append(deepcopy(payload))
        self._record(deepcopy(payload))

    def _call(self, tool, arg):
        attempted = _watch.get()
        if attempted is not None:
            attempted.append(tool)
            raise ValueError("오프라인 검사 중 도구 호출")
        call_id = len(self.trace) // 2 + 1
        self._state = begin(self._state, tool)
        self._emit(event("request", call_id, tool, arg, None, self._state))
        n = self._case.config["measurements"] - self._state["remaining_measurements"]
        result = expected_return(self._case, tool, arg, n)
        self._state = end(self._state, tool, arg, result)
        self._emit(event("return", call_id, tool, arg, result, self._state))
        return result
