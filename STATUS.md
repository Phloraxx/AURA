# AURA Browser Status

**Branch:** `aura-browser`

**Current milestone:** W2 — Page Intelligence

**Planning state:** W0 accepted. Canonical product and architecture decisions are locked in `docs/browser/`.

**Implementation state:** W1 is complete. The development and packaged browser
have been verified on the event Mac. W2 has not started.

## W0 — accepted decisions

- Product has exactly three first-class experiences:
  - Learn Me
  - Make This Mine
  - Talk to AURA
- Make This Mine is the flagship and wins schedule conflicts.
- Judged platform is macOS on Apple Silicon (`darwin-arm64`).
- Electron/Chromium hosts the prototype; no browser-engine fork.
- One trusted React `BrowserWindow` is the shell.
- One remote `WebContentsView` renders arbitrary websites.
- Remote AURA runtime is a dedicated preload in an isolated world.
- Page Intelligence is runtime-first: ranked DOM/ARIA targets + geometry/styles + screenshot.
- CDP Accessibility is selective enrichment; DOMSnapshot is fallback/diagnostic rather than mandatory on every page.
- No first-N DOM truncation.
- OpenAI is called directly from Electron main during the event; no local Hono server is required in the judged path.
- Baseline model to measure first: `gpt-5.6-terra` with low reasoning on latency-sensitive calls, environment-configurable.
- AI uses three rich operations, not an agent swarm.
- Adaptation uses conservative reversible Tier 0–3 interventions; arbitrary large DOM reconstruction is not required.
- Original ↔ AURA is mandatory.
- Required persistent memory is profile + explicit learned global preferences; site memory is secondary.
- Talk to AURA optimizes four action families: Adjust, Explain, Goal/Guide, Remember.
- Text conversation is required; voice is stretch.
- `electron-vite` is the dev/build tool; Electron Forge is used only for final packaging.
- Real-site testing is a release gate.

## W1 — implemented and verified

- `apps/browser` Electron + React + TypeScript scaffold using
  `electron-vite`;
- one trusted local `BrowserWindow` shell and one remote
  `WebContentsView`;
- typed shell IPC for navigation, browser state, panel layout, and page-runtime
  events;
- isolated remote page preload reporting `preload-started` and `dom-ready` on
  each document;
- address/search normalization, back, forward, refresh, loading, title, and
  error states;
- collapsible AURA panel with stable PageView bounds;
- root launch/build/package scripts;
- Electron `43.2.0`, `electron-vite` `5.0.0`, and Forge `7.11.2` pinned;
- unit tests for URL normalization and PageView layout;
- repository lint, typecheck, tests, and build pass;
- Forge produces `apps/browser/out/AURA-darwin-arm64/AURA.app`;
- packaged executable inspected as Mach-O `arm64`, with the required main,
  preload, and renderer bundles present in `app.asar`.

## W1 — live acceptance verified

Verified on the Apple Silicon event Mac on 24 July 2026:

- `pnpm browser:dev` launches the Electron GUI from the repository root;
- the packaged arm64 `AURA.app` launches normally;
- Wikipedia, GitHub, eBay, and the Sahrdaya College site render in the remote
  `WebContentsView`;
- direct addresses and free-text search navigate through the shell;
- back, forward, and refresh work, with refresh recorded as a browser reload;
- the remote preload reports `dom-ready` after each tested navigation and
  reload;
- closing the AURA panel expands the page from 1080 px to 1440 px and reopening
  it restores the original bounds;
- resizing the window from 1440 × 920 to 1100 × 760 resizes both the trusted
  shell and remote PageView, and restoring the window restores both exactly;
- failed navigation displays a clear unavailable/error state instead of stale
  preload readiness, and a subsequent valid navigation recovers to
  `dom-ready`;
- repository lint, typecheck, all 69 unit/integration tests, full build, and
  `darwin-arm64` packaging pass.

No W2 implementation, AI, onboarding, or adaptation work has started.

## Source of truth

Read `docs/browser/README.md` first, then follow its reading order.
