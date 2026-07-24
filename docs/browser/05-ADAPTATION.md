# 05 — Adaptation Engine

## Purpose

The adaptation engine turns profile preferences and AI semantic recommendations into reliable, reversible changes on the real webpage.

The flagship behavior is **Make This Mine**. There are no separate Adapt/Focus/Simplify/Reimagine modes in the event UI.

## Two-phase transformation

### Phase A — immediate deterministic adaptation

Apply from the resolved user profile without waiting for AI:

- text scale;
- line spacing;
- reading width;
- reduced motion;
- larger interaction targets;
- focus visibility;
- safe contrast/presentation adjustments where supported.

This phase creates immediate feedback and is the fallback when AI is unavailable.

### Phase B — semantic refinement

After validated page analysis, AURA may:

- emphasize primary content/actions;
- de-emphasize or collapse secondary regions;
- surface important facts/deadlines/prices;
- simplify selected text;
- group related controls;
- add progressive form guidance;
- add an AURA-owned task/summary strip;
- scroll/highlight the next relevant original control;
- preserve detail when the user profile explicitly prefers it.

## Core rule

**Preserve original page nodes and functionality wherever practical.**

For the event build, do not replace `document.body` or ask the model to generate a complete replacement website.

Deep personalization should come from trusted DOM-preserving operations plus small AURA-owned UI overlays/components.

## Transformation primitive contract

Every primitive must be:

- typed;
- idempotent;
- reversible;
- target-validated;
- safe to ignore when its target disappears.

Suggested primitive set:

```ts
type AdaptationPrimitive =
  | { type: 'injectPresentationProfile'; settings: PresentationSettings }
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

The exact union can evolve, but new primitives require tests and an entry in `08-DECISIONS.md` when they materially change product behavior.

## Original state registry

Maintain an adaptation session registry keyed by page ID/revision.

For every mutated target, store only what is needed to restore AURA-owned changes:

- original inline style values touched by AURA;
- original text when simplified;
- original hidden/aria state when changed;
- wrappers/classes/attributes added by AURA;
- AURA-owned UI nodes.

Prefer applying classes and CSS variables over rewriting many individual inline styles.

## Original ↔ AURA

`Original` must remove all active AURA transformations for the current page without reloading.

`AURA` must reapply the latest validated plan deterministically.

This toggle is a hard acceptance criterion, not a decorative demo feature.

## Simplification

AI may rewrite a selected text block into clearer language when the profile or explicit user request calls for it.

Rules:

- preserve the original text in the registry;
- do not silently remove warnings, deadlines, prices, legal meaning, or critical constraints;
- preserve technical terms when profile/memory says to;
- simplify targeted blocks, not the entire page at once;
- provide an easy way to reveal original wording.

## Structural focus

AURA should prefer this order of intervention:

1. emphasize what matters;
2. de-emphasize secondary content;
3. collapse clearly secondary content with restore affordance;
4. guide progressively through complex forms;
5. only then attempt more invasive visual regrouping.

This produces dramatic improvements without destroying site behavior.

## AURA-owned summary/task strip

A compact strip may be rendered above or beside the real page to show personalized important information or task progress.

Examples:

```text
Semester Registration
Deadline: 28 July
Step 1 of 4 — Enter Student ID
```

The strip may point to, scroll to, or highlight original controls. It must not pretend to have completed actions that the original site has not completed.

## Mutation handling

When the host page changes:

- preserve the adaptation session if the page is still semantically the same SPA route;
- reapply global presentation rules automatically;
- validate target IDs before applying semantic primitives;
- remove stale primitive records when targets disappear;
- request lightweight or full reanalysis only when needed.

## Target validation

Before applying an AI-targeted primitive:

- target exists;
- target belongs to current page/revision or has survived validation;
- target is visible/relevant where required;
- destructive/collapse actions do not swallow primary content, critical forms, dialogs, consent/security warnings, or the entire application shell.

Even for a one-day event, this validation is essential for reliability.

## Conversation-driven changes

Talk to AURA produces a small adaptation patch rather than rebuilding the plan from scratch whenever possible.

Examples:

- “Make this bigger” → update presentation/target-size primitive.
- “Keep technical details” → revert affected simplifications + update session preference.
- “I only want to register” → emphasize registration region, collapse secondary areas, create task guidance.
- “Explain this” → add AURA explanation without mutating unrelated page structure.

## Accessibility of AURA changes

AURA-generated controls must:

- have semantic roles/names;
- be keyboard operable;
- preserve logical focus order;
- avoid motion when profile requests reduced motion;
- use sufficient contrast;
- avoid focus traps unless implementing a real modal.

## Acceptance criteria

The engine is ready when:

- deterministic profile changes feel immediate;
- AI refinement can create a visibly different layout/hierarchy on real pages;
- two profiles produce meaningfully different results on the same page;
- form values and ordinary controls survive adaptation;
- Original restores the page without reload;
- reapplying AURA does not duplicate wrappers/styles;
- stale AI target IDs fail safely;
- at least the site corpus in `07-TESTING-DEMO.md` is usable after transformation.