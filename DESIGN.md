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
