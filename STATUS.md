# AURA Browser Status

**Branch:** `aura-browser`

**Current milestone:** W0 — Planning lock

**Implementation state:** Browser implementation has intentionally not started yet. The branch is being reset around a new canonical product/architecture plan before code is written.

## Done

- Created dedicated `aura-browser` branch from `main`.
- Established `docs/browser/` as the authoritative source of truth for this branch.
- Defined the three first-class product experiences:
  - Learn Me
  - Make This Mine
  - Talk to AURA
- Selected macOS as the only polished event target.
- Selected Electron/Chromium with `BaseWindow` + `WebContentsView`.
- Defined hybrid page intelligence: AURA DOM IDs + CDP DOMSnapshot + Accessibility tree + screenshot.
- Defined explicit local memory layers.
- Defined phased adaptation and Original/AURA reversal.
- Defined implementation milestones W0–W7.
- Defined real-site testing gates and event Definition of Done.

## W0 remaining

- Team review of every `docs/browser/` file.
- Resolve any product/architecture disagreements in `08-DECISIONS.md`.
- Confirm the primary event Mac's macOS version/CPU architecture before pinning Electron.
- Confirm the live OpenAI model/config to use during W3/W4; keep the contract provider-agnostic.
- Mark W0 accepted.

## Next

**W1 — Browser shell**

Create `apps/browser` and prove:

- Electron launches on the primary Mac;
- `BaseWindow` + WebContentsView composition works;
- address navigation/back/forward/refresh work;
- AURA chrome/panel resize correctly;
- a macOS dev/package path is stable.

No AI or flagship adaptation work should begin until W1 is green.

## Source of truth

Read `docs/browser/README.md` first.
