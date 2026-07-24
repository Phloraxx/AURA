# AURA Browser Status

**Branch:** `aura-browser`

**Current milestone:** W4 — Make This Mine

**Planning state:** W0 accepted. Canonical product and architecture decisions are locked in `docs/browser/`.

**Implementation state:** W1, W2, W3, and W4 Part A are complete. W4 Part B is
implemented and locally verified; its live Luna/high late-site audit remains
pending. The development and packaged browser have been verified on the event
Mac.

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
- Event model baseline: `gpt-5.6-luna` with high reasoning, environment-configurable.
- The event API budget is approximately USD 50, so usage and latency are measured
  and repeated analysis is avoided.
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

## W2 — implemented and verified

- versioned, Zod-validated `PageModel` and page-intelligence IPC contracts;
- stable page-session `data-aura-id` targets, including ordinary open Shadow
  DOM;
- runtime-first extraction using native HTML/ARIA semantics, associated labels,
  geometry, selected computed styles, headings, landmarks, forms, states, and
  viewport context;
- no collection of password values or arbitrary typed form values;
- explainable scoring, structural repetition summaries, duplicate suppression,
  and balanced category quotas instead of first-N DOM extraction;
- bounded DOM-ready/mutation quiet-window capture with revisions and
  hash/history route re-analysis;
- stale-navigation and stale-revision rejection in Electron main;
- viewport screenshot capture through `webContents.capturePage()`;
- debug-only PageModel inspector and target highlight/scroll commands;
- deterministic unit coverage for late primary content after 250 repeated
  navigation candidates, repetition caps, labels/forms, value exclusion,
  Shadow DOM, and stable target IDs;
- repeatable CDP-driven real-site audit script.

Verified on the Apple Silicon event Mac on 24 July 2026:

- 20/20 baseline real sites produced a settled PageModel and screenshot;
- 5/5 additional sites chosen after implementation also passed;
- the 25-site corpus spans news, commerce, universities, public services,
  technical documentation, forms, SPAs, and search/listing pages;
- mean local extraction time was 56.6 ms; maximum was 401.5 ms;
- mean viewport screenshot time was 115.9 ms; maximum was 451 ms;
- a current W3C Forms heading target highlighted through its stable AURA ID;
- stale revisions are rejected by the page runtime, while Electron main
  validates the current page ID, revision, target, and URL before dispatch;
- a selective CDP Accessibility sample on Next.js resolved 20 AURA targets in
  32.6 ms, but did not demonstrate enough baseline benefit to justify a
  mandatory AX-tree request on every page;
- repository lint, typecheck, tests, browser build, and `darwin-arm64`
  packaging pass.

## W3 — implemented and verified

- first-launch `Learn Me` experience with a six-screen, four-area
  deterministic comfort calibration;
- reading, interaction size, information density/motion, and explanation-style
  choices update the onboarding presentation immediately;
- versioned Zod-validated capability and preference profile across visual,
  auditory, motor, cognitive, attention, and language support dimensions;
- concise human-readable summary with no diagnosis labels or raw score
  dashboard;
- optional final free-text preference, handled by a bounded structured
  Responses API call rather than an open-ended AI interview;
- `gpt-5.6-luna` with `reasoning.effort: high`, configurable through
  `OPENAI_MODEL`;
- provider reads `OPENAI_API_KEY` from the local process environment and never
  stores it in profile data or the repository;
- deterministic fallback for missing key, timeout, refusal, invalid output, or
  provider failure;
- one atomic versioned JSON profile under Electron `userData`;
- reset/re-run path from the AURA panel;
- remote `WebContentsView` is hidden throughout onboarding and restored with
  stable bounds after completion.

Verified on the Apple Silicon event Mac on 24 July 2026:

- two intentionally different calibration paths resolve visibly different
  profiles, including 44 px versus 60 px targets, standard versus step-by-step
  information density, and different explanation styles;
- a complete Learn Me flow was exercised through the live Electron renderer;
- the UI visibly changed text scale, line spacing, target size, density, and
  motion preference while progressing;
- profile persistence survived a full Electron process restart;
- re-running Learn Me cleared the stored profile and completed again;
- an explicit preference persisted and appeared in the panel after completion;
- deterministic completion worked with no API key;
- one bounded live Luna/high call returned a valid structured response and
  token usage in approximately 3.5 seconds;
- development launch, production build, lint, typecheck, and all default tests
  pass;
- Forge produced and launched the updated arm64 `AURA.app`, whose executable
  was verified as Mach-O arm64 and whose remote page/panel layout rendered
  correctly.

## W4 — Part A implemented and verified

- one deterministic, page-owned presentation session driven by the active
  profile;
- immediate text scale, line spacing, reading width, motion, target-size, and
  focus presentation;
- one conservative semantic reading region rather than nested width changes;
- no form-value, checked-state, selected-state, focus, host-class, or inline
  style mutation;
- fast `Original ↔ AURA` without reload;
- exact removal of AURA presentation styles and attributes;
- same-page reapplication and new-page invalidation;
- idempotent restore/reapply behavior with bounded session bookkeeping.

Verified on the Apple Silicon event Mac on 24 July 2026:

- two profiles produced measurably different presentation CSS on the same
  fixture;
- inputs, checkboxes, selects, and textareas retained state through five
  Original/AURA cycles;
- the 20-site real-page matrix applied and restored without loss of primary
  content or controls;
- one batch produced 19/20 because Stanford did not settle within the initial
  30-second PageModel window; its HTTP response, 180-target healthy PageModel,
  presentation, and exact restoration all passed immediately on isolated
  retry;
- local adaptation remains active when semantic analysis falls back.

## W4 — Part B implemented; live model verification pending

- one bounded `analyzePage` Responses API request per Make This Mine;
- configurable `gpt-5.6-luna` with high reasoning, structured Zod output,
  low-detail screenshot input when privacy gates allow, and no response
  storage;
- compact PageModel serialization that excludes form values;
- screenshot suppression when a password or non-empty editable control is
  present;
- same-page and current-revision revalidation of every model target;
- confidence-gated primary emphasis, deemphasis, highlight, safe collapse,
  additive simpler explanations, important facts, and target-linked guidance;
- local runtime rechecks collapse safety in both primary-content containment
  directions before hiding anything;
- AURA-owned summary, explanation, restore, and guidance nodes are excluded
  from later PageModels and removed exactly by Original;
- model failure, missing key, invalid output, timeout, stale page, or stale
  revision leaves the deterministic Part A presentation usable;
- 36 browser tests pass, with one optional live-provider test skipped by
  default;
- repository lint, typecheck, tests, production build, and native
  `darwin-arm64` packaging pass.

Remaining W4 acceptance work:

- launch the app with the temporary event key provided through the local
  process environment;
- verify one end-to-end Luna/high semantic transformation and its token/latency
  record;
- run the five-site late/random semantic audit;
- visually inspect the semantic summary/refinement and exact Original restore;
- do not mark W4 complete until those live checks pass.

## Source of truth

Read `docs/browser/README.md` first, then follow its reading order.
