# Definition of Done

The hackathon MVP is done when all required items below are true.

## Build

- [ ] Repository installs with one documented package-manager command.
- [ ] Extension builds successfully.
- [ ] API builds successfully.
- [ ] Unpacked extension loads in Chrome.
- [ ] Side panel opens.

## Onboarding

- [ ] Onboarding works with keyboard only.
- [ ] Text input works.
- [ ] Large-choice input works.
- [ ] Voice input works.
- [ ] Questions can be read aloud.
- [ ] User can switch voice/text without restarting.
- [ ] User can skip a question.
- [ ] No medical diagnosis is produced.
- [ ] Profile review/edit screen exists.

## Profile

- [ ] Six capability dimensions exist.
- [ ] Confidence and evidence source exist.
- [ ] Preferences are stored separately.
- [ ] Profile persists locally.
- [ ] Active profile can be switched.
- [ ] Three demo profiles are seeded.

## Adaptation

- [ ] Policy engine combines multiple needs.
- [ ] Eight deterministic primitives work.
- [ ] Four semantic/AI-assisted primitives work.
- [ ] All transformations are reversible.
- [ ] `Undo all` works.
- [ ] Reapplying the same plan is idempotent.
- [ ] Dynamic content does not cause infinite mutation loops.

## AI safety

- [ ] Model output is Zod validated.
- [ ] Page-analysis IDs are checked against local registry.
- [ ] No model-generated code is executed.
- [ ] No API key exists in extension source/bundle.
- [ ] Prompt injection from webpage text cannot trigger tool execution.
- [ ] Critical controls are excluded from automatic hiding.

## Privacy

- [ ] Profile is local by default.
- [ ] Page snapshot omits password/form secrets.
- [ ] Payload sizes are bounded.
- [ ] Production-mode logging avoids full page text/profile content.
- [ ] Audio recording requires explicit action.

## Resilience

- [ ] Backend-off mode still supports deterministic adaptation.
- [ ] API failure is non-blocking.
- [ ] Invalid model response is ignored safely.
- [ ] Missing DOM targets do not crash adaptation.

## Tests

- [ ] Policy tests pass.
- [ ] Apply/revert primitive tests pass.
- [ ] API contract tests pass.
- [ ] Build passes.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual demo checklist passes.

## Demo

- [ ] Cluttered article fixture works.
- [ ] Complex form fixture works.
- [ ] Product page fixture works.
- [ ] Same page looks clearly different for at least two profiles.
- [ ] Voice onboarding is demonstrated.
- [ ] Undo is demonstrated.
- [ ] Full demo can be repeated reliably in under two minutes.
