# 11 — Event Video Identity

## Decision

For the judged macOS build, the visual identity established in the AURA promo-film frames is the canonical event identity.

This document **supersedes the forest/ivory palette and letter-like adaptive-aperture mark described in `09-DESIGN-SYSTEM.md`**, while retaining that document's accessibility, target-size, focus, typography-scaling, and product-clarity rules.

The motion principles in `10-MOTION-PERSONALITY.md` remain valid, but the animated presence mark is now the **AURA Halo** described below.

## Source material

The decision is based on the generated AURA video frames used for the team's promo direction:

- near-black navy/indigo environments;
- violet-to-electric-blue rim light;
- extremely restrained white typography with generous tracking;
- thin luminous circular AURA mark;
- dark floating AURA panels over ordinary websites;
- premium Apple-product-film composition rather than a colorful accessibility toolbar;
- no generic neon "AI" particles, robot/brain imagery, or rainbow effects.

The product should feel like the same AURA shown in the film rather than a separate green application sharing only the name.

## Research basis

The implementation is also checked against current primary guidance:

- Apple HIG — Design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles
- Apple HIG — Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Apple HIG — Feedback: https://developer.apple.com/design/human-interface-guidelines/feedback
- Apple HIG — Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple HIG — Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Perplexity Comet Assistant Panel: https://www.perplexity.ai/help-center/comet/en/articles/11734688-assistant-panel
- Perplexity Comet Inline Assistant: https://www.perplexity.ai/help-center/comet/en/articles/13533742-inline-assistant

Comet is an interaction reference only: persistent contextual presence beside the current page. AURA does not copy Comet's brand or agentic product scope.

## Brand mark — AURA Halo

The event mark is **not a letter A**.

It is a nearly complete luminous ring with a small opening and a cool-blue focus point.

Meaning:

- the ring = one web / one continuous browsing space;
- the opening = adaptation rather than a fixed interface;
- the moving focus point = the person/current goal;
- violet-to-blue light = the established promo-film identity.

The mark should remain recognizable with no wordmark at favicon/Dock size.

Canonical vector sources:

```text
apps/browser/resources/aura.svg
apps/browser/src/renderer/favicon.svg
apps/browser/src/renderer/Brand.tsx
```

The wide-tracked `AURA` wordmark accompanies the Halo only when horizontal space allows.

## Event palette

```text
Canvas                #07060D
Elevated canvas        rgba(12, 10, 22, .90)
Surface                #100E19
Soft surface           #151221
Primary ink            #F7F4FF
Secondary ink          #BBB4CC
Tertiary ink           #9C95AD
Halo violet            #8B63FF
Halo violet light      #B48AFF
Halo blue              #5B8CFF
Focus cyan             #73C9FF
Keyboard focus blue    #78BAFF
Danger                 #FF7780
```

The purple/blue gradient is reserved for AURA state and significant product actions. Ordinary information surfaces stay almost neutral. This preserves hierarchy and prevents the interface from looking like a generic neon AI dashboard.

## Typography

Operational controls remain system sans.

Major headings use SF Pro / system display with lighter optical weight and tighter display tracking. The AURA wordmark uses wide tracking and medium-light weight, echoing the promo-film title treatment.

Do not use the previous editorial serif for event-browser headings; it conflicts with the film identity.

## Material language

Use near-black translucent panels, very thin cool borders, shallow inner highlights, and restrained ambient violet/blue light.

The website remains visually dominant. AURA's chrome and sidecar should feel like a precision layer floating beside the real page, not a dashboard placed over it.

## Motion

The Apple-like motion rule is:

> **State first, spectacle second.**

Use motion to make relationships legible:

- panel open: short decelerating slide/fade;
- message arrival: small vertical fade;
- button press: subtle compression;
- hover: at most a one-pixel lift;
- analysis: Halo brightness/focus point breathes while real work is occurring;
- memory proposal: quiet surface reveal;
- onboarding: one entrance per step;
- Original/AURA: immediate state switch with short surface feedback;
- page-owned AURA summaries/guidance: may enter gently, but must never delay the actual adaptation.

Never introduce artificial typing delay, bounce easing, constant parallax, floating particles, or motion that competes with the remote page.

All spatial/repeating motion must disappear under either system `prefers-reduced-motion` or the person's AURA `reduceMotion` preference. Color, opacity, border, and focus feedback may remain.

## Acceptance criteria

The event UI is ready when:

- a still frame of the browser is immediately recognizable as the same AURA from the promo film;
- the primary mark is a luminous Halo, not a stylized letter A;
- browser chrome, Learn Me, Talk to AURA, memory, and Make This Mine share the same near-black/violet/blue language;
- the page remains the main visual content;
- animations feel brief and physical rather than decorative;
- AURA is visually still when idle and subtly alive only while working;
- reduced-motion users receive no looping/spatial animation;
- keyboard focus remains stronger and clearer than ambient brand glow;
- text and controls retain the profile-driven accessibility sizing rules;
- the visual identity still works when OpenAI is unavailable — branding must not depend on cloud state.
