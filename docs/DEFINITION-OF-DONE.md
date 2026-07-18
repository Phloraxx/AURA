# Definition of Done

The hackathon MVP is done when all required items below are true.

## Build

- [x] Repository installs with one documented package-manager command.
- [x] Extension builds successfully.
- [x] API builds successfully.
- [x] Unpacked extension loads in Chromium.
- [x] Side panel opens.

## Onboarding

- [x] Onboarding works with keyboard only.
- [x] Text input works.
- [x] Large-choice input works.
- [x] Voice input works.
- [x] Questions can be read aloud.
- [x] User can switch voice/text without restarting.
- [x] User can skip a question.
- [x] No medical diagnosis is produced.
- [x] Profile review/edit screen exists.

## Profile

- [x] Six capability dimensions exist.
- [x] Confidence and evidence source exist.
- [x] Preferences are stored separately.
- [x] Profile persists locally.
- [x] Active profile can be switched.
- [x] Three demo profiles are seeded.

## Adaptation

- [x] Policy engine combines multiple needs.
- [x] Eight deterministic primitives work.
- [x] Four semantic/AI-assisted primitives work.
- [x] All transformations are reversible.
- [x] `Undo all` works.
- [x] Reapplying the same plan is idempotent.
- [x] Dynamic content does not cause infinite mutation loops.

## AI safety

- [x] Model output is Zod validated.
- [x] Page-analysis IDs are checked against local registry.
- [x] No model-generated code is executed.
- [x] No API key exists in extension source/bundle.
- [x] Prompt injection from webpage text cannot trigger tool execution.
- [x] Critical controls are excluded from automatic hiding.

## Privacy

- [x] Profile is local by default.
- [x] Page snapshot omits password/form secrets.
- [x] Payload sizes are bounded.
- [x] Production-mode logging avoids full page text/profile content.
- [x] Audio recording requires explicit action.

## Resilience

- [x] Backend-off mode still supports deterministic adaptation.
- [x] API failure is non-blocking.
- [x] Invalid model response is ignored safely.
- [x] Missing DOM targets do not crash adaptation.

## Tests

- [x] Policy tests pass.
- [x] Apply/revert primitive tests pass.
- [x] API contract tests pass.
- [x] Build passes.
- [x] Typecheck passes.
- [x] Lint passes.
- [x] Automated Chromium demo smoke passes; final device/screen-reader rehearsal remains a release-environment check.

## Demo

- [x] Cluttered article fixture works.
- [x] Complex form fixture works.
- [x] Product page fixture works.
- [x] Same page looks clearly different for at least two profiles.
- [x] Voice onboarding is demonstrated.
- [x] Undo is demonstrated.
- [x] Full automated demo path completes well under two minutes.
