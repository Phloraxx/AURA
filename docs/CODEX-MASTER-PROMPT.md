# Codex Master Prompt

Copy the task below into Codex after connecting it to this repository.

---

You are implementing the AURA hackathon MVP in this repository.

Before changing code, read `AGENTS.md`, `README.md`, and every document listed in the README's "Read this repository in this order" section.

Then inspect the current repository state and determine the earliest incomplete phase in `docs/10-IMPLEMENTATION-PLAN.md`.

Implement that phase completely before starting later phases.

## Product goal

AURA is a Chrome browser extension that creates a multidimensional capability profile through accessible multimodal onboarding and adapts normal DOM-based websites using composable reversible adaptation primitives.

The product is capability-first, not diagnosis-first.

Do not create disability-specific mode architecture.

Do not diagnose users.

Do not use AI to generate executable DOM mutation code.

AI may only return constrained structured data for onboarding, semantic page understanding, control clarification, and text simplification.

The local extension owns all transformations.

## Required stack

Unless the repository already documents a justified change:

- pnpm workspace
- WXT
- React
- Chrome Manifest V3
- TypeScript strict mode
- Zod
- Hono TypeScript API
- provider abstractions for LLM and STT
- Vitest
- Playwright where practical

## Required architecture

Maintain these boundaries:

- side panel: onboarding/profile/status UI,
- background service worker: lifecycle, permissions, routing/API orchestration,
- content script: DOM extraction and transformations,
- backend: secrets and provider calls,
- shared package: schemas and contracts.

## Mandatory implementation constraints

- No `eval`.
- No `new Function`.
- No remotely supplied executable code.
- No API credentials in extension bundle.
- No arbitrary model-generated HTML replacing websites.
- No full-page DOM replacement.
- Every adaptation is reversible.
- Deterministic adaptations work without the backend.
- Validate all external/model responses with Zod.
- Reject semantic analysis IDs not present in the local element registry.
- Preserve interactive host nodes and form state whenever possible.
- Use idempotent transformations.
- Debounce MutationObserver handling.
- Store capability profiles locally by default.

## Workflow

1. Read docs.
2. Inspect current code.
3. State the phase you are implementing.
4. Research current official documentation only where an API detail is uncertain or version-sensitive.
5. Implement the smallest complete phase.
6. Add tests for important business logic.
7. Run the relevant validation commands.
8. Fix failures.
9. Update documentation only when actual implementation decisions differ from current docs.
10. Summarize exactly what was completed and what phase comes next.

Do not jump ahead to flashy AI features before the deterministic adaptation engine works.

The first critical milestone is:

> Two capability profiles produce different reversible transformations of the same fixture page with the backend completely disabled.

The final critical milestone is:

> Multimodal onboarding creates a profile, the profile drives local adaptation, semantic AI adds conservative improvements, profile switching produces a different interface, and Undo restores the page.

Use `docs/DEFINITION-OF-DONE.md` as the final acceptance checklist.
