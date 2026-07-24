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

### Part A implementation contract

The first W4 gate uses one page-owned presentation session:

1. Electron main validates the current profile and PageModel identity.
2. The remote preload creates one generated AURA stylesheet.
3. AURA marks at most one validated primary reading region.
4. `Original` removes only that stylesheet and AURA presentation attributes.
5. `AURA` reapplies the already-resolved session without another model call.

Tier 0 must not:

- rewrite text;
- hide or collapse regions;
- reparent page DOM;
- touch form values, checked state, selection, or focus;
- enlarge ordinary inline text links;
- apply reading width to both a parent primary region and its nested article;
- reload the page to restore it.

The initial selector policy is deliberately conservative:

- scale from the page's computed root font size rather than assuming 16 px;
- apply line spacing to semantic reading blocks;
- enlarge native form controls, buttons, summaries, and button-like roles;
- leave ordinary inline anchors unchanged;
- apply a reading-width constraint to one substantial `main`, `[role=main]`,
  or `article` target only;
- reduce animation, transition, and smooth scrolling only when requested;
- add a strong `:focus-visible` treatment only when requested.

The presentation session is idempotent. Repeated `Make This Mine` and
`Original ↔ AURA` operations must never add duplicate styles, wrappers, or
listeners.

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

### Part A acceptance matrix

Before semantic AI begins:

- two profiles must produce measurably different root type scale, target size,
  motion policy, and reading presentation on the same fixture;
- text inputs, checkboxes, selects, textareas, and ordinary page actions retain
  their values/states through at least five AURA/Original cycles;
- host inline styles and classes are byte-for-byte unchanged after Original;
- no AURA presentation style or attribute remains after Original;
- new navigation invalidates the old session;
- at least 20 existing real-site corpus pages apply and restore without crash,
  missing primary content, or lost primary controls;
- restoration succeeds on 100% of the required corpus before Part B starts.

### Part B implementation contract

The event implementation uses one bounded semantic request per Make This Mine.
It does not add an agent chain.

1. Main snapshots the current PageModel, resolved profile, explicit learned
   preferences, and a viewport screenshot when the page has no password field
   and no non-empty editable control.
2. Luna returns only the structured `PageAnalysisModelOutput` contract.
3. Main ignores the result after navigation, then revalidates every AURA ID
   against the latest PageModel for the same page session.
4. Global model confidence below `0.6` produces summary-only output. It cannot
   change page targets.
5. Collapse is allowed only for high-confidence, locally validated
   `aside`/`footer` or complementary/content-info regions and only for a profile
   that asked for lower information density.
6. Targeted simpler wording is additive: AURA places a labeled explanation
   next to the original block rather than destroying or replacing the original
   DOM/content.
7. AURA-owned summaries, explanations, restore controls, and guidance are
   marked `data-aura-owned`, excluded from later PageModels, and removed by
   Original.
8. Model timeout, refusal, invalid output, missing key, or stale targets leave
   Part A active and usable.

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
