# AGENTS.md

This file defines the default instructions for coding agents working on the `aura-browser` branch.

## Mission

Build the macOS AURA Browser event prototype defined by `docs/browser/`.

The goal is not a broad browser or a collection of accessibility features. The goal is one polished experience in which AURA:

1. learns the person,
2. transforms a real judge-selected webpage through **Make This Mine**,
3. lets the user talk naturally to AURA to change or guide that page.

## Source of truth

Before editing code, read in order:

1. `docs/browser/README.md`
2. `docs/browser/00-PRODUCT.md`
3. `docs/browser/01-EXPERIENCE.md`
4. `docs/browser/02-ARCHITECTURE.md`
5. `docs/browser/03-PAGE-INTELLIGENCE.md`
6. `docs/browser/04-AI-MEMORY.md`
7. `docs/browser/05-ADAPTATION.md`
8. `docs/browser/06-IMPLEMENTATION-PLAN.md`
9. `docs/browser/07-TESTING-DEMO.md`
10. `docs/browser/08-DECISIONS.md`
11. `docs/browser/DEFINITION-OF-DONE.md`
12. `STATUS.md`

For this branch, older extension-era documents under `docs/` are historical and non-authoritative unless a browser source-of-truth document explicitly references them.

When architecture, scope, or product behavior changes, update the relevant browser document and `08-DECISIONS.md` before or with the code change.

## Execution rules

- Work milestone-by-milestone according to `06-IMPLEMENTATION-PLAN.md`.
- Do not begin a later milestone while an earlier milestone's acceptance criteria are materially failing.
- W4 **Make This Mine** and real-site reliability outrank secondary features.
- No new named product mode without revising the product source of truth.
- Do not reintroduce AURA Fit, Lens, Rescue, Reader, Focus, Simplify, or Task Mode as independent primary UI concepts.
- Do not build Windows parity before the macOS event build is polished.
- Do not build browser-engine, sync, password-manager, updater, bookmark-ecosystem, or extension-store work for the event.
- Voice is stretch work; text conversation is required.
- Prefer a complete vertical experience over subsystem rewrites.

## Architecture rules

- Primary client is `apps/browser` once W1 begins.
- Use Electron `BaseWindow` + `WebContentsView`; do not base new work on deprecated `BrowserView` or `<webview>`.
- Page intelligence combines AURA DOM IDs, CDP DOM/layout, CDP accessibility semantics, and optional screenshots.
- Do not return to a first-N DOM element extractor.
- Keep page target IDs and PageModel revisions explicit.
- AI returns typed structured data; trusted local code performs page changes.
- Never execute model-generated JavaScript or arbitrary generated HTML.
- Every adaptation primitive must be reversible and idempotent.
- Preserve original controls and page state wherever practical.
- `Original ↔ AURA` is a hard requirement.
- Deterministic profile adaptation must work when AI is slow or unavailable.
- Do not run a chain of multiple sequential agents when one rich structured call can do the job.

## Memory rules

Persistent memory is limited to:

- profile;
- explicit learned preferences;
- site preferences.

Current task/intent is session memory.

Persistent learning comes from onboarding/calibration answers or explicit `Remember`/edit actions. Do not silently turn behavior into a diagnosis or permanent preference.

## Coding standards

- TypeScript strict mode.
- Zod at process/network/model boundaries.
- Small typed IPC contracts.
- Provider-specific OpenAI code behind provider interfaces.
- No `any` except narrow documented third-party boundaries.
- Prefer pure functions for ranking, policy, validation, and memory resolution.
- AURA page runtime injection must be idempotent.
- Debounce DOM mutation processing.
- Do not expose debug JSON/logs in event builds.

## Validation

After meaningful changes run the relevant repository commands once they exist:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Browser work must also satisfy the milestone-specific acceptance criteria and the real-site matrix in `07-TESTING-DEMO.md`.

For each real-world failure that can be reduced to a stable pattern, add a local regression fixture/test.

## Commit discipline

Keep commits aligned with milestone/subsystem boundaries, for example:

```text
chore(browser): scaffold Electron shell
feat(intelligence): capture DOM and AX page model
feat(profile): add browser onboarding and memory
feat(adaptation): add reversible presentation profile
feat(ai): analyze page with multimodal structured output
feat(aura): implement Make This Mine
feat(conversation): add contextual page commands
style(browser): polish judged experience
test(browser): harden real-site regression cases
```

## Stop conditions

Stop and update the source of truth rather than guessing when:

- a required Electron/CDP capability cannot be verified on the pinned version;
- the proposed approach consistently breaks primary website functionality;
- Page Intelligence is weak and implementation is trying to hide it with prompt complexity;
- a new feature competes with W4/W7 without clear product value;
- a change conflicts with an accepted ADR;
- an implementation would make Original/AURA restoration unreliable.
