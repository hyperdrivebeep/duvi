# Duvi design system

## 1. Direction
Extend the existing quiet blue/white lecture player. Preserve the wide video and
separate English/Korean caption regions. The sidebar is a personal course library:
collapsible folders contain ordered lectures, like projects containing chats.
The supplied screenshots describe the existing product and playlist use case, not
a pixel-identical redesign target. Keep the existing vanilla JavaScript primitives.

## 2. Color
Existing tokens: blue `#1769e8`, muted text `#617088`, border `#e5eaf1`, soft surface
`#f2f5fa`. Sidebar `#f8fafd`, selected row `#eaf2ff`, text `#111a2d`, focus `#75a6f0`.
New semantic aliases reuse these colors: `--library-surface`, `--selected`,
`--ink`, `--focus`. Error text uses existing notice color `#8b3d24`.

## 3. Typography
Noto Sans KR Variable with Arial/sans-serif fallback. Existing page title scale
20–31px, dialogs 21–24px. Folder names and row titles 14px/1.4, secondary text
12px/1.5, tiny row numbers 11px. Korean action labels keep words together; long
lecture/folder titles ellipsize in the sidebar and remain accessible via title.

## 4. Spacing and layout
Use spacing tokens 4, 8, 12, 16, 20, 24px. Sidebar width and 960px mobile drawer
breakpoint are inherited. Sidebar list owns vertical scrolling with min-height:0.
Folder headers and actions have 44px touch targets. Nested lectures use a small
thumbnail (72px desktop; 64px compact), ordinal and two-line title.

## 5. Reusable primitives
- Existing button, primary button, icon button, field, dialog, notice primitives.
- Folder section: disclosure button with chevron, folder icon, count, and separate
  manage button; collapsed/expanded/search-expanded/empty states.
- Lecture row: ordinal, optional thumbnail, title, caption state, separate move
  action; active/hover/focus/missing-thumbnail states.
- Add dialog: explicit video/playlist mode, URL, target folder, optional subtitle;
  idle/busy/error/completed states. Completion remains visible, with an open action.
- Folder dialog: create/rename/delete. Deleting a folder keeps its lectures.
- Move dialog: source name and destination selector, cancel/save/error states.
- Caption notice: loading/failed/unavailable, retry and subtitle-file actions.
These primitives are exercised by the browser QA harness before final delivery.

## 6. Motion and interaction
No decorative animation. Existing button press movement and hover colors remain.
Folder toggles update immediately. Close dialogs with Escape, restore focus, and
announce import outcomes via role=status. Buttons use explicit accessible labels.
Import continues if its dialog is closed; reopening shows the current result.

## 7. Depth
Keep the existing modal backdrop and shadow; sidebar uses borders, indentation and
selected surface color instead of extra cards or shadows.

