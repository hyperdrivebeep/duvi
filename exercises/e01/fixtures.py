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
            # Keep the answer independent of the RNG that generates public settings.
            answer_bit = sha256(f"answer:{identity}".encode()).digest()[0] & 1
            cases.append(Case(config, keys[answer_bit], faults))
    return cases


def deferral_probes(seed):
    """Cross grid sign with identifiability, before or after a decisive observation."""
    rng = Random(seed)
    cases = suite(seed)
    probes = []
    for separable in (False, True):
        base = cases[2 if rng.randrange(2) else 0]
        left, right = base.config["predictions"]
        values = base.config["predictions"][left]
        other = values.copy()
        observed_point = 1
        if separable:
            points = base.config["points"]
            distinguishing_point = rng.choice([x for x in points if x != observed_point])
            other[points.index(distinguishing_point)] += rng.randint(1, 9)
            if rng.randrange(2):
                observed_point = distinguishing_point
        case = Case(base.config | {"predictions": {left: values, right: other}}, base.answer, {})
        probes.append((case, observed_point))
    return probes
