"""참조 풀이 — 독립 시도 후 비교할 때만 읽으세요."""

from ..protocol import metadata, state_hash


class Logger:
    def __init__(self, config):
        self.meta = metadata(config)
        self.previous = self.meta["config_hash"]
        self.rows = []

    def record(self, event):
        row = self.meta | event | {"seq": len(self.rows) + 1}
        self.previous = state_hash(self.previous, row)
        self.rows.append(row | {"state_hash": self.previous})


def solve(config, measure, submit):
    points = config["points"]
    table = config["predictions"]
    candidates = list(table)
    budget = config["measurements"]
    # Two warm-up positive observations (or attempts). The third coordinate
    # is chosen for discrimination when the grid permits it.
    positive = [x for x in points if x > 0]
    plan = positive[:2] + [x for x in points if x < 0]
    for x in plan:
        if budget == 0 or len(candidates) == 1:
            break
        result = measure(x)
        budget -= 1
        if result["status"] == "transient" and budget > 0:
            result = measure(x)
            budget -= 1
        if result["status"] == "ok":
            candidates = [key for key in candidates if table[key][points.index(x)] == result["value"]]
    submit(candidates[0] if len(candidates) == 1 else None)


def diagnostics(rows):
    labels = {"transient": "주입된 일시 오류", "ambiguous": "원인 불명"}
    return [{"seq": row["seq"], "label": labels[row["return"]["status"]]}
            for row in rows if row["kind"] == "return" and row["return"]["status"] in labels]
