"""Offline practice and evaluation entry point: python -m exercises.e01."""

import argparse
from copy import deepcopy
from importlib import import_module
import json
from pathlib import Path
import sys

from .fixtures import suite
from .grader import grade, load_rows, read_diagnostics, rescore
from .protocol import Tools, canonical, digest_bytes
from .replay import replay


def log_path(directory, case):
    return directory / (case.config["run_id"] + ".jsonl")


def run_case(case, agent, directory):
    config = deepcopy(case.config)
    logger = agent.Logger(deepcopy(config))
    tools = Tools(case, logger.record)
    agent.solve(config, tools.measure, tools.submit)
    diagnoses = agent.diagnostics(deepcopy(logger.rows))
    directory.mkdir(parents=True, exist_ok=True)
    path = log_path(directory, case)
    path.write_bytes("".join(canonical(row) + "\n" for row in logger.rows).encode("utf-8"))
    path.with_suffix(".config.json").write_text(canonical(case.config), encoding="utf-8")
    path.with_suffix(".diagnoses.json").write_text(canonical(diagnoses), encoding="utf-8")
    return path


def main(argv=None):
    parser = argparse.ArgumentParser(description="Duvi E01 오프라인 도구")
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("run", "evaluate", "grade"):
        p = commands.add_parser(name)
        p.add_argument("directory", type=Path)
        p.add_argument("--seed", type=int, required=name == "evaluate")
        if name != "grade":
            p.add_argument("--agent", default="exercises.e01.starter")
    for name in ("replay", "rescore"):
        p = commands.add_parser(name)
        p.add_argument("log", type=Path)
        if name == "replay":
            p.add_argument("--actions", type=Path, help='변경된 행동 배열 JSON (예: [["measure",999]])')
        else:
            p.add_argument("--seed", type=int)
    args = parser.parse_args(argv)
    try:
        if args.command == "replay":
            config = read_diagnostics(args.log.with_suffix(".config.json"))
            actions = read_diagnostics(args.actions) if args.actions else None
            print(canonical({"normalized_hash": replay(config, load_rows(args.log), actions)}))
        elif args.command == "rescore":
            case = next((c for c in suite(args.seed) if c.config["run_id"] == args.log.stem), None)
            if case is None:
                raise ValueError("파일명에 해당하는 실행이 없습니다. 평가 로그라면 같은 --seed를 지정하세요.")
            before = digest_bytes(args.log.read_bytes())
            score = rescore(case, args.log)
            print(canonical(score | {"original_hash_before": before,
                                     "original_hash_after": digest_bytes(args.log.read_bytes())}))
        else:
            agent = import_module(args.agent) if args.command != "grade" else None
            for case in suite(args.seed):
                path = run_case(case, agent, args.directory) if agent else log_path(args.directory, case)
                if args.command == "run":
                    print(path)
                else:
                    result = grade(case, path, read_diagnostics(path.with_suffix(".diagnoses.json")))
                    print(canonical({"status": "PASS", "run_id": case.config["run_id"]} | result))
    except (OSError, ValueError, KeyError, TypeError, ImportError, NotImplementedError) as error:
        print(f"E01: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