## 8. Accessibility and constraints
Keyboard accessible native buttons/selects/dialogs, visible focus, 44px actions,
aria-expanded on disclosures, descriptive labels for folder and lecture controls.
At 375/768px the library remains a drawer; at 1280px it is a fixed sidebar. Empty
folders, failed imports, long titles and zero-caption lectures must remain usable.
Fullscreen learning keeps the existing media mounted. The default is a compact,
separate caption dock below the video, with adjacent English/Korean sentence pairs.
An optional overlay mode maximizes video, with captions at top or bottom. Full
transcripts open in a 320px right panel (a lower drawer on narrow screens), with
current-cue follow and seeking. No sentence pair is independently truncated or
retranslated for presentation. Long text remains scrollable and the complete
sentence is available in the transcript. Use dark surfaces (#090b10, #141922),
white Korean and soft-white English, with 18/22/26/30px sizes. Dock padding is
8px 20px, no labels or separator, and a 12px gap between languages. Each language
shows at most two complete lines (scrollable) so height limits never cut a resting
line in half. Short viewports retain a 10px language gap.
Transport/settings float above the video, auto-hide after inactivity, and remain
visible during keyboard focus. A small persistent settings handle restores them.
Fullscreen has a window-filling fallback when the browser denies native fullscreen.
Escape or exit restores normal layout and opener focus. No media reload or animation.

## 9. Learning implementation contract (2026-11-16)
Preserve the selected design; this is an extension, not a new concept. Task-first
implementation-and-validation and omo frontend design/perfection references were
read. The live entry remains vanilla `src/app.mjs`; no React rewrite or new tooling.

| User task | Reference / principle | Implementation |
| --- | --- | --- |
| Start the correct lesson | LEARNING_DESIGN + versioned discovery roadmap | Sidebar 학습 로드맵; 오늘 시작하기 prioritizes MIT 1; server roadmap preserves phase/resource order |
| Watch → remember a question | Existing optional transcript pane; progressive disclosure | One 대본/질문/학습 pane inside the unchanged stage; anchored question-only save; evidence fields optional |
| Explain and revise | LEARNING_DESIGN source snapshots / first-person ownership | Snapshot, original explanation and edit/review history; source change prevents silent relinking |
| Resume and review | Explicit self-assessment, not watch-time mastery | Manual five-state progress; due reviews and 1/3/7-day reflection |
| Keep and move work | Versioned backup, visible boundaries | Markdown preview/download; backup preview and explicit conflict choice before import |

Learning primitives: ordered phase disclosure, resource row with source/open/status,
first-action card, labeled textarea, anchored editor, saved-record card, review form,
status notice, tab group, plain-text Markdown preview and import summary. States:
loading/empty/ready/busy/error/conflict/stale anchor. All use existing palette,
4px spacing, 14px body and 12px metadata; section titles use existing 17/24px.
Additional geometry tokens: learning dialog max width 1040px, reader max width
760px, panel max-height 70dvh, text entry min-height 96px, border radius 8px.
No decorative animation, generated imagery, fake counts or automatic mastery.

Roadmap dialog owns its scrolling. Stage panel owns its reading scroll; switching
tabs touches only panel children. At 375/768px forms use a single column and actions
wrap; at 1280px roadmap resource actions sit next to the title. Native buttons,
disclosures and selects retain existing 40–44px targets, visible focus, Escape dialog close and
focus restoration. AI requests show exact submitted context and require an explicit
send; notes do not require authentication. Import preview never executes content.

Verification scope: pure contract tests plus browser scenarios where a built server
is available. Human learning, real-provider answer quality, operating-system file
opening and publication are not inferred from UI tests. Backend atomic backup and
curriculum source accuracy have separate automated coverage. Independent visual
review and production Lighthouse measurements must be reported separately from
frontend implementation; absence of either is not a passing score.

## 10. Reference-to-change evidence ledger

Evidence update: 2026-11-17. Browser outcomes below were observed in Chrome QA
on the isolated 6110 fixture; installation was checked on the live 6103 app.
Artifact filenames below refer to the local work folder
`../learning-evidence/`. Screenshots and logs are not committed to this public
repository and are not available through GitHub-relative links. Only official
source URLs are clickable; local artifacts are listed as inline filenames.
The active 6103 server has 57 lectures,
10 folders and 0 learner records. The fixture's 2 QA records are not live learner
data. Live entry evidence is `user-before-entry.jpg`
and `user-after-entry.jpg`, both 1536×674.
The revised roadmap's persona captures are available. Independent
review verdicts are bounded to the inspected states, as detailed below.

The baseline is the actual MIT 1 lecture at 100% Chrome
zoom, `before-lecture1.jpg` (1521×722), plus the existing
fullscreen caption dock in `before-fullscreen.jpg` (1536×730).
There was no roadmap/question/notes entry in that baseline. These are observations
of Duvi; the official sources below were reviewed as documentation, not product
flows tested interactively. No Mobbin or other private-product observation is
claimed. Preserve the existing selected layout, media, captions, credentials and
library. New widgets follow the existing design; no decorative redesign.

| Reference ID | Official source | Applied principle | Not claimed / not adopted |
| --- | --- | --- | --- |
| R01 | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | Single selected tab; tab/tabpanel relationships; roving tabindex; Left/Right/Home/End | Does not by itself prove a screen-reader or keyboard browser test passed |
| R02 | https://design-system.service.gov.uk/components/details/ | Optional advanced evidence/assumption fields use native details disclosure | No mandatory full research form to save a question |
| R03 | https://design-system.service.gov.uk/components/task-list/ | Ordered resource rows expose a named action and explicit state | No mandatory linear completion, numeric mastery or watch-time-derived understanding |

| CHANGE-ID / references | Actual file / component | Before artifact / behavior | After artifact / verification status | Expected learner task |
| --- | --- | --- | --- | --- |
| C01 / R03 | `index.html`, `learning-ui.mjs`, `learning-map-view.mjs`: sidebar/mobile entry, start card, ordered phases | `before-lecture1.jpg`; no roadmap entry | Current roadmap captures: `user-roadmap-final.jpg`, `persona-roadmap-768.jpg`, `persona-roadmap-375.jpg`; these replace the earlier roadmap captures. Live 6103 entry captured above; Pass B passed the inspected replacement states, with Pass A independently verified the final entry and roadmap follow-up | Find 학습 로드맵 → MIT 1강 시작하기, then MIT 2 → 3 and later ordered phases; manually record activity |
| C02 / R01 | `study-view.mjs`, `index.html`, `learning.css`: one stage panel | `before-lecture1.jpg` and `before-fullscreen.jpg`; transcript only | Chrome QA succeeded: fullscreen tabs preserved video/time; ArrowRight keyboard interaction and transcript seek to 23.17 seconds. `final-fullscreen-transcript.jpg`, `final-fullscreen-question.jpg`, `final-fullscreen-learning.jpg` | Switch 대본/질문/학습 without losing playback or bilingual captions |
| C03 / R02 | `learning-editor.mjs`, `learning-model.mjs`: question + optional evidence | `before-lecture1.jpg`; no anchored note support | Chrome QA succeeded: question/explanation and all six optional scientific fields saved; original explanation retained in history. `qa-evidence-fields.jpg`, `qa-question-example.jpg`, `qa-history-example.jpg` use QA-labeled synthetic data only. `final-mobile-question-fields.jpg` and `final-mobile-save-controls.jpg` replace the offscreen 375px question capture | Save a question immediately, then deepen explanation and compare revisions |
| C04 / R03 | `learning-records-view.mjs`: records and due-review forms | `before-lecture1.jpg`; no review entry | Chrome QA succeeded: review saved with the three-day default. `final-review.jpg`, `final-records-768.jpg`, `final-review-empty-768.jpg` | Recall before revealing prior explanation; choose next 1/3/7-day review |
| C05 / R02 | `learning-editor.mjs`: tutor preview and Markdown | `before-lecture1.jpg`; no learning export/tutor | Chrome QA succeeded: exact tutor context preview, unauthenticated error, writing retained. `final-ai-noauth-visible.jpg` replaces the earlier capture and actually shows the error. Markdown escaping has automated coverage; no live-provider quality claim | Inspect exact saved learner/source fields before AI request; retain writing on failure |
| C06 / R02 | `learning-backup-ui.mjs`: download/import preview/conflict policy | `before-lecture1.jpg`; no learning backup UI | Chrome QA succeeded: 4.2 MB backup downloaded with 57 lectures, 2 QA records and 10 folders; merge/replace import and reload restored position to 120 seconds. `final-backup-768.jpg`, `final-backup-preview.jpg`, `final-backup-restored.jpg` | Move records/library/translations/settings while keeping credentials out |
| C07 / R02, R03 | `learning-map-view.mjs`: today's task, optional purpose disclosure, first-two-week placement | `user-roadmap-before-persona.jpg`; persona QA found first-two-week practice below the long resource list | Hero asks for `print(2 + 3)` and prediction before execution; optional “왜 이 순서로 배우나요? · Glorious Purpose” explains the BHAG, scientific evidence loop and eight-phase overview; collapsed first-two-week practice precedes phases. Current captures: `user-roadmap-final.jpg`, `user-purpose.jpg`, `persona-roadmap-375.jpg`, `persona-roadmap-768.jpg`. Complete suite: 95 passed; Pass B passed the inspected captures/source; Pass A independently verified the final entry and roadmap follow-up | Identify one concrete task today, predict before running, and optionally understand how the curriculum supports the larger purpose |

### Current automated evidence

`npm test` ran after the persona-driven roadmap revision:
**95 passed, 0 failed**, recorded in `tests-final.log`.
This supersedes earlier checkpoints and includes clearing stale notices on view changes.
Automated contracts, fixture browser QA
and live installation evidence have distinct scopes; none establishes human learning.

### Consolidated regression fixes

| Review finding | Concrete change | Regression evidence |
| --- | --- | --- |
| Tutor preview could use restored draft while backend sent different saved text | `learning-tutor-context.mjs` compares a separate saved record, text/anchor/help and record revision; request carries recordRevision; editor freezes human-readable context | Dirty restored draft rejected, stale version rejected, context copied, payload version asserted; Chrome confirmed exact preview and retained writing after no-auth error |
| Unchanged cached record could silently overwrite newer server content | Editor stashes only dirty forms and keeps baseRevision; stale draft shows conflict; latest comparison and explicit reconciliation precede retry; save sends top-level recordRevision | Fresh server edit wins over unchanged form; dirty draft retains old version and cannot write; controller keeps per-record revision even with newer global state |
| Restored positions overwritten by stale app map/unload | `learning-playback-state.mjs` synchronizes the shared map; periodic/unload writes blocked for current media until intentional playback/seek or reopen | Imported current and other positions survive repeated saves; merge preserves local conflicts and adds missing lectures; Chrome confirmed merge/replace import and reload at 120 seconds |
| Review selection ignored existing dates / scheduled unscheduled records | Explicit keep/1/3/7/none; saved records open with keep | None stays null; seven-day selection replaces old date; Chrome confirmed saving the three-day review default |
| Empty option values broke review and backup | `learning-dom.mjs` uses first real option unless explicitly provided | Default help=none, backup mode=merge, explicit help=full; Chrome exercised review and import defaults |
| Continue failed on external exercises | `learning-map-view.mjs` uses native external anchor for resources without lectureId | External continuation creates target=_blank anchor, never invokes lecture loading |
| Raw history / mobile orphan labels | Human-readable dated history, source-time actions, plain-language anchor label; no-wrap minimum-width question/close buttons and wrapping toolbar | `qa-history-example.jpg` confirms retained original with QA-labeled synthetic data; `final-mobile-question-fields.jpg` and `final-mobile-save-controls.jpg` show the fields and save controls. Pass B inspected the replacement captures and reports the previous capture blockers resolved |
| Stale notice after changing views | Clear the previous view notice when selecting another learning view | Complete npm suite passed 95 tests after this fix; no pixel-improvement claim |
| First-two-week practice buried below the long resource list | C07 adds a concrete prediction-before-run task in the hero, optional purpose/evidence-loop/eight-phase context, and collapsed practice before the phase list | Current source confirms order and disclosure; complete suite repassed in `tests-final.log`; Pass B passed the inspected roadmap states/source; Pass A follow-up passed |

The six optional scientific fields are observation, assumptions, alternative,
prediction, result and revision note. Chrome QA validated saving them and retaining
the original explanation using explicitly QA-labeled synthetic examples in
`qa-evidence-fields.jpg`, `qa-question-example.jpg` and `qa-history-example.jpg`.
These examples demonstrate storage and history behavior, not real learner answers,
measured scientific results or evidence of learning effectiveness.

Frontend scope implemented: versioned server roadmap rendering; MIT 1 entry and
continuation; explicit five-state progress; canonical first-two-week fallback
sessions; anchored notes, local drafts, original/history inspection, optional
hypothesis/test fields; due reviews; source validation before seek; Markdown;
explicit saved-context tutor requests; versioned backup wrapper with strict local
storage allowlist and conflict choices. The wrapper includes server backup plus
browser positions/caption preferences/Chrome caption caches. Server backup excludes
credentials; frontend never serializes account/model/token keys. Unsaved local
drafts are deliberately described as remaining in this browser.

Both backend update and tutor routes require recordRevision. Tutorial-provider
input uses validated saved text; local fake-provider tests and the observed no-auth
error do not establish successful live-provider integration or answer quality.

### Remaining acceptance and evidence limits

Final status: installed on live 6103, complete automated suite passing, updated
persona and visible-field/error captures available. The
limited independent review outcomes are:

| Review | Reported verdict | Scope and remaining work |
| --- | --- | --- |
| Pass A | Bounded PASS; medium confidence; no blockers | Independently opened the four new entry/roadmap images and inspected the onramp source in a final follow-up; persona-presentation finding resolved |
| Pass B | PASS; high confidence in inspected states | Independently opened all 12 new/replacement captures and inspected the changed roadmap source; previous capture blockers resolved |

Pass A also noted that inherited disclosure targets are 40px; section 9 now
records the existing 40–44px range. Neither review establishes all-size or
accessibility conformance, human usability, discoverability or learning effectiveness.

Current evidence sequence: `user-before-entry.jpg` / `user-after-entry.jpg` →
`user-roadmap-final.jpg` / `user-purpose.jpg` / `persona-roadmap-375.jpg` /
`persona-roadmap-768.jpg` → the mobile fields/save controls and synthetic QA
question/evidence/history captures → review → backup. The same-size live entry
pair documents installation. The review verdicts apply only to inspected evidence;
capture availability and functional checks do not establish human discoverability.

The native evidence is JPEG. The pixel-diff CLI rejected these inputs because it
accepts PNG only; no successful pixel comparison, numeric visual score or measured
pixel improvement is claimed. The captures remain visual evidence for review.

Not established: human UX outcomes or task times, learning effectiveness or mastery,
live-provider answer quality, real screen-reader results, Lighthouse measurements,
all-size visual approval, OS local-file execution or external publishing. The
reported ArrowRight check does not establish every keyboard or accessibility path.
