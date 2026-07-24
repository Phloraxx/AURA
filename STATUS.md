# AURA Browser Status

**Branch:** `aura-browser`

**Current milestone:** W1 — Browser shell verification

**Planning state:** W0 accepted. Canonical product and architecture decisions are locked in `docs/browser/`.

**Implementation state:** W1 is scaffolded and passes automated build/quality
checks. Live GUI and real-site acceptance still require verification from a
normal interactive macOS terminal session.

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

## W1 — acceptance still pending

Run from a normal interactive terminal on the event Mac:

```bash
pnpm browser:dev
```

Then verify:

- the Electron GUI launches in the user's interactive macOS session;
- Wikipedia, GitHub, one e-commerce page, and the college site render;
- address, back, forward, and refresh work against those sites;
- panel and window resizing remain visually stable;
- the panel reports the page preload as ready after each navigation/reload;
- the packaged `.app` launches on the event Mac.

The Codex shell can compile and package native macOS output, but its
non-interactive process context aborts at AppKit application registration.
Therefore, live GUI/site checks are intentionally not marked verified here.

No W2 Page Intelligence, AI, onboarding, or adaptation work has started. Do not
start W2 until the live checks above pass.

## Source of truth

Read `docs/browser/README.md` first, then follow its reading order.
