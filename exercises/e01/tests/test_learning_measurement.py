import argparse
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from exercises.e01 import assessment, session_log
from exercises.e01.__main__ import main


class LearningCliTest(unittest.TestCase):
    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        log_patch = patch.object(session_log, "LOG_DIR", self.root / "log")
        log_patch.start()
        self.addCleanup(log_patch.stop)

    def cli(self, *args, status=0):
        out, err = StringIO(), StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            result = main(list(args))
        self.assertEqual(result, status, err.getvalue())
        return json.loads(out.getvalue()) if result == 0 else err.getvalue()

    def synthetic(self, minute, *args, status=0, offset="+09:00", hour="14"):
        return self.cli("log", *args, "--synthetic", "--at",
                        f"2020-01-01T{hour}:{minute:02d}:00{offset}", status=status)

    def test_summary_excludes_break_and_uncertain_or_open_sessions(self):
        first = self.synthetic(0, "start", "implement")
        note = self.synthetic(1, "note", "--help-level", "none")
        self.assertEqual(first["session_id"], note["session_id"])
        self.synthetic(5, "note", "--help-level", "hint", "--text", "synthetic")
        self.synthetic(6, "note", "--help-level", "AI-help")
        self.synthetic(8, "note", "--attempt", "X-01", "--outcome", "fail", "--text", "pairing")
        self.synthetic(9, "note", "--attempt", "X-02", "--outcome", "pass", "--text", "all cases")
        self.synthetic(10, "stop", "--reason", "break")
        self.synthetic(20, "start", "implement")
        self.synthetic(25, "stop", "--reason", "interruption")
        self.synthetic(26, "start", "replay")
        self.synthetic(40, "stop", "--reason", "uncertain")
        self.synthetic(41, "start", "post")
        result = self.cli("log", "summary", "--synthetic")
        self.assertEqual(result["source"], "synthetic")
        self.assertEqual(result["active_minutes"]["implement"], 15)
        self.assertEqual(result["active_minutes"]["replay"], 0)
        self.assertEqual(result["active_minutes"]["post"], 0)
        self.assertEqual(result["discarded_sessions"], 1)
        self.assertEqual(result["open_session"]["phase"], "post")
        self.assertEqual(result["closed_sessions_by_help"],
                         {"none": 0, "hint": 1, "solution-peek": 0, "AI-help": 1})
        self.assertEqual(result["closed_sessions_unknown_help"], 2)
        self.assertEqual(result["attempt_count"], 2)
        self.assertEqual(result["grader_outcomes"], {"pass": 1, "fail": 1, "error": 0})
        self.assertEqual(self.cli("log", "summary")["attempts"], [])
        self.assertFalse((self.root / "log" / "sessions.jsonl").exists())

    def test_utc_offset_and_invalid_events_do_not_distort_time(self):
        self.synthetic(0, "stop", status=1)
        self.synthetic(0, "start", "pre")
        self.synthetic(1, "start", "post", status=1)
        self.synthetic(0, "stop", hour="13", status=1)
        self.synthetic(1, "note", "--attempt", "no-outcome", status=1)
        self.synthetic(1, "note", "--attempt", "X", "--outcome", "error", "--text", "environment")
        self.synthetic(2, "note", "--attempt", "X", "--outcome", "error", "--text", "duplicate", status=1)
        self.synthetic(5, "stop", offset="+00:00", hour="05")
        self.assertEqual(self.cli("log", "summary", "--synthetic")["active_minutes"]["pre"], 5)
        self.cli("log", "start", "setup", "--at", "2020-01-01T14:00:00+09:00", status=1)
        self.cli("log", "start", "setup", "--synthetic", "--at", "2020-01-01T14:00:00", status=1)

    def test_real_clock_journal_and_schema_phase_enums(self):
        schema = json.loads(Path(session_log.__file__).with_name("SESSION_SCHEMA.json").read_text(encoding="utf-8"))
        row = self.cli("log", "start", "setup")
        self.assertEqual(row["source"], "self-report")
        self.assertIsNotNone(session_log.parse_time(row["timestamp"]).utcoffset())
        self.assertEqual(set(row), set(schema["required"]))
        self.assertEqual(tuple(schema["properties"]["phase"]["enum"]), session_log.PHASES)
        self.assertEqual(tuple(schema["properties"]["help"]["enum"]), session_log.HELP)
        self.assertEqual(tuple(schema["properties"]["outcome"]["enum"]), session_log.OUTCOMES)
        self.assertEqual(self.cli("log", "note", "--help-level", "none")["help"], "none")
        self.assertEqual(self.cli("log", "stop")["session_id"], row["session_id"])
        self.assertEqual(self.cli("log", "summary")["closed_sessions_by_help"]["none"], 1)

    def test_assessment_cli_keeps_key_out_of_form_and_scores_separately(self):
        seed = "87"
        form_path, answers_path, score_path = (self.root / f"{p}.json" for p in ("form", "answers", "score"))
        self.cli("assessment", "form", "--seed", seed, "--output", str(form_path))
        form = json.loads(form_path.read_text(encoding="utf-8"))
        self.assertEqual(form["seed"], int(seed))
        self.assertEqual(form["answer_template"]["fault_1"], {"seq": None, "label": None})
        self.assertIsNone(form["answer_template"]["pair"])
        self.assertNotIn("answers", form)
        key = self.cli("assessment", "key", "--seed", seed)["answers"]
        answers_path.write_text(json.dumps(key | {"explanation": "Needs human scoring"}), encoding="utf-8")
        self.cli("assessment", "score", "--seed", seed, str(answers_path), "--output", str(score_path))
        score = json.loads(score_path.read_text(encoding="utf-8"))
        self.assertEqual(score["objective_score"], 7)
        self.assertEqual(score["free_text"], "human-review-required")
        self.cli("assessment", "form", "--seed", seed, "--output", str(form_path), status=1)

    def test_tutor_can_hold_seed_outside_learner_form(self):
        form_path = self.root / "blind.json"
        result = self.cli("assessment", "form", "--seed", "87", "--output", str(form_path), "--hide-seed")
        form = json.loads(form_path.read_text(encoding="utf-8"))
        expected, _ = assessment.build(87)
        del expected["seed"]
        self.assertEqual(form, expected)
        self.assertNotIn("seed", result)


