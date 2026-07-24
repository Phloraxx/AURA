# 02 — Architecture

## Goal

Build the event browser as a thin macOS Electron shell around reusable AURA intelligence. The browser is a host and integration surface; the personalized adaptation engine is the product.

## Platform decision

- **Primary OS:** macOS.
- **Runtime:** Electron.
- **Rendering engine:** Chromium bundled with Electron.
- **Window composition:** `BaseWindow` + `WebContentsView`.
- **Do not use:** Chromium source fork, Firefox source fork, deprecated `BrowserView`, or Electron `<webview>` for the primary architecture.

Electron documents `WebContentsView` as the current view API for displaying and controlling `WebContents`; `BrowserView` is deprecated and Electron recommends `WebContentsView` over `<webview>` for embedded content.

References:

- https://www.electronjs.org/docs/latest/api/web-contents-view
- https://www.electronjs.org/docs/latest/api/base-window
- https://www.electronjs.org/docs/latest/tutorial/web-embeds

## Repository shape

The existing monorepo remains, but browser work is isolated from the legacy extension client.

```text
AURA/
├── apps/
│   ├── browser/              # new primary event client
│   │   ├── src/main/         # Electron lifecycle, views, navigation, IPC
│   │   ├── src/preload/      # narrow trusted bridges for local AURA UI
│   │   └── src/renderer/     # React UI for chrome/panel/onboarding
│   ├── api/                  # OpenAI-facing backend; evolve/reuse
│   └── extension/            # legacy/reference client; not event priority
│
├── packages/
│   ├── shared/               # shared Zod contracts/types
│   ├── profile/              # capability model + preference resolution
│   ├── memory/               # persistent user/site memory
│   ├── page-intelligence/    # DOM/AX/layout/screenshot modeling
│   ├── adaptation/           # reversible page transforms
│   └── aura-brain/           # orchestration of page + person + intent
│
├── docs/browser/             # canonical source of truth
└── STATUS.md
```

Not all packages must exist on day one. Extract code only when a boundary is useful; do not perform a large refactor before W1 works.

## Electron window composition

Use one `BaseWindow` with three controlled views:

1. **ChromeView** — local AURA React UI containing navigation/address/profile controls.
2. **PageView** — remote webpage in a `WebContentsView`.
3. **AuraPanelView** — local AURA React UI for Learn Me / page context / conversation.

The main process owns their bounds and z-order.

```text
BaseWindow
├── ChromeView      local AURA UI
├── PageView        remote Chromium page
└── AuraPanelView   local AURA UI
```

This avoids trying to punch a webpage-shaped hole in one renderer and keeps direct access to the page's `webContents`.

## Browser process responsibilities

`apps/browser/src/main` owns:

- app/window lifecycle;
- PageView creation/destruction;
- navigation and history actions;
- URL normalization/search fallback;
- view bounds;
- page load/navigation events;
- CDP attachment and page snapshot requests;
- screenshots;
- injection of the AURA page runtime;
- adaptation apply/revert commands;
- persisted local browser/profile state;
- typed IPC with local AURA UI.

The browser main process is the authority for which page is active.

## Local renderer responsibilities

ChromeView and AuraPanelView are trusted local UI only. They must not directly own remote webpage logic.

They render:

- onboarding;
- browser chrome;
- profile summary;
- Make This Mine state;
- conversation;
- Original/AURA toggle;
- small memory/editor views;
- loading/error states.

All privileged operations are requested over a narrow typed IPC contract.

## Page runtime

The active PageView receives a lightweight AURA runtime injected by the browser.

Responsibilities:

- assign stable `data-aura-id` identifiers to relevant page elements;
- observe meaningful DOM additions/removals using a debounced `MutationObserver`;
- apply/remove trusted AURA classes/styles/attributes;
- store original values needed for reversal;
- expose element-level actions such as highlight, scroll, collapse, simplify text, enlarge, group, and restore;
- report mutation/navigation invalidation back to the main process.

The runtime must be idempotent: reinjection must not duplicate wrappers/styles/listeners.

## Page intelligence inputs

The browser may combine four sources:

1. **DOM annotation/runtime data** — stable AURA IDs and useful local features.
2. **CDP DOMSnapshot** — DOM, layout, bounding geometry, selected computed styles, iframe structure.
3. **CDP Accessibility tree** — accessible role/name/state structure.
4. **Screenshot** — visible visual context for the AI model.

Electron exposes `webContents.debugger` as a transport to Chrome DevTools Protocol.

References:

- https://www.electronjs.org/docs/latest/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
- https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/

## Core data flow

```text
Page navigation
    │
    ▼
Inject/refresh AURA page runtime
    │
    ├── local element model
    ├── CDP DOM/layout snapshot
    ├── CDP AX tree
    └── screenshot
    │
    ▼
Page Intelligence Engine
    │
    ▼
Canonical PageModel
    │
    ├── active Profile
    ├── relevant Memory
    └── current Intent
    │
    ▼
AURA Brain
    │
    ├── immediate deterministic plan
    └── OpenAI semantic refinement
    │
    ▼
Validated AdaptationPlan
    │
    ▼
AURA page runtime
    │
    ▼
Real webpage
```

## Immediate vs AI path

Make This Mine is intentionally two-phase.

### Immediate path

Profile-derived local adaptations should apply without waiting for the network:

- text scale;
- line spacing;
- reading width;
- motion reduction;
- target sizing;
- focus visibility;
- other deterministic preferences already known about the user.

### AI refinement path

One richer page-analysis request then reasons over page semantics, user profile, current goal, relevant memory, and optionally a screenshot. It returns structured data that is validated before any transform is applied.

This architecture optimizes perceived latency even when OpenAI latency varies.

## API/backend

The existing `apps/api` can be evolved instead of replaced if its contracts remain useful.

Required browser-era API operations:

- `POST /v1/onboarding/turn`
- `POST /v1/page/analyze`
- `POST /v1/conversation/turn`

Exact route names may differ during implementation, but there should be only a small number of coherent operations rather than one endpoint per UI feature.

Provider model names must remain environment-configurable.

## Persistence

For the event build use a simple local JSON store under Electron's `app.getPath('userData')` rather than introducing a native SQLite dependency unless JSON becomes a measured blocker.

Persist:

- active profile;
- profile preferences/capabilities;
- explicit learned preferences;
- site-specific preferences;
- onboarding completion.

Session goal and transient page state remain in memory.

## Packaging/tooling

Use the existing pnpm workspace, TypeScript strict mode, React, Zod, Vitest, and Playwright where practical.

For the Electron app, use Electron Forge with the Vite + TypeScript path for rapid event development and pin exact versions in the lockfile. Forge currently labels its Vite plugin experimental, which is acceptable for this prototype but must be validated in W1.

Reference: https://www.electronforge.io/templates/vite-%2B-typescript

If Forge/Vite causes material instability during W1, record a decision and switch before feature work begins; do not carry tooling instability into W2+.

## Compatibility target

Primary promise: ordinary HTTP/HTTPS DOM-based websites rendered by Chromium.

Expected strong categories:

- articles/news;
- e-commerce;
- university/government sites;
- forms/portals;
- documentation;
- most React/Vue/Angular SPAs;
- dashboards with accessible DOM structure.

Known partial-support categories:

- canvas/WebGL-dominant applications;
- DRM-heavy media;
- some embedded authentication/user-agent-restricted flows;
- browser-internal pages.

For partial-support pages, AURA should remain useful through presentation changes and companion guidance rather than pretending full structural transformation is available.