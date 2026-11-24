# Prototype Instructions

User selected the first displayed design on 2026-10-09: ../study-ui-research/concept-1.png. Preserve its left lecture library, wide video, separate English/Korean caption regions, and quiet blue/white styling. This is a general lecture app, not an MIT-only product. Keep all implementation, copied data, and tests here; do not modify ../mit-dual-player or its running server/account vault. Use the existing vanilla JavaScript media and translation behavior; Vite only bundles this frontend. Real media and thumbnails take precedence over generated mock content.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Lecture organization

On 2026-11-16 the user requested project-like lecture folders and importing an entire
YouTube playlist into a folder in its original order. Preserve the existing player
and bilingual captions. Keep folders and imported lectures on this PC, retain
lecture data when a folder is deleted, and show caption failures without dropping
videos from a playlist. See DESIGN.md for sidebar and dialog primitives.

## Product identity

The user also requested matching English/Korean sentence boundaries on 2026-11-16.
Keep aligned English cues and Korean translations in the same atomic cache, keep
source caption data intact, and never reuse index-keyed translations after changing
sentence boundaries. Sentence navigation and repeat must use the displayed units.

On 2026-11-16 the user selected compact subtitles outside the video as the default
fullscreen layout, after research of YouTube and bilingual players. Keep the full
transcript in an optional right panel, auto-hide controls, offer an overlay option,
and do not insist on a fixed subtitle position. Preserve aligned sentence pairs
and the playing media when toggling layouts.

The user selected **Duvi (듀비)** on 2026-10-09 and authorized publishing this app in a public GitHub repository. Use Duvi for the product name and 내 강의 for its lecture library. Keep credentials, imported lecture data, generated translations, logs, and local build artifacts out of Git. Redacted QA evidence may be committed under docs/qa-evidence (user decision 2026-11-19); personal data, credentials, lecture/translation data and raw logs stay out. Preserve the existing local vault path so branding changes do not disconnect accounts.

## Learning and discovery direction

The learning product direction and implementation boundaries are documented in docs/LEARNING_DESIGN.md. The local roadmap, timestamped records, revision history, review scheduling, Markdown export, and backup/restore now have source implementations. Distinguish source implementation, automated checks, and observed browser/live-service behavior; never report one as proof of another.

The first action is **학습 로드맵 → MIT 1강 시작하기**, then MIT Python Lecture 2 and 3 in order. Keep the canonical roadmap URL and commit in src/learning-roadmap.mjs; do not silently create a competing schedule. Curriculum preparation follows setup, reuses existing lectures, and must not imply captions are downloaded or learning is complete.

Help the learner distinguish observations, selection, variables and assumptions; compare alternatives; propose discriminating tests; and record changed explanations. A question or first-person explanation is enough to start; evidence/assumption/experiment fields remain optional. Preserve the original explanation, revision history, help level and review history. AI assistance is optional, explicitly requested, source-grounded, and labeled as a suggestion. Watch time, self-marked progress and AI approval never certify mastery. Keep the wide video, aligned bilingual captions, and stable media instance.

Keep backend/learning/, local lecture/translation data, browser drafts and downloaded backups private and out of Git. Code distribution and personal-data backup are separate operations. Restore requires a validated preview and explicit conflict policy; credentials are excluded. Do not publish notes, run learner code, or push to external repositories as an automatic learning action.

## Task-first frontend evidence

On 2026-11-17 the user requested visible lecture completion, phase progress and
the next task at a glance. Keep Duvi lecture-first: external documents are linked
reading/practice tasks, not an embedded document manager. Explicit completion is
reversible and separate from activity status, playback position and mastery.
Never show reading-only curriculum phases as empty folders asking for videos.

The user prefers a working, understandable task flow in the frontend and evidence from that flow. Start with the learner's first click and resulting action, not an API inventory or implementation explanation. For feature work, verify the actual UI at normal scale and a small viewport, including playback/caption continuity; document what was exercised and what remains unverified. Automated tests and source review supplement that evidence, but do not replace a browser observation or establish that the learner understood a lesson. Respect an explicitly limited documentation/integration assignment rather than changing another agent's UI or starting a server outside its scope.

## Fullscreen and desktop scope

On 2026-11-18 the user said the lecture fullscreen is the core screen ("거기가 핵심임")
and limited this round to desktop (no phone design or QA). Verify feature work in
fullscreen at 1280 and 1536 px: video and both caption regions without clipping or
overlap, question entry beside the video with auto-pause, transcript seek, keyboard
navigation, and time/draft kept across exit and re-entry. A YouTube iframe swallows
pointer moves, so hidden fullscreen controls must stay reachable without them.

On 2026-11-18 the user asked for real-time answers while watching, "like using GPT
as a side chat", instead of a question that is only saved. Keep the 질문하기 chat
beside the video (normal and fullscreen) streaming answers through the learner's own
ChatGPT connection, with conversations kept per lecture in local learning state.
The answer is labelled as an AI suggestion (AI 제안). Since 2026-11-24 a question is
recorded automatically when it is sent (see below). `DUVI_CHAT_MOCK=1` is a QA-only
stand-in and must never be enabled by default or reported as real answer quality.

