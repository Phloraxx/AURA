# AGENTS.md

This file defines the default instructions for coding agents working on the AURA Browser product line in `main`.

## Mission

Build and harden the macOS AURA Browser event prototype defined by `docs/browser/`.

The goal is one polished experience in which AURA:

1. learns the person;
2. transforms a real judge-selected webpage through **Make This Mine**;
3. lets the user talk naturally to AURA to adjust, explain, guide, or explicitly teach a preference.

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

Older extension-era documents are non-authoritative unless the browser source of truth explicitly references them.

Material architecture/scope changes require an ADR update before or with code.

## Execution rules

- Work milestone-by-milestone.
- Current milestone is `STATUS.md`; do not jump ahead while its acceptance gate is materially failing.
- W4 **Make This Mine** and real-site reliability outrank secondary features.
- Do not introduce new named product modes.
- Do not reintroduce AURA Fit, Lens, Rescue, Reader, Focus, Simplify, or Task Mode as independent primary UI.
- Do not build Windows parity before the Mac event build is polished.
- Do not build engine forks, browser sync, password manager, updater, bookmark ecosystem, or extension-store work.
- Text conversation is required; voice is stretch.
- Prefer a complete vertical experience over architecture churn.

## Locked browser architecture

- Primary client: `apps/browser`.
- Use one local React `BrowserWindow` shell plus one child remote `WebContentsView`.
- Do not use deprecated `BrowserView` or Electron `<webview>`.
- Remote AURA runtime is a dedicated PageView preload.
- Keep PageView `contextIsolation: true`, `nodeIntegration: false`; use narrow preload-to-main IPC.
- Use `electron-vite` for browser dev/build; Forge only for packaging.
- Target `darwin-arm64` first.

## Page-intelligence rules

- Runtime-first extraction with stable `data-aura-id` targets.
- Rank/summarize semantic elements; never return to first-N DOM truncation.
- Collect only useful geometry/selected computed styles.
- Use viewport screenshot for visual context.
- CDP Accessibility is selective enrichment.
- DOMSnapshot is diagnostic/fallback unless W2 data proves it should be in the default path.
- Keep PageModel revisions explicit; reject stale target plans.
- Fix weak extraction instead of hiding it with prompt complexity.

## AI rules

- Browser event build calls OpenAI from Electron main; do not require the Hono API server.
- Event model: `gpt-5.6-luna`. Flagship page analysis defaults to `medium` reasoning and is environment-configurable; onboarding/conversation retain their verified settings unless measured evidence justifies a change.
- Use Responses API + structured outputs; page screenshots may be image input.
- AI returns typed semantic/adaptation requests; trusted AURA code performs changes.
- Never execute model-generated JavaScript or arbitrary generated HTML.
- Use few rich calls, not an agent swarm.
- Required operations: onboarding turn, page analysis, conversation turn.
- Required conversation action families: Adjust, Explain, Goal/Guide, Remember.

## Adaptation rules

Use least-invasive sufficient tier:

1. presentation profile;
2. emphasis/de-emphasis/highlight;
3. validated collapse/targeted simplification/progressive form reveal;
4. small AURA-owned guidance/summary tied to original controls.

- Large-scale arbitrary DOM reparenting is not required.
- Every primitive is typed, reversible, idempotent, and target-validated.
- Preserve original controls and state wherever practical.
- `Original ↔ AURA` is mandatory.
- Deterministic profile adaptation must work when AI is slow/unavailable.

## Memory rules

Required persistent memory:

- profile;
- explicit learned global preferences.

Site-specific memory is secondary. Current task/intent is session memory.

Do not silently turn behavior into diagnosis/permanent memory. Persistent changes come from onboarding/calibration or explicit `Remember`/edit actions.

## Coding standards

- TypeScript strict mode.
- Zod at IPC/model/persistence boundaries.
- Small typed IPC contracts.
- Provider-specific OpenAI code behind a narrow interface.
- Avoid `any` except documented third-party boundaries.
- Prefer pure functions for ranking, policy, validation, and memory resolution.
- Debounce DOM mutation processing.
- Keep debug inspectors/logs out of event builds.

## Validation

Run relevant commands as they exist:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Also satisfy milestone acceptance criteria and `tests/sites.md` / `07-TESTING-DEMO.md`.

For each reproducible real-site failure pattern, add a local fixture/regression test when practical.

## Commit discipline

```text
chore(browser): scaffold Electron shell
feat(browser): add remote WebContentsView navigation
feat(browser): add page preload runtime
feat(intelligence): build ranked PageModel
feat(profile): add Learn Me calibration and memory
feat(adaptation): add reversible presentation tiers
feat(ai): add multimodal page analysis
feat(aura): implement Make This Mine
feat(conversation): add contextual AURA actions
style(browser): polish judged experience
test(browser): harden real-site failures
```

## Stop conditions

Stop and update the source of truth instead of guessing when:

- a required Electron/CDP capability cannot be verified on the pinned version;
- the approach consistently breaks primary website functionality;
- Page Intelligence is weak and work is trying to hide it with prompt complexity;
- a new feature competes with W4/W7 without clear product value;
- a change conflicts with an accepted ADR;
- Original/AURA restoration becomes unreliable.