# 08 — Decisions

This file records deliberate product and architecture decisions for the `aura-browser` branch.

Do not silently reverse a decision. Add a replacement ADR and mark the old decision `Superseded`.

## ADR-001 — Build a browser shell, not a browser engine

**Status:** Accepted

Use Electron/Chromium as the host. Do not fork Chromium or Firefox source for the event.

Reason: the innovation is personalized adaptation; browser-engine maintenance does not improve the judged experience enough to justify the cost.

## ADR-002 — macOS is the only polished event target

**Status:** Accepted

Target the team's Apple-Silicon MacBook for the judged build. Keep code portable, but Windows is not a release gate.

Primary package target: `darwin-arm64`.

## ADR-003 — The product has exactly three first-class experiences

**Status:** Accepted

- **Learn Me**
- **Make This Mine**
- **Talk to AURA**

AURA Fit, Lens, Rescue, Focus, Reader, Simplify, Task Mode, and disability presets are not separate event products.

## ADR-004 — Make This Mine is the flagship

**Status:** Accepted

When schedule conflicts occur, cut secondary features before weakening **Make This Mine** or random-site reliability.

## ADR-005 — Use `BrowserWindow` + one remote `WebContentsView`

**Status:** Accepted — supersedes the earlier three-view `BaseWindow` composition.

Use one `BrowserWindow` for the trusted local React shell (browser chrome, AURA panel, onboarding) and one child `WebContentsView` for the remote webpage.

Reason: `BrowserWindow` already extends `BaseWindow`; using its renderer as the local shell removes two extra local `WebContents`, simplifies layout/IPC/focus, and still gives direct control over the remote page's `webContents`.

Do not use deprecated `BrowserView` or Electron `<webview>`.

## ADR-006 — The remote AURA runtime is a preload script

**Status:** Accepted

Attach a dedicated preload to the remote `WebContentsView`. It runs in Electron's isolated context on every navigation, has DOM access, assigns AURA IDs, observes mutations, performs local extraction, and communicates with the main process through narrow IPC.

Keep `contextIsolation: true` and `nodeIntegration: false`. This is primarily an isolation/reliability choice, not a production-security project.

Reason: preload lifecycle is more reliable than manually reinjecting the entire runtime after every navigation.

## ADR-007 — Page intelligence is runtime-first with selective CDP enrichment

**Status:** Accepted — refines the earlier "always use four sources" design.

Primary representation:

1. remote preload/runtime semantic DOM extraction with stable AURA IDs;
2. geometry + selected computed styles gathered for ranked candidates;
3. visible screenshot from the page `webContents`;
4. CDP Accessibility tree as semantic enrichment when useful.

`DOMSnapshot.captureSnapshot` is a **fallback/diagnostic tool**, not a mandatory request for every page. Use it when it materially improves coverage (for example, shadow/frame/layout cases discovered in W2).

Reason: the runtime can already map semantics, geometry, styles, and AURA target IDs directly. Mandatory DOMSnapshot merging adds complexity and latency before we have evidence that it improves judge-site reliability.

## ADR-008 — No first-N DOM extraction

**Status:** Accepted

Build a balanced ranked `PageModel` with category quotas, deduplication, and repeated-structure summarization. A large navigation menu or feed must not consume the AI context.

## ADR-009 — AI uses few rich calls, not an agent swarm

**Status:** Accepted

Only three AI operations are first-class:

- onboarding turn;
- page analysis;
- conversation turn.

No sequential page/accessibility/critic/task agent chain in the critical path.

## ADR-010 — Call OpenAI directly from Electron main for the event build

**Status:** Accepted

The AURA Browser does **not** require the Hono API server during the judged event. The Electron main process owns the OpenAI SDK/provider and reads the API key from the local environment/config.

The existing `apps/api` remains untouched for the extension/history and may be reused later.

Reason: on one controlled Mac, a local backend process adds startup, CORS, deployment, and failure surface without adding judged value. Direct main-process calls also remove a network hop.

Provider code still sits behind a small interface so the architecture can move back to a server later.

## ADR-011 — Use GPT-5.6 Terra as the event baseline, but keep model configuration external

**Status:** Accepted

Baseline:

- model: `gpt-5.6-terra`;
- Responses API;
- structured outputs;
- image input for page screenshots;
- low reasoning effort on latency-sensitive page/conversation calls as the first measured configuration.

Reason: OpenAI positions Terra as the balance of intelligence and cost; cost is not the event constraint, but latency is. `gpt-5.6-sol` remains an environment override for difficult pages if measured quality justifies the latency.

