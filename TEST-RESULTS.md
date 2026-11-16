# Verification — 2026-10-09

Preview: http://127.0.0.1:6103

## Duvi public repository preparation

- Exported only Git-indexed files into a separate clean directory; `npm ci`, `npm run setup -- --youtube`, and the production build succeeded.
- Setup fetched all 26 MIT caption files from their official sources and verified the pinned yt-dlp SHA-256. Imported YouTube lectures and personal translations were not copied.
- `npm test` now builds first; the clean copy passed all 21 tests. An initial run before building exposed the Sites artifact test's dependency on build output, which this ordering fixes.
- Checked the publication file list: no local caption data, generated translations, user library, logs, credentials, node_modules, or root build output. A basic credential-pattern check found no credentials; this is not a comprehensive security audit.
- Actual browser title/library heading show Duvi. The account storage location is preserved to avoid disconnecting existing accounts when changing the display name.

## Build and automated checks

- Vite production build passed; scripts/prepare-sites-build.mjs completed. No deployment performed.
- node --test backend/tests/ai.test.mjs tests/media.test.mjs: 17 passed, 0 failed.
- Includes existing auth/PKCE, cache/resume, translation errors, DPAPI, URL/caption parsing, HTTP origin/CSRF/private-file protection and a new cold YouTube resume regression.
- Final Chrome error-log inspection returned no captured errors.

## Browser checks

- Actual 29-lecture library; search, no results, selection across MIT/CS50/3Blue1Brown.
- Invalid import URL displays error and retains input; existing YouTube URL opens its lecture. Import during CS50 search clears the filter and closes the dialog.
- Settings/mobile library dialogs: Escape, focus return, library-to-import transition.
- Actual Chrome YouTube and native MIT playback; English/cached Korean synchronization, cue selection and next sentence.
- Native playback: repeat loop, automatic pause at cue end, 1.25× speed and reset to 1×.
- Resume at 01:15 retained across reload; initial loading no longer overwrites the stored position.
- User-entered native fullscreen: two distinct cue measurements with unchanged video/caption heights; exit button visible and functional.
- Concept 1 desktop visual comparison; final 320/375px checks without horizontal overflow; earlier 768/1280px breakpoints and 640px reflow.

## Limits

- Separate preview uses copied public lecture data and saved translations. Original project/account vault were not modified. New AI translation requires account connection here; no fresh AI request or login was performed.
- New remote import covered by parser/backend fixtures, not a new live browser import. Live import used an existing lecture.
- Translator model download, actual 200% zoom, YouTube fullscreen, full accessibility audit and cross-browser compatibility remain unverified.
- Transcript manual-follow behavior is implemented but was not separately exercised in a dedicated browser test.
- Convenience launchers were created but not executed because the server was already running.

Local-only evidence (excluded from Git): design-qa.md; qa/desktop-final.png; qa/mobile-final.png; qa/mobile-320-final.png; qa/fullscreen-measurements.json; qa/duvi-brand.png.
# Folder and playlist update · 2026-11-16

- Production build succeeds. Node suites: 34 tests passed (existing authentication,
  translation, media, Sites packaging plus 13 folder/playlist/UI regression tests).
- New coverage: default MIT folder migration; concurrent folder writes; rename,
  move and delete preserving lectures; restart persistence; restricted playlist URL
  validation; ordered import and duplicate reuse; invalid/empty/oversized playlists;
  caption failure and SRT recovery; concurrent caption requests; zero-caption
  translation rejection; session/origin/CSRF protection for the new API routes;
  overlapping playlist order; conflicting caption uploads; stale refresh selection.
- In an isolated local library, the real public **Neural Networks: Zero to Hero**
  playlist imported 10 videos in source order. Reimport reused all 10. No video
  files were downloaded. Its first video's automatic caption extraction failed in
  this environment; the UI retained the lecture, and uploading an SRT restored
  captions. Availability of automatic YouTube captions remains source-dependent.
- Chrome UI checks covered folder create/rename/move/delete, reload persistence,
  empty folders and search, import error feedback, closing/reopening an active
  import, successful reimport, subtitle-file recovery, and existing MIT playback.
- Captured 12 relevant player/library/dialog states at 375, 768 and 1280px:
  36 screenshots, no document/dialog horizontal overflow, no JavaScript page errors.
  Test fixtures and browser evidence are outside the repository in the chat's work/.
# Sentence alignment verification — 2026-11-16

- `npm test`: 40 tests passed, including cross-cue sentence boundaries, overlap
  stitching, checkpoint resume, invalid-response rejection, preserving the old
  cache on failure, atomic paired-cache publication and original-cache backup.
- Reproduced the old splitter cutting `with / respect to` at its 15-second limit.
- Real Karpathy micrograd lecture: 24,341 original words preserved in order,
  1,035 English/Korean pairs, original 653 translations backed up. Original
  lecture/caption file unchanged. New timings are estimated from source cues.
- Real Chrome at 1366x900 and 768x900, live localhost API (no response fixture):
  reproduced the user's 65-second passage, verified matching bilingual text,
  next/previous/repeat, no JavaScript errors or horizontal caption overflow.
- Existing server and user browser sessions were preserved. The active server
  already serves the corrected cache and rebuilt client; the new full-lecture
  alignment API branch loads on the next normal server start.

# Compact study view — 2026-11-16

- Default focus layout keeps captions below the video; optional top/bottom overlay
  and transcript sidebar reuse the existing media and aligned caption nodes.
- Chrome live API: 1,035 aligned pairs loaded, playback continues across placement
  and transcript toggles. Controls hide after inactivity; settings restore them.
- Checked 1536x674 desktop and 375x812 mobile; no horizontal stage overflow.
  Mobile transcript is a lower drawer. 30px captions remain scrollable; returning
  to normal view restores the opener and clears temporary inert attributes.
- Source review caught and fixed transcript header overlap, normal toolbar wrapping,
  and keyboard focus leaking behind the fallback fullscreen player.
- Screenshots: ../outputs/duvi-study-{dock,sidebar,mobile,overlay-top,overlay-bottom}.jpg.
- The current server serves the rebuilt client and aligned cache. A server restart
  to load the new full-lecture alignment route was rejected by automatic approval
  review, so that route remains pending the next normal server start.
- Final build and all 40 tests pass. Independent implementation and visual/CJK
  reviews passed after fixing Korean transcript word wrapping (keep-all).

# Caption spacing follow-up — 2026-11-16

- Reproduced the reported 10:55 sentence. Previous language gap was 4px.
- Increased gap to 12px (10px on short viewports); replaced viewport-height
  clipping with two complete lines per language. Longer text remains scrollable.
- Chrome measured 66px rows / 33px line-height at 22px, and 90px / 45px at 30px.
  At 375x812 both language rows remain 66px apart from the 12px gutter.
- Production build passed; no translation data or playback code changed.
