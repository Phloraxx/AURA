# Product Brief

## Working name

AURA

## One-line pitch

AURA is a browser extension that learns how a person can most comfortably use the web and adapts websites to that individual capability profile in real time.

## Problem

Accessibility is often treated as a small set of binary modes: blind mode, dyslexia mode, high-contrast mode, and so on. Real users may experience multiple overlapping barriers, may not have a formal diagnosis, and may prefer different interaction methods even when they share the same condition.

A static website accessibility toolbar also asks users to manually configure many settings on every site.

## Core insight

Do not classify the person by diagnosis. Model the capabilities and preferences that matter to interaction.

The product therefore separates:

1. **Capability dimensions** — what channels and interaction demands the user can comfortably rely on.
2. **Interaction modalities** — pointer, keyboard, voice, visual output, speech output, screen reader.
3. **Explicit preferences** — text size, spacing, reduced motion, focus mode, simplification, larger targets, and so on.
4. **Page semantics** — what the current page contains and which elements are important.
5. **Adaptation primitives** — small local reversible changes that can be composed.

## User story

A user installs AURA. On first launch the extension asks how they would like to complete setup: by talking, typing, using buttons, or using keyboard-only controls. The user explains what makes websites difficult for them. Optional short calibration tasks let them choose the text presentation, control size, and amount of visual clutter that feels most comfortable.

AURA creates a local capability profile.

On a webpage, the user selects **Adapt this page**. Immediate local changes such as larger targets, reduced motion, text scaling, or stronger focus indicators are applied. The extension then performs conservative semantic analysis of the page and optionally applies higher-level changes such as collapsing distractions, emphasizing the primary action, clarifying ambiguous controls, or offering simpler wording.

The user can inspect which adaptations were applied and undo any or all of them.

## Primary audiences for MVP

The architecture is cross-disability, but the MVP must demonstrate needs that are technically achievable and visually understandable in a hackathon demo:

- attention and distraction sensitivity,
- cognitive load and complex workflows,
- motor/pointer precision challenges,
- low-vision presentation needs,
- language complexity needs,
- screen-reader semantic improvements as a conservative stretch feature.

## Product language

Use:

- capability profile,
- accessibility preferences,
- interaction preferences,
- calibration,
- adaptation,
- personalized interface.

Avoid:

- disability detection,
- diagnosis,
- AI diagnosed,
- guaranteed accessibility,
- makes every website fully accessible.

## What is actually novel in the implementation

Do not claim that personalization or accessibility overlays are new. The differentiator is the implementation combination:

- multimodal capability-first onboarding,
- a multidimensional profile rather than single diagnosis modes,
- composable deterministic adaptation primitives,
- semantic AI used as an advisory layer rather than a page generator,
- reversible runtime DOM adaptation,
- same page adapting differently for different profiles.

## Success metric for the hackathon

A judge should be able to see, within two minutes:

1. onboarding that works by voice or text,
2. a generated profile,
3. one cluttered page before adaptation,
4. a dramatic but functional adapted state,
5. a profile switch,
6. a visibly different adaptation of the same page,
7. undo restoring the original state.
