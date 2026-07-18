# AGENTS.md

This file defines the default instructions for coding agents working in this repository.

## Mission

Build the hackathon MVP described in `README.md` and `docs/` as a reliable vertical slice. The goal is a working adaptive accessibility extension, not a broad prototype with many unfinished features.

## Before editing code

Read, in order:

1. `docs/00-PRODUCT-BRIEF.md`
2. `docs/01-MVP-SCOPE.md`
3. `docs/02-ARCHITECTURE.md`
4. `docs/03-DATA-MODEL.md`
5. `docs/04-ONBOARDING-CALIBRATION.md`
6. `docs/05-ADAPTATION-ENGINE.md`
7. `docs/06-AI-CONTRACTS.md`
8. `docs/07-API-CONTRACTS.md`
9. `docs/08-SECURITY-PRIVACY.md`
10. `docs/10-IMPLEMENTATION-PLAN.md`
11. `docs/11-TESTING.md`
12. `docs/DEFINITION-OF-DONE.md`

Then inspect `docs/09-RESEARCH.md` for verified platform constraints and `docs/13-DECISIONS.md` for architectural decisions that must not be silently reversed.

## Execution rules

- Implement in the phases defined in `docs/10-IMPLEMENTATION-PLAN.md`.
- Complete and verify one phase before starting the next.
- Prefer a working vertical slice over adding extra features.
- Do not redesign the architecture without documenting a concrete technical reason in `docs/13-DECISIONS.md`.
- When uncertain about a current Chrome Extension, WXT, Web Speech, or provider API, research the latest official documentation before implementing.
- Record material research discoveries or changed assumptions in `docs/09-RESEARCH.md`.
- Keep all AI responses behind Zod validation.
- Never execute model-generated code.
- Never put LLM or STT secrets in the extension bundle.
- Never infer or present a medical diagnosis.
- Capability scores are product signals, not clinical measurements.
- Deterministic adaptations must continue to work when the backend is unavailable.
- Every DOM adaptation must be reversible.
- Avoid permanent deletion of host-page elements.
- Avoid replacing the entire `document.body` or regenerating arbitrary pages.
- Preserve existing form values, event handlers, and application state whenever possible.

## Coding standards

- TypeScript strict mode.
- Prefer small pure functions for policy logic.
- Use discriminated unions and Zod schemas at process/network boundaries.
- Keep Chrome APIs behind small adapters where practical.
- Keep provider-specific SDKs behind provider interfaces.
- Do not use `any` except at a narrow third-party boundary with an explanatory comment.
- Do not use `eval`, `new Function`, remotely supplied scripts, or dynamic code execution.
- Avoid global CSS rules that can permanently damage host pages; scope injected styles under an AURA marker where possible.
- Use idempotent transformations. Reapplying the same plan should not repeatedly wrap or mutate the same node.
- Debounce MutationObserver processing.
- Log useful diagnostics in development mode without logging sensitive page content in production mode.

## Validation after meaningful changes

Run the relevant commands once they exist:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run focused tests during development and the full suite before declaring a phase complete.

For extension changes, also verify the unpacked extension manually in Chrome or Chromium.

## Definition of a good Codex task

A task should have:

- one clear outcome,
- explicit files or subsystem boundaries,
- acceptance criteria,
- commands to validate,
- no unrelated cleanup.

## Commit discipline

Keep commits phase-oriented and understandable. Suggested messages:

- `chore: scaffold extension and api workspace`
- `feat: add capability profile and local storage`
- `feat: add reversible adaptation primitives`
- `feat: add multimodal onboarding flow`
- `feat: add semantic page analysis contracts`
- `test: add extension fixtures and policy tests`

## Stop conditions

Stop and document the blocker instead of guessing when:

- a browser API cannot be verified,
- an implementation would require unsafe arbitrary code execution,
- a change would violate the privacy model,
- a transformation consistently breaks core website behavior,
- a requested feature requires medical diagnosis or unsupported claims.
