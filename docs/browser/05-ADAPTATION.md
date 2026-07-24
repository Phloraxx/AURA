# 05 — Adaptation Engine

## Purpose

The adaptation engine turns resolved user preferences and validated AI semantic recommendations into visible, reversible changes on the **real webpage**.

There is one primary product action: **Make This Mine**.

No separate Adapt / Focus / Simplify / Reader / Reimagine modes in the judged UI.

## Core philosophy

**Use the least invasive transformation that produces a meaningful personalized improvement.**

AURA wins only if the judge's arbitrary page still works.

## Two-phase transformation

### Phase A — immediate deterministic adaptation

Apply known profile preferences immediately:

- text scale;
- line and paragraph spacing;
- reading width where appropriate;
- reduced motion;
- larger interaction targets;
- stronger focus visibility;
- safe presentation/contrast adjustments.

This creates the instant response and remains useful if AI fails.

### Phase B — semantic refinement

After validated page analysis, AURA may:

- emphasize primary regions/actions;
- de-emphasize clearly secondary regions;
- safely collapse secondary regions with restore controls;
- surface deadlines, prices, statuses, and other important facts;
- simplify selected dense text;
- guide through form/task steps;
- add a compact AURA-owned summary/task strip;
- highlight/scroll to relevant original controls;
- preserve or restore detail based on explicit preference.

## Intervention tiers

Use these in order. Do not jump to a more invasive tier merely to create drama.

### Tier 0 — presentation profile

Global/local CSS variables/classes:

- type scale;
- spacing;
- line length;
- motion;
- target sizing;
- focus presentation.

Lowest risk and immediate.

### Tier 1 — emphasis

Element-level visual changes that preserve layout/behavior:

- emphasize;
- deemphasize;
- highlight;
- outline/group visually;
- scroll to target.

### Tier 2 — reversible simplification

Only after target validation:

- collapse clearly secondary content with an AURA restore affordance;
- simplify a targeted text block while retaining original wording;
- progressively reveal form groups without detaching original controls.

### Tier 3 — AURA-owned guidance

Add small local AURA UI connected to real page targets:

```text
Semester Registration
Deadline: 28 July
Step 1 of 4 — Enter Student ID
```

The strip/panel may highlight, scroll to, or describe original controls.

### Not required — arbitrary DOM reconstruction

Do not make large-scale reparenting/regrouping of unknown page DOM part of the event success criteria.

If a dramatic result can only be achieved by rebuilding arbitrary site structure, prefer a strong Tier 0–3 experience instead.

## Primitive contract

Every primitive must be:

- typed;
- idempotent;
- reversible;
- target-validated;
- safe to ignore when the target disappears.

Initial primitive set:

```ts
type AdaptationPrimitive =
  | { type: 'presentation'; settings: PresentationSettings }
  | { type: 'emphasize'; targetIds: string[] }
  | { type: 'deemphasize'; targetIds: string[] }
  | { type: 'collapse'; targetIds: string[]; label?: string }
  | { type: 'simplifyText'; targetId: string; replacement: string }
  | { type: 'enlargeTargets'; targetIds: string[]; minPx: number }
  | { type: 'highlight'; targetId: string }
  | { type: 'scrollTo'; targetId: string }
  | { type: 'guideForm'; groups: GuidedFormGroup[] }
  | { type: 'showAuraSummary'; content: AuraSummary };
```

Do not add a primitive simply because the model suggested an operation. New primitives need tests and must map to a real product need.

## Original-state registry

Maintain one adaptation session per active page.

Store only what AURA changes:

- AURA classes/attributes;
- original inline values for touched properties;
- original text for simplified blocks;
- original hidden/ARIA state when changed;
- AURA-owned UI nodes;
- collapse/restore state.

Prefer CSS variables/classes over rewriting many inline styles.

## Original ↔ AURA

`Original` removes all AURA-owned transformations without reloading.

`AURA` reapplies the latest validated plan.

The toggle must remain fast enough to use repeatedly in front of judges.

## Text simplification

Simplify only targeted blocks.

Rules:

- preserve original text in the registry;
- keep warnings/deadlines/prices/constraints;
- preserve technical terminology when memory/profile requests it;
- avoid pretending that a paraphrase replaces legally important original wording;
- allow original wording to be restored immediately.

The AI should usually return a replacement for a specific AURA target, not a rewritten page.

## Safe collapse

Before collapsing a target:

- target exists and is still current;
- target is not `<main>`, the main article, the primary form, a modal requiring attention, consent/security warning, or the only path to a primary action;
- target does not contain the currently focused element;
- AURA can restore it visibly;
- collapse does not destroy layout enough to make the page unusable.

Prefer `deemphasize` over `collapse` when confidence is moderate.

## Form guidance

Guide through original form controls.

AURA may:

- visually separate logical sections;
- keep the current section prominent;
- reduce visual competition from later sections;
- scroll to/highlight the next control;
- explain labels/instructions.

Do not duplicate inputs into fake AURA forms in the event build.

## AURA-owned task/summary strip

Keep it compact and clearly AURA-owned.

It may show:

- current goal;
- important fact/deadline;
- step progress;
- next action;
- a concise explanation.

It points to original page targets rather than impersonating completed site actions.

## Mutation handling

When the host page changes:

- keep global presentation rules active;
- validate semantic targets before reapplying;
- remove stale primitive records;
- debounce model refresh;
- preserve session intent when the route still belongs to the same task.

Do not fight the website's framework on every mutation.

## Conversation patches

Talk to AURA should modify the active plan incrementally when possible.

Examples:

- “Make this bigger” → update presentation/target-size settings.
- “Too distracting” → stronger deemphasis/collapse of validated secondary targets.
- “Keep technical details” → restore affected simplifications + update session preference.
- “I only want to register” → set goal, emphasize registration controls, add guidance.
- “Explain this” → explanation/highlight without unrelated structural mutation.

## Accessibility of AURA-owned changes

AURA controls must:

- use semantic roles/names;
- be keyboard operable;
- preserve logical focus behavior;
- respect reduced-motion preference;
- use sufficient contrast;
- avoid unnecessary focus traps.

## Acceptance criteria

The adaptation engine is ready when:

- deterministic changes feel immediate;
- AI refinement creates obvious personalized improvements without requiring arbitrary DOM reconstruction;
- two profiles produce meaningfully different results on the same page;
- ordinary form values/primary controls survive;
- Original restores without reload;
- reapplying AURA does not duplicate wrappers/styles;
- stale targets fail safely;
- at least 20 real corpus pages remain usable after Make This Mine before polish begins.
