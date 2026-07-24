# 10 — Motion and Assistant Personality

## Purpose

AURA should feel alive without becoming visually noisy or turning into a generic "AI browser" skin. Motion and assistant personality exist to make three things unmistakable:

1. AURA is **present with the current page**.
2. AURA is **working with the person's profile, memory, and goal** rather than producing a detached chat answer.
3. When AURA changes something, the person receives immediate, calm feedback and remains in control.

This is a polish layer on the existing three product experiences. It does **not** add a fourth mode, autonomous agent surface, voice requirement, or new navigation system.

## Research basis

### Perplexity Comet — interaction lessons, not visual imitation

Current Comet documentation establishes several interaction patterns worth learning from:

- the Assistant runs beside the main browser in a persistent side panel so help does not require leaving the page;
- the Assistant uses current-page context and can continue work while the person browses;
- remembered preferences can influence later browser assistance;
- Inline Assistant appears close to selected content for quick contextual actions.

Primary references:

- https://www.perplexity.ai/help-center/comet/en/articles/11734688-assistant-panel
- https://www.perplexity.ai/help-center/comet/en/articles/13533742-inline-assistant
- https://www.perplexity.ai/changelog/what-we-shipped---february-20th-2026
- https://www.perplexity.ai/help-center/comet/en/articles/11583910-personalizing-comet

AURA already has the stronger accessibility-specific equivalents: a persistent panel, current-page understanding, explicit memory, a current goal, and direct page adaptation. Therefore the design pass should improve **presence, continuity, and feedback** instead of copying Comet's branding or adding another assistant feature.

### Apple — motion must explain, not decorate

Apple's current HIG says motion should be purposeful, brief, precise, optional, and should help communicate status, feedback, instruction, or continuity. It also recommends reducing or replacing spatial/scale motion for people who prefer reduced motion.

Primary references:

- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/design-principles

The AURA event-video direction remains binding: premium, Apple-like, calm, and specifically **not "AI-y"**. That rules out neon gradients, particle fields, constant glowing orbs, bouncing controls, fake streaming delays, and decorative motion that competes with the webpage.

## Motion hierarchy

AURA uses three timing tiers:

```text
Fast feedback       ~120 ms
State transition    ~190 ms
One-time entrance   ~220–320 ms
```

Recommended easing is smooth and decelerating. Do not use elastic or bouncy easing.

### Fast feedback

Used for:

- hover/press feedback;
- focus and border changes;
- compact status-color changes.

### State transition

Used for:

- address-field focus;
- Original/AURA switch feedback;
- assistant-memory surfaces;
- Make This Mine emphasis.

### One-time entrance

Used sparingly for:

- opening the AURA side panel;
- a newly arrived assistant message;
- semantic-analysis status appearing;
- onboarding step changes.

Frequent controls must not force the person to wait for animation.

## The AURA mark as presence

### Logo review decision

Keep the **adaptive aperture** mark introduced in `09-DESIGN-SYSTEM.md`.

Do not replace it with a new logo merely to appear more "AI". The existing mark is already:

- distinctive at small size;
- tied directly to the product promise;
- non-medical;
- non-diagnostic;
- visually compatible with the premium video direction;
- consistent across favicon, product UI, and native app icon.

The improvement is **behavior**, not a new symbol.

When AURA is genuinely working, the mark may subtly breathe:

- the gold apex/focus point changes opacity/scale slightly;
- aperture strokes shift by only a few percent;
- the surrounding halo strengthens.

The mark remains completely still when AURA is idle.

This turns the logo into a quiet presence indicator without introducing a separate animated avatar.

## Assistant presence

Talk to AURA should feel like a contextual companion rather than a developer chat log.

The visible states are deliberately small and derived from state that already exists:

```text
Here with you
Keeping your goal in view
Working with this page
Ready to remember
```

These labels do not create new product concepts. They simply make existing intent, response, and memory state legible.

### No fake typing

AURA must not deliberately slow an answer to imitate human typing. While a real request is running, show an honest working state. When the answer arrives, reveal it immediately with a brief entrance transition.

### Conversation surface

The composer should read as one calm assistant surface rather than a textarea plus unrelated button. Suggested prompts should look like quick contextual actions, not menu items. Assistant replies should visually carry the AURA identity while user messages remain clearly distinct.

## Microinteraction rules

### Navigation and browser chrome

- hover: at most a 1 px lift for pointer users;
- press: at most a ~1.5% compression;
- no bounce;
- disabled controls do not move;
- keyboard focus remains the strongest state and is never replaced by hover animation.

### Make This Mine

This is the highest-significance action. It should feel consequential through restrained brand emphasis rather than a flashy animation.

Use:

- the existing forest action surface;
- the gold focus point as a small brand cue;
- a precise press response;
- semantic-analysis status immediately after the local presentation is active.

Do not add a loading sequence that delays the immediate local adaptation.

### Original / AURA

The comparison control should communicate state through surface, border, and shadow changes. Switching modes must remain instant; visual transition is secondary to reversibility.

### Memory

A memory proposal can enter with a quiet surface transition and a narrow gold-to-green accent. This makes "AURA learned something I explicitly taught it" feel meaningful without turning memory into a gamified event.

### Onboarding

Each Learn Me step can enter once. Selected comfort choices settle gently. If the current preview corresponds to reduced-motion/calm preferences, onboarding should prefer a fade rather than a spatial slide.

## Reduced-motion behavior

AURA has two relevant signals:

1. macOS/system `prefers-reduced-motion`;
2. the person's resolved AURA `reduceMotion` preference.

When either indicates reduced motion:

- disable looping mark motion;
- disable panel/step/message translation and scale animation;
- disable hover/press transforms;
- keep short color, border, opacity, and focus feedback so state remains understandable;
- keep smooth scrolling disabled.

This follows the Apple recommendation to replace potentially uncomfortable spatial motion with gentler feedback such as fades.

## Implementation

Renderer motion/personality overrides live in:

```text
apps/browser/src/renderer/motion-personality.css
```

It loads after the structural and design-system styles, so it can remain a removable polish layer without duplicating product logic.

The implementation intentionally uses existing semantic state/classes (`aria-expanded`, `aria-pressed`, semantic-analysis state, conversation waiting state, goal chip, memory proposal) rather than adding a new animation state machine.

## Acceptance criteria

The pass is ready when:

- the browser still feels calm when nothing is happening;
- the AURA mark only becomes animated during real work;
- Talk to AURA feels visibly integrated with the current page rather than bolted on;
- Make This Mine remains instant and reversible;
- messages and onboarding steps enter smoothly without delaying interaction;
- the interface is fully understandable with all animation disabled;
- system and profile reduced-motion preferences remove spatial/repeating motion;
- keyboard focus remains more prominent than decorative motion;
- the visual language still matches the premium, non-"AI-y" AURA video direction;
- the logo remains recognizable at small size and does not need a second competing assistant avatar.
