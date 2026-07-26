# 11 — Recompose and Event Media Identity

## Decision

The visual identity established in the AURA promo-film frames is canonical for
the **AURA Recompose presentation and event media**.

It does not replace the everyday common-comfort browser shell defined by
`09-DESIGN-SYSTEM.md` and `13-INCLUSIVE-PERSONALIZATION.md`. The shell uses the
original AURA Guide, warm low-glare surfaces, profile-responsive sizing, and
progressive disclosure. Recompose uses the darker cinematic surface to make
the personalized alternative clearly distinguishable from both the shell and
the original website.

The motion principles in `10-MOTION-PERSONALITY.md` remain valid. The AURA Halo
is the working/refinement mark inside Recompose and media; the AURA Guide is the
human-facing companion in Learn Me and Talk to AURA.

## Source material

The decision is based on the generated AURA video frames used for the team's promo direction:

- near-black navy/indigo environments;
- violet-to-electric-blue rim light;
- extremely restrained white typography with generous tracking;
- thin luminous circular AURA mark;
- dark floating AURA panels over ordinary websites;
- premium Apple-product-film composition rather than a colorful accessibility toolbar;
- no generic neon "AI" particles, robot/brain imagery, or rainbow effects.

The Recompose result and event film should feel like the same AURA, while the
everyday shell remains optimized for the common-comfort baseline.

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

## Recompose mark — AURA Halo

The Recompose/media mark is **not a letter A**.

It is a nearly complete luminous ring with a small opening and a cool-blue focus point.

Meaning:

- the ring = one web / one continuous browsing space;
- the opening = adaptation rather than a fixed interface;
- the moving focus point = the person/current goal;
- violet-to-blue light = the established promo-film identity.

The Halo should remain recognizable with no wordmark at small Recompose/media
sizes. The packaged application icon and common-comfort shell retain the
implemented AURA application artwork defined by the design system.

Canonical vector sources:

```text
apps/browser/resources/aura.svg
apps/browser/src/renderer/favicon.svg
apps/browser/src/renderer/Brand.tsx
```

The wide-tracked `AURA` wordmark accompanies the Halo only when horizontal space allows.

## Recompose and media palette

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

The purple/blue gradient is reserved for active Recompose state and event-media
emphasis. The common-comfort shell continues to use its warm neutral/forest
tokens. This separation preserves hierarchy and prevents the browser from
looking like a generic neon AI dashboard.

## Typography

Operational controls remain system sans.

Major headings use SF Pro / system display with lighter optical weight and tighter display tracking. The AURA wordmark uses wide tracking and medium-light weight, echoing the promo-film title treatment.

Do not introduce a decorative media typeface into operational browser controls.

## Material language

Within Recompose and media, use near-black panels, thin cool borders, shallow
inner highlights, and restrained ambient violet/blue light.

The trusted AURA presentation remains clearly separate from the real page.
Outside Recompose, the browser shell follows the common-comfort material
language rather than this dark media treatment.

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

The identity is ready when:

- a still frame of Recompose is recognizable as the same AURA from the promo
  film;
- the Halo identifies active Recompose/refinement state while the AURA Guide
  remains the single human-facing companion;
- the common-comfort shell and dark Recompose surface look intentionally related
  rather than accidentally inconsistent;
- the original page remains available and the AURA alternative is visually
  unmistakable;
- animations feel brief and physical rather than decorative;
- AURA is visually still when idle and subtly alive only while working;
- reduced-motion users receive no looping/spatial animation;
- keyboard focus remains stronger and clearer than ambient brand glow;
- text and controls retain the profile-driven accessibility sizing rules;
- the visual identity still works when OpenAI is unavailable — branding must not depend on cloud state.
