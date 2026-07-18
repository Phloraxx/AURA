# Adaptation Engine

## Core rule

The engine composes adaptations from capabilities and preferences. It does not switch between disability-specific modes.

Bad:

```ts
if (profile.disability === 'ADHD') enableADHDMode();
```

Good:

```ts
if (profile.preferences.reduceMotion) plan.add(reduceMotion());
if (profile.preferences.enlargeTargets) plan.add(enlargeTargets());
if (profile.preferences.hideDistractions && analysis) {
  plan.add(collapseDistractions(analysis.distractions));
}
```

## Policy engine

The policy engine should be a pure function:

```ts
createAdaptationPolicy(
  profile: CapabilityProfile,
  page: LocalPageSignals,
  semantic?: SemanticPageAnalysis,
): AdaptationPlan
```

It returns instructions. It does not touch the DOM.

## Transform engine

The transform engine executes instructions:

```ts
interface AppliedAdaptation {
  instructionId: string;
  apply(): void | Promise<void>;
  revert(): void | Promise<void>;
}
```

The engine tracks applied adaptations and provides:

- `applyPlan(plan)`,
- `reconcilePlan(nextPlan)`,
- `revertInstruction(id)`,
- `revertAll()`.

## Primitive requirements

Every primitive must be:

- reversible,
- idempotent,
- scoped,
- resilient to a missing target,
- safe to apply alongside other primitives,
- able to report status/errors without breaking the entire plan.

## Primitive 1: increaseTextScale

Prefer a scoped root class and CSS variables.

Avoid rewriting every inline `font-size` unless necessary.

Store original inline styles only for properties the primitive changes.

## Primitive 2: increaseLineSpacing

Adjust line height and paragraph spacing on readable content while avoiding form controls and layout-critical widgets where possible.

## Primitive 3: limitReadingWidth

Apply to detected main/article content, not the whole application.

Do not break data tables or code blocks.

## Primitive 4: improveContrast

For MVP, use an explicit high-contrast theme strategy on supported content rather than attempting full automatic WCAG contrast repair of arbitrary designs.

Do not claim guaranteed contrast compliance.

## Primitive 5: reduceMotion

Inject a scoped reduced-motion stylesheet that reduces transitions and animations where safe.

Respect the user's existing `prefers-reduced-motion` preference.

## Primitive 6: enlargeTargets

Target interactive controls:

- buttons,
- links with action semantics,
- form controls,
- elements with interactive roles.

Increase hit area/spacing conservatively. Avoid changing dense navigation in ways that make content unusable.

## Primitive 7: enhanceFocusIndicators

Apply strong visible focus outlines for keyboard navigation.

Do not remove host-page focus indicators unless replacing them with stronger ones.

## Primitive 8: focusMainContent

Use local landmarks first:

- `main`,
- `[role=main]`,
- `article`,
- heuristic largest text region.

If semantic analysis is available, reconcile with its `mainContentIds`.

Focus mode should collapse or visually de-emphasize secondary regions, not delete them.

Always provide a clear **Show hidden content** or equivalent control when hiding meaningful regions.

## Primitive 9: collapseDistractions

Only use targets identified with adequate confidence.

Never automatically collapse:

- authentication controls,
- payment controls,
- security warnings,
- required form errors,
- legal/consent controls,
- primary navigation unless the user can restore it easily.

Use reversible containers or CSS classes.

## Primitive 10: highlightPrimaryAction

Visually emphasize a primary action while preserving the site's original control.

Do not create a new fake button detached from the original event handler.

## Primitive 11: clarifyAmbiguousControls

Prefer adding or improving:

- `aria-label`,
- visible helper text,
- tooltip-like supplementary explanation.

Never overwrite a good existing accessible name with a model suggestion.

## Primitive 12: simplifyText

Never replace text blindly.

Recommended approach:

- keep original text in memory/state,
- render simplified text in a reversible wrapper,
- provide `Show original`,
- do not simplify legal, consent, medical, financial, or security-critical text automatically,
- mark AI-generated simplification clearly in the extension UI when appropriate.

## Local page signals

Before AI, extract deterministic signals:

- existing landmarks,
- heading structure,
- interactive element count,
- visible text density,
- motion indicators where detectable,
- element size,
- accessible-name presence.

These can drive useful local adaptation even without semantic AI.

## Element registry

Assign stable temporary IDs per page session:

```text
aura:n1
aura:n2
aura:n3
```

Use a `WeakMap<Element, string>` plus reverse map where possible.

Do not persist page-node IDs across page loads.

## MutationObserver strategy

- observe relevant subtree changes,
- debounce 250–500 ms,
- ignore changes under known AURA-owned UI wrappers,
- register new semantic elements,
- reapply only idempotent deterministic rules to new nodes,
- avoid repeated AI analysis unless meaningful structure changed.

## Compatibility rule

When a structural adaptation breaks interaction, fall back to a less invasive adaptation rather than forcing the structural version.
