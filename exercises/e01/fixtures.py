"""Public candidate tables and grader-side worlds (not a security sandbox)."""

from dataclasses import dataclass
from hashlib import sha256
from random import Random


@dataclass(frozen=True)
class Case:
    config: dict
    answer: str
    faults: dict


def suite(seed=None):
    """Two grids × clean/faulty. An evaluation seed is selected after submission."""
    public = seed is None
    seed = 0 if public else seed
    rng = Random(seed)
    cases = []
    for signed in (False, True):
        for faulty in (False, True):
            index = len(cases) + 1
            scale, offset = (2, 1) if public else (rng.randint(1, 9), rng.randint(-9, 9))
            points = ([-rng.randint(1, 6)] if signed else []) + [1, 2, 3]
            keys = ["A", "B"] if public else rng.sample(list("ABCDEFGH"), 2)
            predictions = {
                keys[0]: [scale * x + offset for x in points],
                keys[1]: [scale * abs(x) + offset for x in points],
            }
            faults = dict(enumerate(
                ["transient", "ambiguous"] if public or seed % 2 == 0
                else ["ambiguous", "transient"], start=1,
            )) if faulty else {}
            identity = f"{'fixture' if public else 'evaluation'}:{seed}:{index}"
            config = {
                "version": 1,
                "run_id": sha256(f"run:{identity}".encode()).hexdigest()[:16],
                "world_id": sha256(f"world:{identity}".encode()).hexdigest()[:16],
                "seed": seed,
                "turns": 8 if public else 6 + rng.randrange(2),
                "measurements": 4,
                "points": points,
                "predictions": predictions,
            }
            cases.append(Case(config, rng.choice(keys), faults))
    return cases