class AssessmentBankTest(unittest.TestCase):
    def test_parallel_forms_have_independently_checkable_keys(self):
        forms = []
        for seed in (2026112601, 2026112602, 2026112603):
            form, key = assessment.build(seed)
            forms.append(form)
            self.assertEqual((form, key), assessment.build(seed))
            self.assertEqual(len(key), 7)
            items = form["items"]
            pair = items["pair"]
            first, retry = sorted(pair["requests"], key=lambda row: row["seq"])
            self.assertEqual(first["input"], retry["input"])
            self.assertNotEqual(first["call_id"], retry["call_id"])
            duplicates = [row for row in pair["choices"] if row["call_id"] == retry["call_id"]]
            self.assertEqual({row["trace"] for row in duplicates}, {"L", "R"})
            self.assertEqual(key["pair"], next(row["line"] for row in duplicates
                                              if row["trace"] == retry["trace"]))
            operations = items["operations"]
            for letter, (original, changed) in operations["outputs"].items():
                target = "replay" if original["fingerprint"] == operations["record_fingerprint"] else "rescore"
                self.assertEqual(key[f"operation_{letter}"], target)
                self.assertEqual(set(original), set(changed))
                self.assertEqual(set(original), {"fingerprint", "tool_calls", "file_before", "file_after"})
                self.assertEqual(original["fingerprint"] != changed["fingerprint"], target == "replay")
                for evidence in (original, changed):
                    self.assertEqual(evidence["file_before"], evidence["file_after"])
                    self.assertEqual(evidence["tool_calls"], 0)
            fault = items["faults"]
            audit_refs = {record["ref"] for record in fault["audit"]}
            for index, request in enumerate(fault["requests"], 1):
                row = next(row for row in fault["returns"] if row["call_id"] == request["call_id"])
                self.assertNotIn("status", row)
                self.assertIsNone(row["value"])
                expected = "주입된 일시 오류" if row["ref"] in audit_refs else "원인 불명"
                self.assertEqual(key[f"fault_{index}"], {"seq": row["seq"], "label": expected})
            for letter, situation in items["deferral"]["situations"].items():
                prediction_rows = list(situation["predictions"].values())
                self.assertEqual(len(prediction_rows), 2)
                observation, = situation["observations"]
                index = situation["points"].index(observation["input"])
                self.assertEqual(observation["return"]["status"], "ok")
                survivors = [row for row in prediction_rows if row[index] == observation["return"]["value"]]
                self.assertTrue(survivors)
                target = "정당" if len(survivors) > 1 and all(row == survivors[0] for row in survivors) else "불필요"
                self.assertEqual(key[f"defer_{letter}"], target)
        self.assertEqual(len({str(form["items"]["explanation"]) for form in forms}), 3)
        self.assertEqual(len({tuple(form["items"]) for form in forms}), 1)

    def test_operation_order_varies_across_seeds(self):
        orders = set()
        for seed in (2026112601, 2026112602, 2026112603, 2026112604, 2026112605, 2026112606):
            form, key = assessment.build(seed)
            operations = form["items"]["operations"]
            order = tuple("replay" if operations["outputs"][letter][0]["fingerprint"]
                          == operations["record_fingerprint"] else "rescore" for letter in ("A", "B"))
            self.assertEqual(order, (key["operation_A"], key["operation_B"]))
            orders.add(order)
        self.assertEqual(orders, {("replay", "rescore"), ("rescore", "replay")})

    def test_objective_scores_never_grade_free_text_or_coerce_types(self):
        _, key = assessment.build(3)
        self.assertEqual(assessment.score(key, {})["objective_score"], 0)
        self.assertEqual(assessment.score(key, key | {"pair": str(key["pair"])})["objective_score"], 6)
        self.assertEqual(assessment.score(key, key | {"fault_1": key["fault_1"]["label"]})["objective_score"], 6)
        wrong_row = key["fault_1"] | {"seq": key["fault_2"]["seq"]}
        self.assertEqual(assessment.score(key, key | {"fault_1": wrong_row})["objective_score"], 6)
        self.assertEqual(assessment.score(key, key | {"fault_1": {"seq": key["fault_1"]["seq"],
                                                                  "label": ""}})["objective_score"], 6)
        self.assertEqual(assessment.score(key, key | {"explanation": "not a rubric verdict"})["objective_score"], 7)
        with self.assertRaises(ValueError):
            assessment.score(key, {"explanation": ["not text"]})

    def test_four_review_surface_heuristics_over_200_forms(self):
        hits = dict.fromkeys(("pair", "operation", "fault", "defer"), 0)
        deferrals = set()
        rejection_modes = set()
        perfect = 0
        for seed in range(1000, 1200):
            form, key = assessment.build(seed)
            items = form["items"]
            pair = items["pair"]
            retry_id = max(row["call_id"] for row in pair["requests"])
            guesses = {"pair": next(row["line"] for row in pair["choices"] if row["call_id"] == retry_id)}
            for letter, records in items["operations"]["outputs"].items():
                guesses[f"operation_{letter}"] = "replay" if "normalized_hash" in records[0] else "rescore"
            fault = items["faults"]
            for index, request in enumerate(fault["requests"], 1):
                # Give the old label-only rule the correct evidence line for free.
                row = next(row for row in fault["returns"] if row["call_id"] == request["call_id"])
                label = "주입된 일시 오류" if row.get("status") == "transient" else "원인 불명"
                guesses[f"fault_{index}"] = {"seq": row["seq"], "label": label}
            for letter, situation in items["deferral"]["situations"].items():
                negative = any(x < 0 for x in situation["points"])
                guesses[f"defer_{letter}"] = "불필요" if negative else "정당"
                deferrals.add((negative, key[f"defer_{letter}"]))
                if key[f"defer_{letter}"] == "불필요":
                    observation, = situation["observations"]
                    index = situation["points"].index(observation["input"])
                    matching_count = sum(row[index] == observation["return"]["value"]
                                         for row in situation["predictions"].values())
                    rejection_modes.add((negative, matching_count))
            report = assessment.score(key, guesses)
            perfect += report["objective_score"] == report["objective_max"]
            for item, point in report["points_by_item"].items():
                hits[item.split("_")[0]] += point
        print(f"200 seeded forms: surface hits {hits}; {sum(hits.values())}/1400; perfect={perfect}")
        self.assertEqual(deferrals, {(negative, label) for negative in (False, True)
                                     for label in ("정당", "불필요")})
        self.assertEqual(rejection_modes, {(negative, survivors) for negative in (False, True)
                                           for survivors in (1, 2)})
        self.assertEqual(perfect, 0)
        # Each pair of outcomes is balanced or pseudorandom, so a non-reasoning
        # rule should be near 50%. Allow 10 points of percentage headroom, but
        # don't let an easy item family be hidden by averaging across families.
        for family, limit in {"pair": 120, "operation": 240, "fault": 240, "defer": 240}.items():
            self.assertLessEqual(hits[family], limit, family)
        self.assertLessEqual(sum(hits.values()), 840)