Do not implement dynamic multi-model routing before W7.

## ADR-012 — AI plans; trusted AURA code transforms

**Status:** Accepted

Model output is schema-validated. Never execute model-generated JavaScript or arbitrary replacement HTML.

This is primarily a reliability decision for arbitrary websites.

## ADR-013 — Immediate local adaptation precedes AI refinement

**Status:** Accepted

Known profile preferences apply immediately when **Make This Mine** is pressed. AI semantic refinement runs concurrently and adds validated structural changes when ready.

## ADR-014 — Preserve the real page; avoid DOM reconstruction

**Status:** Accepted

Keep original controls and application state. The event build should prefer styling, emphasis, de-emphasis, safe collapse, targeted reversible text replacement, and small AURA-owned companion UI.

Do not reparent large portions of arbitrary websites or build a second fake website above the original.

## ADR-015 — Original ↔ AURA is mandatory

**Status:** Accepted

Every transformation session must restore the original presentation without reloading.

## ADR-016 — Adaptation has intervention tiers

**Status:** Accepted

Apply the least invasive sufficient tier:

- **Tier 0:** global profile presentation (text, spacing, motion, target size, focus);
- **Tier 1:** element-level emphasis/de-emphasis/highlight;
- **Tier 2:** validated safe collapse and targeted reversible text simplification;
- **Tier 3:** AURA-owned task/summary/guidance UI connected to original controls.

Large-scale DOM regrouping/reparenting is not required for the event build.

Reason: visual impact must not come at the cost of random-site breakage.

## ADR-017 — Memory is simple and explicit

**Status:** Accepted

Required persistent memory:

- profile;
- explicitly learned global preferences.

Site-specific preferences are supported by the data model but are secondary and may be completed after the core global memory demo.

Session intent is transient.

Use a versioned Zod-validated JSON file in Electron `userData`; no database unless a measured blocker appears.

## ADR-018 — No silent diagnosis or permanent passive learning

**Status:** Accepted

AURA may suggest a preference based on interaction, but persistent memory is created by onboarding/calibration or explicit `Remember`/edit actions.

## ADR-019 — Talk to AURA has four reliable action families

**Status:** Accepted

The event build optimizes four families rather than six overlapping feature intents:

1. **Adjust** — easier, bigger, calmer, more/less detail;
2. **Explain** — explain current content in the user's preferred style;
3. **Goal / Guide** — "I'm trying to…" and guide using original controls;
4. **Remember** — persist an explicit preference.

This is an internal reliability scope; natural phrasing remains open-ended.

## ADR-020 — Text conversation is required; voice is stretch

**Status:** Accepted

Voice is attractive but cannot delay Make This Mine, page intelligence, or polish.

## ADR-021 — Keep the extension as reference, not the event client

**Status:** Accepted

Selectively port proven capability/adaptation logic. Do not port the side-panel UX or extension platform assumptions wholesale.

## ADR-022 — Old docs are non-authoritative on this branch

**Status:** Accepted

`docs/browser/` is the source of truth.

## ADR-023 — Real-site testing is a release gate

**Status:** Accepted

Fixtures are for regression. Readiness requires manual testing on 25–30 diverse real pages on the actual event Mac, including several sites chosen late rather than tuned during development.

## ADR-024 — Use `electron-vite` for development/build and Forge only for packaging

**Status:** Accepted — supersedes Electron Forge's experimental Vite plugin as the build integration.

Use:

- `electron-vite` for main/preload/renderer dev and production bundling;
- Electron Forge for the final macOS package if packaging is needed.

Reason: Electron Forge currently marks its Vite plugin experimental. `electron-vite` has a focused main/preload/renderer workflow and can hand its built output to Forge, avoiding the experimental Forge/Vite integration while retaining Electron's recommended packager.

Do not change this toolchain after W1 unless blocked.

## ADR-025 — Security hardening is not the event optimization target

**Status:** Accepted for event prototype

Do not spend the schedule on updater/signing infrastructure, credential sync, or production browser hardening.

Keep the low-cost boundaries that improve reliability anyway: isolate the remote page, keep Node integration off, validate model outputs/targets, and avoid intentionally sending password values to AI.

## ADR-026 — W0 is accepted after these decisions are reflected in the canonical docs

**Status:** Accepted

No further product brainstorming is required before implementation. New ideas are deferred unless they directly fix a blocker in Learn Me, Make This Mine, Talk to AURA, or judge-site reliability.

## Decision template

```markdown
## ADR-XXX — Title

**Status:** Proposed | Accepted | Superseded

Decision.

Reason.

Consequences/trade-offs.
```
