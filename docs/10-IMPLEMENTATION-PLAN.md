# Implementation Plan

## Strategy

Build the smallest complete vertical slice first. Do not start with AI.

A phase is complete only when its acceptance criteria pass.

---

## Phase 0 — Repository scaffold

### Tasks

- Initialize pnpm workspace.
- Create WXT + React + TypeScript extension app.
- Create Hono TypeScript API app.
- Create shared package.
- Configure strict TypeScript.
- Configure ESLint/formatting as appropriate.
- Configure Vitest.
- Add root scripts:
  - `dev`
  - `build`
  - `lint`
  - `typecheck`
  - `test`
- Add `.env.example` for backend provider configuration.

### Acceptance criteria

- `pnpm install` works.
- `pnpm build` succeeds.
- extension can be loaded unpacked.
- side panel opens with placeholder UI.
- API starts locally with `/health`.

---

## Phase 1 — Capability profile and storage

### Tasks

- Implement shared Zod schemas/types.
- Implement default profile.
- Implement local profile store.
- Implement active profile selection.
- Add seeded demo profiles.
- Build a basic profile viewer/editor.

### Acceptance criteria

- profile persists across extension reload.
- profile can be changed manually.
- switching active profile updates side panel.
- profile schema rejects invalid scores.

---

## Phase 2 — Content script and deterministic transformations

### Tasks

- Content script entrypoint.
- Element registry.
- Local page signal extraction.
- Policy engine.
- Transform engine.
- First 8 deterministic primitives.
- `Undo all`.
- Basic MutationObserver reconciliation.

### Acceptance criteria

- same fixture page transforms differently for at least two profiles.
- no backend is required.
- every primitive can be reverted.
- applying the same plan twice is idempotent.
- build and tests pass.

**Do not move to AI until this phase is solid.**

---

## Phase 3 — Accessible onboarding UI

### Tasks

- Onboarding state machine.
- text-answer UI.
- large-choice answer UI.
- keyboard navigation.
- skip functionality.
- profile review step.
- three calibration tasks.

Use a mocked onboarding responder initially.

### Acceptance criteria

- onboarding can be completed without mouse.
- onboarding can be completed without voice.
- user can skip questions.
- calibration changes preferences.
- no diagnosis language appears.

---

## Phase 4 — Backend and LLM onboarding

### Tasks

- Hono routes.
- LLM provider interface.
- one concrete provider adapter.
- onboarding prompt.
- structured output validation.
- retry/timeout/error normalization.
- extension API client.

### Acceptance criteria

- 5–8 question adaptive interview works.
- profile patches are validated.
- backend failures do not erase profile.
- secrets are absent from extension bundle.

---

## Phase 5 — Voice onboarding

### Tasks

- speech synthesis adapter.
- microphone permission UX.
- `MediaRecorder` adapter.
- transcription endpoint.
- STT provider interface and concrete adapter.
- recording state UI.
- switch between text/voice at any step.

### Acceptance criteria

- user can hear a question.
- user can answer by voice.
- transcript becomes normal onboarding input.
- voice is optional at every step.
- clear accessible errors on denied microphone permission.

---

## Phase 6 — Semantic page analysis

### Tasks

- compact semantic extractor.
- text/payload limits.
- page-analysis endpoint.
- page analyzer prompt.
- semantic analysis schema.
- local ID validation.
- confidence thresholds.

### Acceptance criteria

- model never returns executable code in accepted schema.
- invented IDs are rejected.
- page analysis failure leaves deterministic adaptations intact.
- fixture analysis identifies main content and primary action reasonably.

---

## Phase 7 — AI-assisted primitives

### Tasks

- collapse distractions.
- highlight primary action.
- clarify ambiguous controls.
- simplify text.
- original/simplified toggle.
- conservative risk exclusions.

### Acceptance criteria

- all four features are reversible.
- no critical fixture control is hidden.
- simplified text preserves original access.
- AI failure is non-blocking.

---

## Phase 8 — Demo fixtures and polish

### Tasks

- build three fixture pages.
- seed three profiles.
- add demo reset button.
- show adaptation status list.
- show deterministic vs AI-assisted badges if helpful.
- improve loading/error states.
- optimize demo latency.
- write demo script.

### Acceptance criteria

- complete two-minute demo can be run repeatedly.
- original state can be restored without reloading when possible.
- profile switching creates clearly different page states.

---

## Phase 9 — Test hardening

### Tasks

- policy unit tests.
- transform apply/revert tests.
- Zod contract tests.
- prompt contract fixture tests.
- Playwright extension smoke tests where practical.
- accessibility checks for side panel.

### Acceptance criteria

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm build` passes.
- manual demo checklist passes.

## Parallelization guidance

After Phase 2, independent work can proceed on:

- onboarding UI,
- backend provider adapter,
- fixture pages,
- test harness.

Do not parallelize changes to the same core data schemas unless one owner coordinates them.
