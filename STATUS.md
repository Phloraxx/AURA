# AURA Browser Status

**Branch:** `aura-browser`

**Current milestone:** W7 — Judge-proofing / freeze

**Planning state:** W0 accepted. Canonical product and architecture decisions are locked in `docs/browser/`.

**Implementation state:** W1 through W6 are implemented and verified. W7
hardening, release rehearsal, and native packaging are complete except for the
final credentialed event-network check. The development and packaged browser
have been verified on the event Mac.

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

## W4 — Part B implemented and verified

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

Verified with live `gpt-5.6-luna` and high reasoning on the Apple Silicon event
Mac on 24 July 2026:

- an end-to-end Wikipedia smoke test returned a validated semantic plan in
  17.0 seconds using 33,680 tokens, applied one AURA summary and three primary
  targets, and restored with zero AURA-owned nodes, semantic/presentation
  styles, or adaptation attributes;
- all five late/random sites passed: NASA News, Harvard, Canada Benefits,
  Python Tutorial, and Next.js Docs;
- the five-site run used 96,587 total tokens, with mean model latency of
  15.6 seconds and a measured range of 10.0–20.1 seconds;
- the corpus exercised safe collapse, additive simplification, important
  facts, primary emphasis, deemphasis, and summary output without losing the
  original page or its controls;
- every audited site returned to Original without semantic residue;
- visual review of Wikipedia and Next.js confirmed that the AURA-owned summary
  is readable and the source page remains recognizable;
- a final prompt/contract refinement made page purpose a concise user-facing
  title and prohibited internal adaptation instructions in summary copy;
- overlapping highlight targets are now reduced to the deepest target in each
  containment chain, avoiding nested outlines;
- the refined Next.js rerun returned user-facing copy, passed exact restoration,
  and used 24,524 tokens in 23.6 seconds.

W4 acceptance is complete.

## W5 — implemented and verified

- contextual Talk to AURA panel with suggestions, conversation history,
  intentional waiting state, error recovery, and keyboard submission;
- one versioned, Zod-validated conversation contract covering Adjust, Explain,
  Goal/Guide, Remember, and ordinary answers;
- direct Responses API conversation provider using configurable
  `gpt-5.6-luna` with high reasoning and structured output;
- compact reuse of the cached PageModel and current semantic plan rather than a
  second full-page analysis;
- deterministic natural-language fallback for missing, failed, invalid, or
  timed-out provider calls;
- small validated presentation and semantic patches linked only to current
  AURA target IDs;
- session intent that survives ordinary navigation and is protected against
  stale-page responses;
- explicit memory proposal and confirmation rather than silent learning;
- persisted global learned preferences with inspect, edit, forget, reset, and
  case-insensitive deduplication;
- conversation errors always return the UI from responding to idle;
- semantic-analysis and conversation mutations cannot race in the panel.

Verified on the Apple Silicon event Mac on 24 July 2026:

- natural phrasing exercised all four action families on an article, a form,
  and an e-commerce listing;
- goal intent remained visible after navigation from the article to the form;
- a confirmed preference survived a full Electron process restart and appeared
  in `What AURA remembers`;
- unavailable-provider and forced 25 ms timeout tests both retained useful
  deterministic behavior;
- browser unit coverage is 45 passed with two opt-in live-provider tests
  skipped by default;
- no API key or page form value is persisted in source, profile, or memory.

The W5 provider follows the same live-validated Luna/high structured Responses
API path used by W3 and W4. The final event-network credential check remains an
operational release step because no API key is currently present in the Codex
process environment.

## W6 — implemented and verified

- compact, intentional browser chrome and AURA panel hierarchy;
- no PageModel inspector, raw JSON, or other developer UI in the judged path;
- primary AURA text is at least 14 px, controls use large targets, and focus
  states are visible;
- profile-driven and operating-system reduced motion are respected;
- address and AURA-panel keyboard shortcuts work from both the trusted shell
  and remote page (`Command-L`, `Command-Shift-A`);
- page navigation failures are translated into concise user-facing messages;
- Talk to AURA, memory confirmation, and memory editing expose failure states
  without unhandled promises;
- scrollable conversation history is keyboard-focusable;
- serious/critical Axe audit passes, including color contrast and keyboard
  access;
- the judged 1440 × 920 layout was visually reviewed with onboarding,
  adaptation, conversation, and memory visible without clipping.

## W7 — hardening and release evidence

- `tests/sites.md` contains 27 real sites across article/news, commerce,
  universities, public services, technical documentation, forms, SPAs,
  listings, and public-information sites;
- all 27 load and produce useful local personalized adaptation;
- all 27 restore Original successfully;
- six representative sites have live Luna/high semantic-refinement evidence,
  including all five late/random W4 sites;
- three categories have all four Talk to AURA action families verified;
- two additional final-set sites, UNICEF and Mozilla, produced 105 and 118
  targets respectively and restored exactly;
- semantic audit now fails if all visible controls disappear or form state
  changes during adaptation/restoration;
- clean-launch and seeded-profile Playwright Electron tests cover Learn Me,
  Make This Mine, Talk, Remember, cross-navigation intent, Original, restart,
  and persistent memory;
- the full Electron journey passed three consecutive automated rehearsals
  (six tests total);
- deterministic event backup exists at
  `fixtures/aura-event-profile.json` and is schema-validated by test;
- repository lint, typecheck, 107 unit/integration tests, browser E2E, legacy
  Chromium extension smoke, and all application builds pass;
- Electron Forge produces
  `apps/browser/out/AURA-darwin-arm64/AURA.app`;
- the packaged executable is Mach-O arm64 and successfully launched a trusted
  AURA renderer plus a separate remote HTTPS page through `WebContentsView`.

The scope is frozen. Only the credentialed event-network smoke check and any
bugs it reveals remain before the final event handoff.

## Source of truth

Read `docs/browser/README.md` first, then follow its reading order.
