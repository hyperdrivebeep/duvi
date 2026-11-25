from copy import deepcopy
import io
from contextlib import redirect_stderr
from dataclasses import replace
from pathlib import Path
from secrets import randbits
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from exercises.e01 import starter
from exercises.e01.__main__ import main, run_case
from exercises.e01.fixtures import suite
from exercises.e01.grader import Failure, grade, load_rows, read_diagnostics, rescore
from exercises.e01.protocol import Tools, canonical, digest, initial, learner_config, metadata, state_hash
from exercises.e01.replay import Diverged, replay
from exercises.e01.solutions import reference


class E01Tests(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.directory = Path(temp.name)
        self.case = suite()[3]
        self.path = run_case(self.case, reference, self.directory)
        self.rows = load_rows(self.path)
        self.diagnoses = read_diagnostics(self.path.with_suffix(".diagnoses.json"))

    def write_rows(self, rows):
        # Recompute the hash chain so semantic violations, not stale hashes, reject the log.
        previous = digest(learner_config(self.case.config))
        meta = metadata(self.case.config)
        for i, row in enumerate(rows, 1):
            row["seq"] = i
            payload = {key: value for key, value in row.items() if key not in meta and key != "state_hash"}
            previous = row["state_hash"] = state_hash(previous, payload)
            row.update(meta)
        self.path.write_text("".join(canonical(row) + "\n" for row in rows), encoding="utf-8")

    def reject(self, criterion, diagnoses=None, **kwargs):
        with self.assertRaises(Failure) as raised:
            grade(self.case, self.path, self.diagnoses if diagnoses is None else diagnoses, **kwargs)
        self.assertEqual(raised.exception.criterion, criterion, str(raised.exception))

    def test_reference_public_and_two_fresh_seeds(self):
        seed = randbits(60) * 2
        for value in (None, seed, seed + 1):
            for index, case in enumerate(suite(value)):
                with self.subTest(seed=value, case=index):
                    path = run_case(case, reference, self.directory)
                    result = grade(case, path, read_diagnostics(path.with_suffix(".diagnoses.json")))
                    self.assertEqual(result["decision"], "deferred" if index < 2 else "submitted")
                    self.assertEqual(result["replay_tool_calls"], 0)
                    self.assertEqual(result["measurements_used"], (2, 3, 3, 4)[index])

    def test_agent_configuration_excludes_grading_metadata(self):
        seed = randbits(60)
        case = suite(seed)[3]
        seen = []

        def logger(config):
            seen.append(deepcopy(config))
            config["points"].clear()
            return reference.Logger(seen[-1])

        def solve(config, measure, submit):
            seen.append(deepcopy(config))
            reference.solve(config, measure, submit)

        agent = SimpleNamespace(Logger=logger, solve=solve, diagnostics=reference.diagnostics)
        path = run_case(case, agent, self.directory)
        for config in seen:
            self.assertEqual(config, {key: case.config[key]
                                      for key in ("turns", "measurements", "points", "predictions")})
        row = load_rows(path)[0]
        self.assertEqual(row["seed"], seed)
        self.assertEqual(row["config_hash"], digest(case.config))
        grade(suite(seed)[3], path, read_diagnostics(path.with_suffix(".diagnoses.json")))

    def test_unpaired_request(self):
        self.write_rows(self.rows[:-1])
        self.reject("pairing")

    def test_duplicate_call_id(self):
        self.rows[2]["call_id"] = self.rows[3]["call_id"] = 1
        self.write_rows(self.rows)
        self.reject("duplicate_call")

    def test_duplicate_success(self):
        case = suite()[2]
        logger = reference.Logger(learner_config(case.config))
        tools = Tools(case, logger.record)
        tools.measure(1)
        tools.measure(1)
        self.case = case
        self.write_rows(logger.rows)
        self.reject("duplicate_success")

    def test_negative_budget(self):
        self.rows[0]["remaining_measurements"] = -1
        self.write_rows(self.rows)
        self.reject("negative_budget")

    def test_computed_budget_overdraw_even_when_logged_budget_is_nonnegative(self):
        # A fifth measurement hides the overdraw by reporting zero instead of -1.
        # Only the computed-budget guard can reject it as negative_budget.
        self.case = suite()[2]
        config = self.case.config
        logger = reference.Logger(learner_config(config))
        overbudget = replace(self.case, config=config | {"measurements": config["measurements"] + 1})
        tools = Tools(overbudget, logger.record)
        for x in config["points"] + [999]:
            tools.measure(x)
        for row in logger.rows:
            row["remaining_measurements"] = max(0, row["remaining_measurements"] - 1)
        self.write_rows(logger.rows)
        self.reject("negative_budget")

    def test_call_after_end(self):
        self.write_rows(self.rows + deepcopy(self.rows[:2]))
        self.reject("after_end")

    def test_two_retries_after_transient(self):
        logger = reference.Logger(learner_config(self.case.config))
        tools = Tools(self.case, logger.record)
        for _ in range(3):
            tools.measure(1)
        self.write_rows(logger.rows)
        self.reject("retry_limit")

    def test_replay_calling_tool(self):
        tools = Tools(self.case, lambda _: None)

        def broken(config, rows, actions=None):
            tools.measure(1)
            return replay(config, rows, actions)

        self.reject("replay_tool_calls", replay_fn=broken)
        self.assertEqual(tools.trace, [])

    def test_replay_wrong_hash(self):
        self.reject("replay_hash", replay_fn=lambda *_: "wrong")

    def test_replay_ignoring_changed_action(self):
        self.reject("divergence", replay_fn=lambda config, rows, actions=None: replay(config, rows))

    def test_state_hash_tampering(self):
        self.rows[0]["state_hash"] = "0" * 64
        self.path.write_text("\n".join(map(canonical, self.rows)), encoding="utf-8")
        self.reject("replay_hash")

    def test_rescore_mutating_log(self):
        def broken(case, path):
            score = rescore(case, path)
            # Semantics stay identical, but formatting and raw bytes have changed.
            path.write_bytes(path.read_bytes().replace(b'":', b'": '))
            return score

        self.reject("rescore_mutation", rescore_fn=broken)

    def test_rescore_wrong_score(self):
        self.reject("rescore_score", rescore_fn=lambda *_: {})

    def test_wrong_attribution(self):
        for field, value in (("seq", 1), ("label", "추정 원인")):
            with self.subTest(field=field):
                diagnoses = deepcopy(self.diagnoses)
                diagnoses[0 if field == "seq" else 1][field] = value
                self.reject("attribution", diagnoses)

    def test_unnecessary_deferral(self):
        case = suite()[2]
        logger = reference.Logger(learner_config(case.config))
        tools = Tools(case, logger.record)
        tools.measure(1)
        tools.submit(None)
        self.case = case
        self.write_rows(logger.rows)
        self.reject("unnecessary_deferral", [])

    def test_replay_reads_recorded_return_and_rejects_later_branch(self):
        with patch("exercises.e01.protocol.expected_return", side_effect=AssertionError("live oracle")):
            self.assertEqual(replay(self.case.config, self.rows), digest(self.rows))
            actions = [(row["tool"], row["input"]) for row in self.rows[::2]]
            actions[-1] = ("submit", None)
            with self.assertRaisesRegex(Diverged, f"diverged: {len(self.rows) - 1}행"):
                replay(self.case.config, self.rows, actions)

    def test_starter_fails_with_actionable_messages(self):
        out = self.directory / "starter"
        for implement_loop, todo in ((False, "starter.solve"), (True, "starter.Logger.record")):
            with self.subTest(todo=todo), redirect_stderr(io.StringIO()) as stderr:
                if implement_loop:
                    with patch.object(starter, "solve", lambda config, measure, submit: measure(1)):
                        status = main(["run", str(out)])
                else:
                    status = main(["run", str(out)])
                self.assertEqual(status, 1)
                self.assertIn(todo, stderr.getvalue())
                self.assertNotIn("Traceback", stderr.getvalue())
                self.assertFalse(out.exists())

    def test_failed_attempts_decrement_both_budgets(self):
        state = initial(self.case.config)
        tools = Tools(self.case, lambda _: None)
        self.assertEqual(tools.measure(1)["status"], "transient")
        self.assertEqual(tools.measure(1)["status"], "ambiguous")
        for index, row in enumerate(tools.trace):
            self.assertEqual(row["remaining_turns"], state["remaining_turns"] - index // 2 - 1)
            self.assertEqual(row["remaining_measurements"], state["remaining_measurements"] - index // 2 - 1)
