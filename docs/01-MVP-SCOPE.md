# MVP Scope

## Must-have vertical slice

### 1. Accessible extension shell

- Chrome Manifest V3 extension.
- Side panel UI.
- Keyboard operable.
- Clear focus states.
- Large primary controls.
- Text labels for all icon buttons.
- Reduced-motion friendly.

### 2. Multimodal onboarding

Support a single onboarding state machine with multiple input/output adapters:

- text input,
- selectable answer buttons,
- keyboard navigation,
- voice recording for speech-to-text,
- speech synthesis for reading questions aloud.

A user can switch modality at any step.

### 3. Capability profile

Six MVP dimensions:

- visual,
- auditory,
- motor,
- cognitive,
- attention,
- language.

These dimensions are a product abstraction, not a clinical taxonomy.

Also store:

- preferred input modalities,
- preferred output modalities,
- screen-reader usage,
- explicit adaptation preferences,
- confidence and evidence source for each capability dimension.

### 4. Calibration tasks

Implement exactly three optional calibration tasks:

1. text presentation preference,
2. control size/spacing preference,
3. clutter/focus preference.

Calibration updates preferences and provides weak evidence only. It never diagnoses a condition.

### 5. Deterministic adaptation primitives

Must implement:

1. `increaseTextScale`
2. `increaseLineSpacing`
3. `limitReadingWidth`
4. `improveContrast`
5. `reduceMotion`
6. `enlargeTargets`
7. `enhanceFocusIndicators`
8. `focusMainContent`

### 6. AI-assisted semantic adaptation

Must implement after deterministic features work:

9. `collapseDistractions`
10. `highlightPrimaryAction`
11. `clarifyAmbiguousControls`
12. `simplifyText`

### 7. Reversibility

- Each primitive has `apply()` and `revert()`.
- `Undo all` restores the page as closely as possible to its pre-adaptation state.
- Never permanently delete nodes.

### 8. Failure tolerance

If AI/backend is unavailable:

- profile still loads,
- local deterministic adaptations still work,
- side panel shows a non-blocking message,
- user can still undo changes.

### 9. Demo fixtures

Provide three static pages in `fixtures/`:

- `cluttered-article.html`
- `complex-form.html`
- `product-page.html`

Provide three seeded demo profiles:

- low vision focused,
- motor + cognitive load focused,
- attention + language focused.

## Stretch goals

Only after all must-haves pass:

- step-by-step form transformation,
- voice commands after onboarding,
- semantic heading repair for screen-reader navigation,
- missing/ambiguous accessible-name suggestions,
- per-site adaptation overrides,
- optional host permissions for automatic adaptation,
- local on-device AI when available,
- cloud sync of non-sensitive preferences.

## Explicit non-goals

- medical diagnosis,
- custom ML training,
- replacing assistive technologies,
- perfect support for Canvas/WebGL,
- rewriting arbitrary sites into model-generated HTML,
- automated WCAG compliance certification,
- claiming 100% accessibility.
