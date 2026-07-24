# 02 — Architecture

## Goal

Build the event browser as a thin macOS Electron shell around reusable AURA intelligence. The browser is only the host; personalized adaptation is the product.

## Locked platform choices

- **Primary OS:** macOS on the team's Apple-Silicon MacBook.
- **Package target:** `darwin-arm64`.
- **Runtime:** Electron + bundled Chromium.
- **Window composition:** one `BrowserWindow` for trusted AURA UI + one child `WebContentsView` for the remote page.
- **Build/dev:** `electron-vite`.
- **Packaging:** Electron Forge only after the judged flow is stable.
- **Do not use:** Chromium/Firefox source forks, deprecated `BrowserView`, or Electron `<webview>`.

`BrowserWindow` extends `BaseWindow`; using its built-in renderer for the local shell removes two unnecessary local `WebContents` while preserving a separate directly controlled remote page view.

References:

- https://www.electronjs.org/docs/latest/api/browser-window
- https://www.electronjs.org/docs/latest/api/web-contents-view
- https://electron-vite.org/guide/
- https://www.electronjs.org/docs/latest/tutorial/application-distribution

## Repository shape

```text
AURA/
├── apps/
│   ├── browser/                # primary event client
│   │   ├── src/main/           # Electron lifecycle, page view, AI, memory, IPC
│   │   ├── src/preload/
│   │   │   ├── shell.ts        # narrow bridge for trusted local React UI
│   │   │   └── page.ts         # AURA runtime for arbitrary remote pages
│   │   └── src/renderer/       # one React shell: chrome + panel + onboarding
│   ├── api/                    # legacy/extension backend; not required by browser demo
│   └── extension/              # legacy/reference client
│
├── packages/
│   ├── shared/                 # common types/Zod contracts
│   ├── profile/                # capability/preference model when extraction is useful
│   ├── memory/                 # optional extracted memory package
│   ├── page-intelligence/      # optional extracted PageModel logic
│   ├── adaptation/             # optional extracted transformation logic
│   └── ai/                     # optional provider/prompt package
│
├── docs/browser/               # canonical source of truth
└── STATUS.md
```

Do **not** create every package before it is needed. Start W1 inside `apps/browser`; extract a package only when two subsystems genuinely need the same logic.

## Window composition

```text
BrowserWindow
│
├── Local shell renderer
│   ├── navigation chrome
│   ├── Learn Me
│   ├── AURA panel / conversation
│   ├── Original ↔ AURA
│   └── memory/settings surfaces
│
└── child WebContentsView
    └── arbitrary remote webpage
```

The local shell reserves the top-bar and optional right-panel areas. The main process resizes the child PageView into the remaining page rectangle.

This gives us:

- one local UI codebase;
- one remote page process;
- fewer IPC/layout/focus problems than three separate local/remote views;
- direct access to `pageView.webContents`.

## Main-process responsibilities

`apps/browser/src/main` owns:

- application/window lifecycle;
- PageView creation/destruction;
- address navigation and history actions;
- URL/search normalization;
- view bounds and panel resizing;
- page title/loading/navigation state;
- screenshots;
- optional CDP attachment/enrichment;
- PageModel orchestration;
- adaptation apply/revert commands;
- local memory persistence;
- OpenAI provider and calls for the event build;
- typed IPC with the trusted local shell.

The main process is the authority for the active page and current PageModel revision.

## Trusted local shell

The BrowserWindow renderer is local AURA UI only. It never loads arbitrary websites.

It renders:

- Learn Me;
- navigation/address UI;
- profile summary;
- Make This Mine state;
- Talk to AURA;
- Original/AURA toggle;
- small memory editor;
- loading/fallback/error states.

A narrow shell preload exposes typed operations to the React renderer.

## Remote PageView and AURA page preload

Create the remote `WebContentsView` with a dedicated local preload script.

Recommended preferences:

```ts
{
  preload: PAGE_PRELOAD_PATH,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}
```

The preload executes before each remote document, has DOM access in its isolated world, and communicates with the Electron main process without exposing Electron APIs to the loaded site's page scripts.

Page-preload responsibilities:

- assign stable `data-aura-id` identifiers to meaningful elements;
- derive local semantic/geometry/style features;
- observe meaningful DOM mutations using a debounced `MutationObserver`;
- apply/remove trusted AURA classes, attributes, text substitutions, and owned UI;
- maintain the current adaptation/original-state registry;
- support target actions: emphasize, deemphasize, collapse/restore, simplify/restore, highlight, scroll, enlarge;
- notify the main process of major model invalidation.

