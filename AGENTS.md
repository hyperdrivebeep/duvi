# Prototype Instructions

User selected the first displayed design on 2026-10-09: ../study-ui-research/concept-1.png. Preserve its left lecture library, wide video, separate English/Korean caption regions, and quiet blue/white styling. This is a general lecture app, not an MIT-only product. Keep all implementation, copied data, and tests here; do not modify ../mit-dual-player or its running server/account vault. Use the existing vanilla JavaScript media and translation behavior; Vite only bundles this frontend. Real media and thumbnails take precedence over generated mock content.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Product identity

The user selected **Duvi (듀비)** on 2026-10-09 and authorized publishing this app in a public GitHub repository. Use Duvi for the product name and 내 강의 for its lecture library. Keep credentials, imported lecture data, generated translations, logs, and local build artifacts out of Git. Preserve the existing local vault path so branding changes do not disconnect accounts.
