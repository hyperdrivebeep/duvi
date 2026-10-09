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
