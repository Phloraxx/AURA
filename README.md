# AURA Browser

**Adaptive User-Responsive Accessibility**

This branch is a clean product/architecture reset for the judged AURA experience.

> **AURA learns how the web works best for you, understands the page you are on, and reshapes that real page around you.**

## Source of truth

Start here:

**`docs/browser/README.md`**

For the `aura-browser` branch, `docs/browser/` is authoritative. The older extension-era files under `docs/` remain historical/reference material only when the new source of truth explicitly points to them.

Current project state is tracked in **`STATUS.md`**.

## Product scope

AURA has only three first-class experiences for the event build:

### 1. Learn Me

Conversational and experiential onboarding builds a capability-and-preference profile without requiring diagnosis labels.

### 2. Make This Mine

The flagship experience. AURA combines the person, the page, memory, and current intent to transform the real website into a more comfortable personalized presentation.

### 3. Talk to AURA

Natural-language requests modify or guide the current webpage rather than producing a generic chatbot answer.

Examples:

- “Make this easier.”
- “I only want to register.”
- “Explain this.”
- “Keep the technical details.”
- “Make these controls easier for me.”
- “Remember that.”

A persistent `Original ↔ AURA` control proves and reverses the transformation.

## Event target

- **Primary platform:** macOS
- **Browser host:** Electron / Chromium
- **UI:** React + TypeScript
- **Page intelligence:** AURA DOM runtime + Chrome DevTools Protocol DOM/layout + accessibility tree + screenshot
- **AI:** OpenAI through structured server-side/provider contracts
- **Memory:** local-first persistent profile/preferences + site memory + session intent

This is intentionally optimized for a polished one-day judged prototype rather than production browser infrastructure.

## What we are not building

- a Chromium or Firefox engine fork;
- Windows parity before the Mac build is polished;
- a generic AI browser assistant;
- a dashboard full of accessibility modes;
- a password manager, sync system, extension store, updater, or browser ecosystem;
- model-generated replacement websites;
- diagnosis-specific modes such as `ADHD Mode` or `Blind Mode`.

## Architecture direction

```text
                         USER
                          |
                     Learn Me
                          |
                          v
                 Profile + Memory
                          |
                          v
REAL WEBPAGE ---> Page Intelligence <--- Current Goal
                          |
                          v
                     AURA Brain
                    /          \
      immediate local       OpenAI semantic
        adaptation            refinement
                    \          /
                          v
                  validated plan
                          |
                          v
                  Make This Mine
                          |
                          v
                    REAL WEBPAGE
```

The browser shell is only the host. The personalized transformation engine is the product.

## Implementation sequence

Do not skip milestones:

```text
W0  Planning lock
 ↓
W1  Browser shell
 ↓
W2  Page Intelligence
 ↓
W3  Learn Me
 ↓
W4  Make This Mine
 ↓
W5  Talk to AURA
 ↓
W6  Product polish
 ↓
W7  Judge-proofing
```

See `docs/browser/06-IMPLEMENTATION-PLAN.md` for acceptance criteria.

## Existing code

The repository already contains a Chrome/WXT extension, shared capability/profile concepts, reversible transformations, an API, and tests from the earlier AURA direction.

On this branch that code is **reference material, not the architectural source of truth**. Reuse proven logic selectively after its boundary fits the new browser architecture. Do not port the old side-panel product or Chrome-extension assumptions wholesale.

## Current state

Browser implementation has intentionally not started yet. The team should review and lock the new source-of-truth documents before W1 begins.

See `STATUS.md`.