On 2026-11-21 the user approved the B+ learning-screen direction ("좋다 duvi는 구현하거라";
docs/design/2026-11-19-notebook-ui, section B+). Keep the wide video and two caption lines,
Duvi's time strip under the player with question markers (filled = my explanation, hollow =
open question; a marker seeks and pauses), the 질문하기 panel as one lecture-time-ordered stream
("이 강의 · 시간순") with a 지금 line and 전체/열린 질문 filters (대본 is the panel's own tab since
2026-11-24), citation previews on time chips inside AI answers, the learner's explanation written under
its question and saved apart from the AI answer, the question time captured when typing starts, and
"보낼 자료" checks that change what the server sends. (The library sidebar and on-demand panel of B+ were replaced by
shell A on 2026-11-24.)

## App shell A and automatic question records (2026-11-24)

On 2026-11-24 the user chose alternative A of docs/design/2026-11-24-app-redesign (branch
design/app-redesign) as the app structure, with alternative C's concept map + progress table as
the 개념 지도 screen. Keep a narrow rail (Duvi, 강의, 개념 지도, 확인 문제, 돌아보기, 설정) in the same
place on every screen, current item by neutral fill and weight. 내 강의 is a panel opened from the
lecture header's ☰ 내 강의 button. The lecture screen keeps the wide video, time strip and both
caption lines in the first viewport at 1280×800 and 1536×864, with a 372px side panel (380px in
fullscreen) whose tabs are 질문 / 개념 / 확인 문제 / 대본, with counts when known (질문 n, 확인 문제 n).
`#view-quiz`, `#view-review` and `#lectureQuiz` show the check-question and review modules (below);
`#view-map` shows the concept map (graph by default, progress table as the accessible equivalent) with real
records, quiz attempts and repository evidence or "아직 증거 없음", and `#lectureConcepts` lists the lecture's
concepts, each opening the map at that concept. Edges between fields stay faint until an end is selected; never
invent or drop an edge. The lecture screen does not scroll
at 1280×800 or 1536×864: the sentence toolbar is one row (이전 · 다시 · 다음, 질문하기, ⚙ speed, ⛶), and
speed, auto pause and fullscreen caption place/size live in the ⚙ popover. Fullscreen top controls are one
row (이전 · 다시 · 다음, 질문하기, 대본, ⚙, 나가기) and 강의 완료로 표시 is in fullscreen's ⚙. Under the question
composer keep only the auto-record line and a closed "⋯ 보낼 설정" disclosure whose summary states what is
sent (model, 보낼 때 멈추기, 새 대화 and the 보낼 자료 checks are inside it). DESIGN.md §13–15.
Questions are recorded automatically when they are sent: the question becomes an open-question
learning record at the time typing started, the AI answer is attached when it completes, and the
기록 tab and the 기록으로 저장 button were removed. The full record editor opens from a question's
자세히. User decision (confirmed 2026-11-24): an automatically recorded question has no review date
until the learner writes their own explanation; the first explanation schedules the review the
same way the explanation-save path does (next day). Visual rules: no left accent bars, no nested
bordered boxes, no repeated coloured pills, accent only for the primary action, current position
and links, status by glyph and text, text at least 14px.


## Check questions and review evidence

On 2026-11-24 the user chose the redesign and answered its defaults: check questions (확인 문제) are
generated only on an explicit, previewed request through the learner's ChatGPT connection, and each answer
carries its evidence: real output of the question's fixed code, a verbatim quote, the learner's own
confirmation, or "AI 제안 · 정답 미검증". Only fixed problem code runs, once at generation, in Pyodide inside a
separate Node process started with `--permission`, read access to the Pyodide package only (no write, child-process,
worker, addon, WASI or inspector grant), `--disallow-code-generation-from-strings`, `--no-experimental-sqlite` and
`--no-addons`, killed on timeout or cancel (cancel saves nothing). Treat that code as untrusted (its prompt includes
third-party captions) and assume it can reach JavaScript in that process: the Python layer (blocked imports, removed
os/posix calls, emptied Pyodide modules) is bypassable. On Node 24.19 the permission model does not cover file writes by
node:sqlite (measured), so that module is disabled by flag. After Pyodide loads, a lockdown leaves only an allowlist of
built-ins (no file, socket, process or debugger access) and of process functions; every other built-in throws and is
frozen, and no module can be loaded any more. The network and process signals are closed by that lockdown, not by the
OS. Problem code that names interpreter internals (gc, importlib, meta_path, pyodide, js, ctypes, ...) is not run and
stays "AI 제안 · 정답 미검증"; that is an evidence-quality check, not a boundary. If the isolated process cannot run, the answer stays "AI 제안 · 정답 미검증" and nothing runs unisolated.
The guarantees are only what backend/tests/learning-quiz.test.mjs checks (docs/LEARNING_DESIGN.md, 실행 경계);
learner-written code or answers are never run. The learner's
repositories (default from `DUVI_EVIDENCE_REPOS` or the local, gitignored `backend/learning/sources.json`,
e.g. a glorious-purpose clone; never a hard-coded path) are read-only: Duvi reads files, `git log` and test
result files and never runs, writes or pushes there. 돌아보기 keeps self-marks apart from evidence and shows
"아직 증거 없음" instead of a zero. Links from these screens open the existing places (lecture at a time,
the roadmap dialog's tabs, 설정's read-only repository list) and never rebuild the lecture stage, so
media, time and drafts survive. Details: docs/LEARNING_DESIGN.md.
