# AGENTS.md

This file defines the default instructions for coding agents working in this repository.

## Mission

Build AURA as a reliable, polished hackathon product: a capability-driven adaptive accessibility extension that can **SEE → TRANSFORM → GUIDE**.

The original vertical-slice MVP is the technical foundation. New productization work must follow `docs/17-HACKATHON-WOW-IMPLEMENTATION-PLAN.md` without weakening the architecture, security, privacy, reversibility, or deterministic fallback guarantees established by the earlier documents.

The goal is not a broad collection of unfinished features. The goal is a complete, visually compelling, trustworthy demo in which AURA can show personalized friction, safely adapt the real page, and guide a user through a task.

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
10. `docs/15-PREFLIGHT-REVIEW.md`
11. `docs/16-CAPABILITY-RESOLUTION.md`
12. `docs/17-HACKATHON-WOW-IMPLEMENTATION-PLAN.md`
13. `docs/10-IMPLEMENTATION-PLAN.md`
14. `docs/11-TESTING.md`
15. `docs/DEFINITION-OF-DONE.md`

Then inspect `docs/09-RESEARCH.md` for verified platform constraints and `docs/13-DECISIONS.md` for architectural decisions that must not be silently reversed.

`docs/15-PREFLIGHT-REVIEW.md` contains corrections and implementation guardrails from the final architecture review. Where it is more specific than an earlier document, follow the preflight review.

`docs/17-HACKATHON-WOW-IMPLEMENTATION-PLAN.md` is the canonical sequencing and product-scope document for post-MVP hackathon productization. Where it expands the old MVP plan, follow the new W0–W15 phases. It does not override security, privacy, safety, capability-precedence, or reversibility rules from the architecture documents.

## Execution rules

- Implement the productization phases defined in `docs/17-HACKATHON-WOW-IMPLEMENTATION-PLAN.md` in dependency order.
- Complete and verify one phase before declaring it finished.
- Preserve the existing working vertical slice while adding visible product value.
- Prefer a complete vertical experience over disconnected feature stubs.
- Do not redesign the architecture without documenting a concrete technical reason in `docs/13-DECISIONS.md`.
- When uncertain about a current Chrome Extension, WXT, Web Speech, or provider API, research the latest official documentation before implementing.
- Record material research discoveries or changed assumptions in `docs/09-RESEARCH.md`.
- Keep all AI responses behind Zod validation.
- Use the shared MV3-safe Zod configuration; do not reintroduce JIT/eval-dependent schema paths.
- Never execute model-generated code.
- Never put LLM or STT secrets in the extension bundle.
- Never infer or present a medical diagnosis.
- Capability scores are product signals, not clinical measurements.
- AURA Fit is a personalized product heuristic, not WCAG conformance or legal compliance.
- Explicit user preferences must override inferred, capability-derived, or Rescue recommendations.
- AURA Rescue must ask before applying or persisting a recommendation.
- Deterministic adaptations must continue to work when the backend is unavailable.
- Local scan, baseline AURA Fit, local Lens signals, deterministic adaptation, Before/After, and Undo must continue to work without semantic AI.
- Semantic AI page analysis must use a minimized network payload.
- Task Mode must guide through original controls and must not automatically submit purchases, payments, legal acceptance, authentication, or other critical actions.
- Never pass raw audio `Blob` objects through Chrome runtime messaging; upload voice recordings directly from the side-panel extension page to the fixed AURA API endpoint.
- Content scripts must not perform arbitrary cross-origin fetches. Route remote semantic/task requests through fixed/configured AURA API clients or approved provider abstractions.
- Every DOM adaptation must be reversible.
- Avoid permanent deletion of host-page elements.
- Avoid replacing the entire `document.body` or regenerating arbitrary pages.
- Preserve existing form values, event handlers, and application state whenever possible.
- AURA Lens should visualize friction without changing host-page layout.
- Per-site auto-adaptation must require explicit user permission.

## Coding standards

- TypeScript strict mode.
- Prefer small pure functions for policy, friction, scoring, and recommendation logic.
- Use discriminated unions and Zod schemas at process/network boundaries.
- Keep Chrome APIs behind small adapters where practical.
- Keep provider-specific SDKs behind provider interfaces.
- Do not use `any` except at a narrow third-party boundary with an explanatory comment.
- Do not use `eval`, `new Function`, remotely supplied scripts, or dynamic code execution.
- Avoid global CSS rules that can permanently damage host pages; scope injected styles under an AURA marker where possible.
- Use idempotent transformations. Reapplying the same plan should not repeatedly wrap or mutate the same node.
- Debounce MutationObserver processing.
- Throttle Lens overlay position updates.
- Keep Rescue interaction windows short-lived and local.
- Log useful diagnostics without logging sensitive page content, profile contents, form values, or audio.

## Validation after meaningful changes

Run the relevant commands:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Run focused tests during development and the full suite before declaring a phase complete.

For extension changes, also verify the unpacked extension manually in Chrome or Chromium.

For productization work, validate the phase-specific acceptance criteria in `docs/17-HACKATHON-WOW-IMPLEMENTATION-PLAN.md`.

## Definition of a good Codex task

A task should have:

- one clear outcome,
- explicit files or subsystem boundaries,
- acceptance criteria,
- commands to validate,
- no unrelated cleanup.

For large productization phases, split work by the subsystem boundaries in the W0–W15 roadmap rather than creating one giant unreviewable change.

## Commit discipline

Keep commits phase-oriented and understandable. Suggested messages include:

- `feat: add personalized friction contracts and scanner`
- `feat: add aura fit scoring`
- `feat: visualize page friction with aura lens`
- `feat: redesign side panel around page fit`
- `feat: add polished adaptation flow and fit delta`
- `feat: add original versus aura comparison`
- `feat: add guided task mode`
- `feat: polish experiential onboarding calibration`
- `feat: add adaptation decision inspector`
- `feat: add consent-based aura rescue`
- `feat: add per-site adaptation memory`
- `test: harden hackathon end-to-end demo`

## Stop conditions

Stop and document the blocker instead of guessing when:

- a browser API cannot be verified,
- an implementation would require unsafe arbitrary code execution,
- a change would violate the privacy model,
- a transformation consistently breaks core website behavior,
- a requested feature requires medical diagnosis or unsupported claims,
- a Task Mode step would require automatic completion of a critical user decision,
- a personalized score would be presented as compliance or medical truth.
