# 08 — Decisions

This file records deliberate product and architecture decisions for the `aura-browser` branch.

Do not silently reverse a decision. Add a new entry with status `Superseded` and the replacement rationale.

## ADR-001 — Build a browser shell, not a browser engine

**Status:** Accepted

Use Electron/Chromium as the host. Do not fork Chromium or Firefox source for the event.

Reason: the innovation is personalized adaptation, while browser-engine maintenance contributes little to the judged experience.

## ADR-002 — macOS is the only polished event target

**Status:** Accepted

Keep code portable, but optimize and test the judged build on the team's MacBook first. Windows is optional after W7 is green.

## ADR-003 — The product has exactly three first-class experiences

**Status:** Accepted

- Learn Me
- Make This Mine
- Talk to AURA

AURA Fit, Lens, Rescue, Focus, Reader, Simplify, and Task Mode are not separate event products.

Reason: avoid feature bloat and make the transformation story immediately understandable.

## ADR-004 — Make This Mine is the flagship and receives priority

**Status:** Accepted

When schedule conflicts occur, cut secondary features before weakening Make This Mine or random-site reliability.

## ADR-005 — Use Electron `BaseWindow` + `WebContentsView`

**Status:** Accepted

Use separate local AURA UI views and a remote PageView. Do not base the primary architecture on deprecated `BrowserView` or Electron `<webview>`.

## ADR-006 — Page intelligence is hybrid, not DOM-only or vision-only

**Status:** Accepted

Combine:

- AURA DOM IDs/runtime;
- CDP DOMSnapshot/layout;
- CDP Accessibility tree;
- visible screenshot.

DOM/AX semantics provide actionable element mapping; vision adds presentation context.

## ADR-007 — No first-N DOM extraction

**Status:** Accepted

Build a balanced ranked PageModel with category quotas and deduplication. A repeated nav or feed must not consume the entire AI context.

## ADR-008 — AI uses few rich calls, not an agent swarm

**Status:** Accepted

Required operations:

- onboarding turn;
- page analysis;
- conversation turn.

Default page flow uses one rich semantic analysis request rather than sequential agents.

Reason: latency matters more than API cost for the event.

## ADR-009 — OpenAI is a semantic planner; trusted code performs changes

**Status:** Accepted

Model output is structured and Zod-validated. Do not execute model-generated JavaScript or arbitrary replacement HTML.

This is primarily a reliability decision for arbitrary websites.

## ADR-010 — Immediate local adaptation precedes AI refinement

**Status:** Accepted

Known profile preferences apply immediately when Make This Mine is pressed. AI semantic refinement runs concurrently and adds structural changes when ready.

Reason: the product must feel responsive even with variable model latency.

## ADR-011 — Preserve the real page rather than rebuild the whole application

**Status:** Accepted

Use DOM-preserving transformations and small AURA-owned summary/guidance UI. Original controls remain responsible for actual site actions.

Full model-generated page replacement is outside the event build.

## ADR-012 — Original ↔ AURA is mandatory

**Status:** Accepted

Every transformation session must support clean local restoration without reloading the page.

Reason: trust, debugging, and a strong before/after judging moment.

## ADR-013 — Memory is simple and explicit

**Status:** Accepted

Persistent layers:

- profile;
- explicitly learned preferences;
- site preferences.

Transient session intent remains in memory.

Use a Zod-validated local JSON file for the event. No database unless measured need appears.

## ADR-014 — No silent diagnosis or permanent passive learning

**Status:** Accepted

AURA may suggest a preference based on interaction, but persistent memory is created by onboarding/calibration answers or explicit `Remember`/edit actions.

## ADR-015 — Text conversation is required; voice is stretch

**Status:** Accepted

Voice is attractive but is not allowed to delay Make This Mine, page intelligence, or browser polish.

## ADR-016 — Keep the extension code as reference, not as the event client

**Status:** Accepted

The existing extension and its proven capability/adaptation logic may be selectively ported. Do not port its side-panel UX or platform assumptions wholesale.

## ADR-017 — Old docs are non-authoritative on this branch

**Status:** Accepted

`docs/browser/` is the source of truth. Extension-era docs are historical unless a browser document explicitly references them.

## ADR-018 — Real-site testing is a release gate

**Status:** Accepted

Local fixtures are necessary for CI but cannot define readiness. The event build must be manually tested on 25–30 real pages across diverse categories on the actual Mac.

## ADR-019 — Tooling may be changed only during W1 without penalty

**Status:** Accepted

Initial choice: Electron Forge + Vite + TypeScript, pinned in the lockfile.

Forge currently labels its Vite plugin experimental. If a W1 spike exposes material instability, switch tooling and record the replacement here before W2. Do not change bundlers/toolchains during flagship feature implementation unless blocked.

## ADR-020 — Security hardening is not a project optimization target

**Status:** Accepted for event prototype

The judged build is a controlled one-day prototype on team hardware. Do not spend schedule on production-grade browser sandbox policy, updater/signing infrastructure, credential sync, or distribution hardening.

However, reliability boundaries remain: model output is validated, page IDs are checked, password values are not intentionally sent to AI, and AURA must avoid destroying primary page functionality.

## Decision template

For new decisions:

```markdown
## ADR-XXX — Title

**Status:** Proposed | Accepted | Superseded

Decision.

Reason.

Consequences/trade-offs.
```
