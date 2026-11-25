"""Rebuild events using only recorded returns and the public configuration."""

from .protocol import begin, canonical, digest, end, event, initial, learner_config, metadata, state_hash


class Diverged(ValueError):
    pass


def replay(config, rows, actions=None):
    if not rows or len(rows) % 2:
        raise Diverged("diverged: 요청·반환 쌍이 누락됨")
    meta = metadata(config)
    previous = digest(learner_config(config))
    state = initial(config)
    rebuilt = []
    actions = iter(actions if actions is not None
                   else ((row["tool"], row["input"]) for row in rows[::2]))

    def append(payload):
        nonlocal previous
        row = payload | {"seq": len(rebuilt) + 1}
        previous = state_hash(previous, row)
        rebuilt.append(row | meta | {"state_hash": previous})
        if canonical(rebuilt[-1]) != canonical(rows[len(rebuilt) - 1]):
            raise Diverged(f"diverged: {len(rebuilt)}행")

    for request, response in zip(rows[::2], rows[1::2]):
        action = next(actions, None)
        if action is None or canonical(action) != canonical((request["tool"], request["input"])):
            raise Diverged(f"diverged: {request['seq']}행의 행동이 다름")
        tool, arg = action
        call_id = len(rebuilt) // 2 + 1
        state = begin(state, tool)
        append(event("request", call_id, tool, arg, None, state))
        result = response["return"]
        state = end(state, tool, arg, result)
        append(event("return", call_id, tool, arg, result, state))
    if next(actions, None) is not None:
        raise Diverged("diverged: 기록에 없는 추가 행동")
    return digest(rebuilt)
