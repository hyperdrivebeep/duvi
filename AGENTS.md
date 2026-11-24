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
("이 강의 · 시간순") with a 지금 line and 전체/열린 질문/대본 filters, citation previews on time
chips inside AI answers, the learner's explanation written under its question and saved apart
from the AI answer, the question time captured when typing starts, and "보낼 자료" checks that
change what the server sends. (The library sidebar and on-demand panel of B+ were replaced by
shell A on 2026-11-24.)

## App shell A and automatic question records (2026-11-24)

On 2026-11-24 the user chose alternative A of docs/design/2026-11-24-app-redesign (branch
design/app-redesign) as the app structure, with alternative C's concept map + progress table as
the 개념 지도 screen. Keep a narrow rail (Duvi, 강의, 개념 지도, 확인 문제, 돌아보기, 설정) in the same
place on every screen, current item by neutral fill and weight. 내 강의 is a panel opened from the
lecture header's ☰ 내 강의 button. The lecture screen keeps the wide video, time strip and both
caption lines in the first viewport at 1280×800 and 1536×864, with a 372px side panel (380px in
fullscreen) whose tabs are 질문 / 개념 / 확인 문제 / 대본. `#view-map`, `#view-quiz`, `#view-review`,
`#lectureConcepts` and `#lectureQuiz` are the mount points for the concept map, quiz and evidence work.
Questions are recorded automatically when they are sent: the question becomes an open-question
learning record at the time typing started, the AI answer is attached when it completes, and the
기록 tab and the 기록으로 저장 button were removed. The full record editor opens from a question's
자세히. User decision (confirmed 2026-11-24): an automatically recorded question has no review date
until the learner writes their own explanation; the first explanation schedules the review the
same way the explanation-save path does (next day). Visual rules: no left accent bars, no nested
bordered boxes, no repeated coloured pills, accent only for the primary action, current position
and links, status by glyph and text, text at least 14px.