The runtime must be idempotent across ordinary navigation/reload behavior.

References:

- https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
- https://www.electronjs.org/docs/latest/tutorial/context-isolation

## Page intelligence inputs

The default event pipeline is deliberately simpler than the first draft.

### Always / primary

1. **AURA page-preload model** — stable target IDs, DOM semantics, geometry, selected computed styles, forms, headings, landmarks, text blocks.
2. **Visible screenshot** — visual hierarchy/context for multimodal AI.

### Selective enrichment

3. **CDP Accessibility tree** — when useful for accessible roles/names/state or complex semantics.
4. **CDP DOMSnapshot** — diagnostic/fallback for cases where W2 tests show the runtime misses important layout/frame/shadow structure.

Do not merge a full DOMSnapshot into every PageModel merely because the API exists. W2 must prove that any extra source improves real-site reliability enough to justify complexity/latency.

Electron exposes `webContents.debugger` as a CDP transport.

References:

- https://www.electronjs.org/docs/latest/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/

## Core data flow

```text
Navigation
    │
    ▼
remote page preload starts
    │
    ├── stable AURA IDs
    ├── semantic DOM features
    ├── geometry/styles
    └── mutation lifecycle
    │
    ├──────────────┐
    │              │
    ▼              ▼
PageModel       Screenshot
    │              │
    ├──── optional AX/CDP enrichment
    │
    ▼
Local deterministic policy
    │
    ├──────────────► immediate adaptation
    │
    └── profile + memory + current intent + screenshot
                       │
                       ▼
                OpenAI Responses API
                       │
                       ▼
             validated semantic plan
                       │
                       ▼
               page-preload runtime
                       │
                       ▼
                  real webpage
```

## Immediate vs AI path

### Immediate path

Apply known user preferences without network latency:

- text scale;
- line/paragraph spacing;
- reading width where applicable;
- motion reduction;
- control target sizing;
- focus visibility;
- other deterministic resolved preferences.

### AI path

One rich analysis request considers:

- compact PageModel;
- visible screenshot;
- resolved user profile;
- relevant explicit memory;
- current goal if present.

It returns structured semantic recommendations only. Trusted AURA primitives perform the changes.

## OpenAI architecture for the event

The Browser calls OpenAI directly from the Electron **main process**.

There is no required localhost API server in the judged path.

```text
React shell
   │ typed IPC
   ▼
Electron main
   │
   ├── profile/memory/PageModel
   └── OpenAI SDK
          │
          ▼
     Responses API
```

The API key stays in local environment/config and is never placed in the remote page or shell renderer bundle.

Keep provider code behind a small interface so moving it back to `apps/api` later remains straightforward.

### Event baseline model

Start measurement with:

```text
OPENAI_MODEL=gpt-5.6-terra
reasoning.effort=low
```

Use structured outputs and image input. Model choice remains configurable; test `gpt-5.6-sol` only if a measured page-quality problem justifies the latency.

Do not implement automatic model routing before core reliability is finished.

## Persistence

Use one versioned Zod-validated JSON document under Electron `app.getPath('userData')`.

Persist only what matters:

- onboarding completion;
- active profile;
- capability/presentation preferences;
- explicitly remembered global preferences;
- optional site preferences when implemented.

Keep the current session goal/page state in memory.

Use write-to-temp + rename for atomic updates.

## Tooling

Use the existing pnpm workspace, TypeScript strict mode, React, Zod, Vitest, and Playwright where practical.

For `apps/browser`:

- `electron-vite` handles main/preload/renderer dev and build;
- Electron Forge is introduced only for packaging the stable macOS build;
- pin exact Electron/tool versions in the lockfile during W1;
- do not replace the toolchain during W2–W7 unless it blocks the project.

Electron Forge's own Vite plugin is intentionally not used because it is currently marked experimental.

## Compatibility target

Primary promise: ordinary HTTP/HTTPS DOM-based websites rendered by Chromium.

Expected strong categories:

- articles/news;
- e-commerce;
- university/government sites;
- forms/portals;
- documentation;
- most React/Vue/Angular SPAs;
- dashboards with meaningful DOM/ARIA structure.

Known partial-support categories:

- Canvas/WebGL-dominant applications;
- DRM-heavy media;
- some embedded authentication/user-agent-restricted flows;
- browser-internal pages.

For partial-support pages, AURA should remain useful through presentation changes and companion explanation/guidance instead of pretending full structural transformation is available.
