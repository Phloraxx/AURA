# AURA Browser Status

**Branch:** `aura-browser`

**Current milestone:** W1 — Browser shell

**Planning state:** W0 accepted. Canonical product and architecture decisions are locked in `docs/browser/`.

**Implementation state:** W1 has not been scaffolded yet.

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

## W1 — next implementation work

Create `apps/browser` and prove:

- Electron launches on the event Mac;
- `electron-vite` dev/build works in the existing pnpm workspace;
- one local `BrowserWindow` shell renders React chrome/panel;
- one remote `WebContentsView` loads arbitrary sites;
- page preload runs on every navigation;
- address/back/forward/refresh work;
- panel/window resizing updates PageView bounds correctly;
- at least Wikipedia, GitHub, an e-commerce page, and the college site load;
- a `darwin-arm64` package/dev path is stable.

No AI or real adaptation should be implemented until W1 is green.

## Source of truth

Read `docs/browser/README.md` first, then follow its reading order.
