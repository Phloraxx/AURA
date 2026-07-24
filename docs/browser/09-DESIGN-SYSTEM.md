# 09 — Design System and Brand

## Purpose

AURA should look like the same product it claims to be: calm, adaptable, trustworthy, and unmistakably personal without resembling a medical dashboard or a generic AI chat sidebar.

The visual system follows four constraints:

1. **Person first.** AURA's own shell adapts to the person's resolved text scale, line spacing, target size, motion preference, and information density instead of adapting only the remote webpage.
2. **Content first.** Browser chrome and AURA controls establish clear hierarchy without competing with the real website.
3. **Reversible and legible.** Original/AURA comparison, keyboard focus, loading state, and current task step remain obvious.
4. **One identity.** App icon, favicon, browser wordmark, panel symbol, and interface glyphs share one visual language.

## Research basis

The design pass is grounded in current primary guidance rather than trend imitation:

- Apple Human Interface Guidelines — Design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles
- Apple HIG — Designing for macOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/
- Apple HIG — Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility/
- Apple HIG — Icons: https://developer.apple.com/design/human-interface-guidelines/icons
- Apple HIG — App icons: https://developer.apple.com/design/human-interface-guidelines/app-icons/
- Apple HIG — Dark Mode: https://developer.apple.com/design/human-interface-guidelines/dark-mode
- Apple HIG — Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- WCAG 2.2 — target size and focus criteria: https://www.w3.org/TR/WCAG22/
- Electron Forge — custom app icons: https://www.electronforge.io/guides/create-and-add-icons

The event build does not claim conformance merely because these references informed the design. They are engineering/design inputs, not a certification statement.

## Brand idea — the adaptive aperture

The AURA mark is an abstract **A / aperture / path**:

```text
       •
      / \
     /---\
    /     \
```

It is intentionally not a disability symbol, eye, wheelchair, brain, magic wand, or generic chatbot sparkle.

The mark represents the product promise:

> AURA keeps the same web underneath, but reframes the path through it around the person.

The apex dot is the person/current point of attention. The two rising strokes suggest an aperture or path. The crossbar keeps the mark recognizable as AURA at small sizes.

### App icon

The native icon uses:

- a centered adaptive-aperture mark;
- a deep forest gradient for calm identity and small-size contrast;
- warm ivory strokes instead of harsh pure white;
- one muted gold apex accent for recognition;
- few broad shapes so the mark remains legible when reduced.

Canonical sources:

```text
apps/browser/resources/aura.svg   vector master
apps/browser/resources/aura.png   1024px development/Dock asset
apps/browser/resources/aura.icns  packaged macOS compatibility icon
```

The same symbol is used in the renderer and favicon rather than inventing unrelated marks.

## Color language

AURA's palette is intentionally restrained.

### Core light tokens

```text
Canvas             #F4F2EC  warm paper
Surface            #FFFEFA  near-white
Ink                #17211B  deep neutral green-black
Secondary ink      #526057
AURA forest        #245F43
AURA dark forest   #173D2C
AURA soft          #E6F0E8
AURA bright        #3F805E
Apex gold          #D2A84F
Keyboard focus     #0B63CE
Error              #9B2C2C
```

Forest is identity, not decoration. Gold is an accent, not a second primary color. Blue is reserved for keyboard focus because focus needs to remain visually distinct from ordinary brand state.

### Dark appearance

AURA follows `prefers-color-scheme` and swaps semantic tokens instead of inverting the UI. Surfaces become deep green-neutral, text becomes warm off-white, and the brand becomes lighter while preserving the same hierarchy.

Do not add a redundant in-app Light/Dark selector for the event build; respect the operating-system appearance.

## Typography

The interface has two voices:

- **System sans** for controls, status, forms, navigation, and conversation. This keeps the browser native-feeling and highly legible.
- **New York / `ui-serif` fallback** for major AURA headings. This adds a quiet editorial personality without affecting operational controls.

