"""Local, single-writer JSONL journal of self-reported E01 sessions."""

from datetime import datetime
import json
from pathlib import Path
from uuid import uuid4

from .protocol import canonical


LOG_DIR = Path(__file__).parent / "log"
PHASES = ("pre", "setup", "implement", "replay", "diagnose", "mastery", "post", "retention")
HELP = ("none", "hint", "solution-peek", "AI-help")
OUTCOMES = ("pass", "fail", "error")


def configure(parser):
    sub = parser.add_subparsers(dest="log_action", required=True)
    start = sub.add_parser("start")
    start.add_argument("phase", choices=PHASES)
    stop = sub.add_parser("stop")
    stop.add_argument("--reason", choices=("done", "break", "interruption", "uncertain"), default="done")
    note = sub.add_parser("note")
    note.add_argument("--text", default="")
    note.add_argument("--help-level", choices=HELP)
    note.add_argument("--attempt")
    note.add_argument("--outcome", choices=OUTCOMES)
    summary = sub.add_parser("summary")
    for p in (start, stop, note, summary):
        p.add_argument("--synthetic", action="store_true", help="합성 전용 별도 저널")
        if p is not summary:
            p.add_argument("--at", help="합성 전용 ISO 8601 시각 (UTC 오프셋 필수)")


def parse_time(value):
    dt = datetime.fromisoformat(value)
    if dt.utcoffset() is None:
        raise ValueError("시각에 UTC 오프셋이 필요합니다.")
    return dt


def summarize(rows, synthetic):
    active = None
    seconds = {phase: 0.0 for phase in PHASES}
    help_notes = {label: 0 for label in HELP}
    outcomes = {outcome: 0 for outcome in OUTCOMES}
    sessions_by_help = {label: 0 for label in HELP}
    unknown_help = 0
    discarded = 0
    attempts = []
    attempt_ids = set()
    previous = None
    for row in rows:
        if row["version"] != 1 or row["source"] != ("synthetic" if synthetic else "self-report"):
            raise ValueError("저널 버전 또는 출처가 맞지 않습니다.")
        when = parse_time(row["timestamp"])
        if previous is not None and when < previous:
            raise ValueError("시각이 이전 기록보다 이릅니다. 시스템 시계를 확인하세요.")
        previous = when
        if row["event"] == "start":
            if active:
                raise ValueError("먼저 열린 세션을 stop 하세요.")
            active = row
            labels = set()
        elif active is None or row["session_id"] != active["session_id"] or row["phase"] != active["phase"]:
            raise ValueError("열린 세션이 없습니다. 먼저 start 하세요.")
        elif row["event"] == "note":
            label = row.get("help")
            if label is not None:
                help_notes[label] += 1
                labels.add(label)
            if "attempt" in row:
                if row["attempt"] in attempt_ids:
                    raise ValueError("시도 ID가 중복됩니다. 매 실행에 새 ID를 쓰세요.")
                attempt_ids.add(row["attempt"])
                outcomes[row["outcome"]] += 1
                attempts.append({key: row[key] for key in ("phase", "attempt", "outcome", "text")})
        elif row["event"] == "stop":
            if row["reason"] == "uncertain":
                discarded += 1
            else:
                seconds[row["phase"]] += (when - parse_time(active["timestamp"])).total_seconds()
            if labels - {"none"}:
                labels.discard("none")
            for label in labels:
                sessions_by_help[label] += 1
            unknown_help += not labels
            active = None
        else:
            raise ValueError("알 수 없는 이벤트")
    return {
        "source": "synthetic" if synthetic else "self-report",
        "active_minutes": {phase: round(value / 60, 3) for phase, value in seconds.items()},
        "help_notes": help_notes, "closed_sessions_by_help": sessions_by_help,
        "closed_sessions_unknown_help": unknown_help,
        "grader_outcomes": outcomes, "attempt_count": len(attempts), "attempts": attempts,
        "discarded_sessions": discarded, "open_session": active,
    }


def execute(args):
    path = LOG_DIR / ("sessions.synthetic.jsonl" if args.synthetic else "sessions.jsonl")
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()] if path.exists() else []
    current = summarize(rows, args.synthetic)
    if args.log_action == "summary":
        return current
    if args.at and not args.synthetic:
        raise ValueError("--at은 --synthetic에서만 사용할 수 있습니다.")
    timestamp = parse_time(args.at) if args.at else datetime.now().astimezone()
    row = {"version": 1, "source": current["source"], "event": args.log_action,
           "timestamp": timestamp.isoformat()}
    if args.log_action == "start":
        row.update(session_id=uuid4().hex, phase=args.phase)
    else:
        active = current["open_session"]
        if not active:
            raise ValueError("열린 세션이 없습니다. 먼저 start 하세요.")
        row.update(session_id=active["session_id"], phase=active["phase"])
        if args.log_action == "stop":
            row["reason"] = args.reason
        else:
            text = args.text.strip()
            if not (text or args.help_level or args.attempt or args.outcome):
                raise ValueError("메모 내용, 도움 수준 또는 채점 시도를 지정하세요.")
            if bool(args.attempt) != bool(args.outcome) or (args.attempt and not text):
                raise ValueError("채점 시도는 --attempt, --outcome, --text를 함께 지정하세요.")
            row["text"] = text
            if args.help_level:
                row["help"] = args.help_level
            if args.attempt:
                row.update(attempt=args.attempt, outcome=args.outcome)
    summarize(rows + [row], args.synthetic)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as file:
        file.write(canonical(row) + "\n")
    return row
