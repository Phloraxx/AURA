# Capability Resolution

## Purpose

AURA's six capability dimensions are active product inputs, not descriptive metadata. Runtime adaptation follows one centralized pipeline:

```text
Capability dimensions + confidence
        |
        v
Capability recommendations
        |
        v
Onboarding preferences
        |
        v
Calibration preferences
        |
        v
Explicit user choices
        |
        v
Resolved adaptation preferences
        |
        v
Policy engine + page signals
        |
        v
Reversible adaptation plan
```

The policy engine does not contain scattered capability thresholds. Thresholds and recommendation composition live in `apps/extension/lib/profile/preference-resolver.ts`.

## Support need

Capability-derived recommendations use:

```text
supportNeed = (1 - capacity) * confidence
```

A low capacity score with low confidence therefore does not trigger aggressive adaptation. These thresholds are product heuristics, not clinical measurements.

## Precedence

Preference resolution is deterministic and uses this order, from weakest to strongest:

1. default,
2. capability-derived recommendation,
3. onboarding recommendation,
4. calibration choice,
5. explicit user choice.

An explicit user choice must never be silently re-enabled or disabled by a lower-priority capability recommendation.

## Preference provenance

`CapabilityProfile.preferences` remains the materialized resolved snapshot for compatibility with existing storage and API contracts.

`CapabilityProfile.preferenceLayers` records the durable source-specific patches:

```ts
interface PreferenceLayers {
  onboarding: Partial<AdaptationPreferences>;
  calibration: Partial<AdaptationPreferences>;
  explicit: Partial<AdaptationPreferences>;
}
```

Capability recommendations are intentionally not persisted. They are derived again from the current capability vector so changing a capability signal can update automatic recommendations while preserving stronger user choices.

Legacy profiles without provenance keep their non-default saved preferences as legacy user choices until the user resets them.

## Current capability coverage

- Visual: text scale, line spacing, reading width.
- Motor: larger interaction targets and target size.
- Cognitive: focus mode, clearer controls, guided form steps.
- Attention: reduced motion, focus mode, distraction reduction.
- Language: clearer controls and simpler wording.
- Auditory: currently influences output modality rather than arbitrary website media transformation.

Enhanced contrast remains an explicit/onboarding preference rather than being inferred from a generic visual score.

## Explainability

The side panel shows the resolved source of each non-default preference and its reason. Manual choices are labeled **My choice** and can be reset to the next-highest AURA recommendation.

Adaptation instructions continue to carry a human-readable `reason`, so the runtime plan remains inspectable.

## Guided forms

`stepByStepForms` is implemented as the semantic `guideFormSteps` primitive.

It:

- uses validated, high-confidence semantic form-group targets,
- adds Previous/Next navigation,
- highlights the active logical group,
- preserves every original form control, value, handler, and submission path,
- does not detach or rebuild the form,
- is fully reversible.

Low-confidence and critical form-group targets are filtered before the primitive is created.