The shell must not lock itself to one fixed type size. Resolved profile preferences generate shell variables for body text, small text, headings, and line spacing.

## Geometry

Use soft, purposeful radii rather than pill-shaping everything.

- controls: roughly 10–14px radius;
- cards/status surfaces: roughly 14–16px;
- onboarding container: larger radius because it is a single focused canvas;
- brand mark: compact rounded-square geometry.

Shadows stay shallow. Depth should communicate surface separation, not create a floating-card dashboard.

## Interface icons

Custom interface icons use one family:

- 24x24 view box;
- simple universal metaphors;
- approximately 1.7–1.9px strokes;
- rounded line caps/joins;
- no decorative internal detail;
- optical rather than mathematically identical sizing.

Current custom glyphs cover Back, Forward, Refresh, AURA sparkle/status, and confirmation. They live in `src/renderer/Brand.tsx` so the visual grammar is centralized.

Never use emoji as primary product controls. Text labels remain where meaning could otherwise be ambiguous.

## Profile-driven shell

After Learn Me, the local AURA shell resolves these values from the same profile used for webpage adaptation:

```text
textScale          -> shell body/small/title type sizes
lineSpacing        -> shell reading/conversation leading
targetSizePx       -> interactive minimum target height/width
informationDensity -> shell spacing treatment
reduceMotion       -> shell animation/scroll behavior
```

This prevents the contradiction where a person asks AURA for larger text or controls and the remote page changes while AURA's own interface stays small.

The event profile still carries six capability-support fields for future extensibility, but the current Learn Me path directly calibrates reading/visual, motor interaction, attention/cognitive presentation, and language/understanding preferences. Auditory support is not presented as an independently calibrated event feature.

## Focus and target policy

AURA's own important controls use at least a 44px baseline target, and profile calibration may raise that to 52px or 60px.

Keyboard focus uses a high-contrast external outline with offset rather than a subtle color-only change. Focus must remain visible against both light and dark surfaces.

The task-guide runtime additionally marks exactly one current original-page target at a time and exposes the matching guide button with `aria-current="step"`.

## Motion

Motion communicates state; it is never required to understand state.

- Loading/status animation is subtle.
- User `reduceMotion` preference disables AURA animation and smooth scrolling.
- System `prefers-reduced-motion` is also respected.
- Current-step guidance can jump without animation when motion is reduced.

## Density

`standard`, `calm`, and `step_by_step` are presentation preferences, not named disability modes.

- `standard`: normal information rhythm.
- `calm`: more breathing room and reduced visual competition.
- `step_by_step`: stronger separation between current actions and supporting material.

Do not hide essential AURA controls merely to create the appearance of a calmer UI.

## Voice and copy

AURA copy is:

- direct rather than clinical;
- reassuring without being childish;
- specific about what is happening;
- honest about fallback states;
- never diagnostic.

Preferred verbs are product verbs already established in the experience:

```text
Learn Me
Make This Mine
Talk to AURA
Original / AURA
Remember / Just for now
```

Avoid inventing additional branded modes.

## Design anti-patterns

Do not introduce:

- a rainbow accessibility toolbar;
- disability preset buttons;
- dense analytics dashboards;
- glass on every surface;
- decorative gradients behind all content;
- emoji as navigation icons;
- a separate AI visual language that competes with AURA;
- tiny fixed text inside an interface that claims to personalize readability;
- motion that continues after the user asks for reduced motion.

## Acceptance check

A design change is ready when:

- it is still understandable without color alone;
- keyboard focus is obvious;
- the same interface remains usable at the supported 1.0–1.5 profile text scale;
- 44/52/60px target profiles visibly affect AURA's own controls;
- light and dark system appearances remain legible;
- reduced motion removes nonessential AURA animation;
- the icon is recognizable at small size and matches the in-product mark;
- the interface still feels like a browser around a real website, not a dashboard layered over one.
