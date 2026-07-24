# AURA Browser

**Adaptive User-Responsive Accessibility**

This branch is the clean product/architecture reset for the judged AURA experience.

> **AURA learns how the web works best for you, understands the page you are on, and reshapes that real page around you.**

## Source of truth

Start with **`docs/browser/README.md`**.

For `aura-browser`, `docs/browser/` is authoritative. Older extension-era documents are historical/reference material only when the new source of truth explicitly points to them.

Current work is tracked in **`STATUS.md`**.

## Product scope

AURA has exactly three first-class experiences.

### 1. Learn Me

A short conversational + experiential onboarding builds a capability-and-preference profile without requiring diagnosis labels.

### 2. Make This Mine

The flagship. AURA combines the person, the page, explicit memory, and current intent to transform the real website into a more comfortable personalized presentation.

### 3. Talk to AURA

Natural-language requests change, explain, or guide the real webpage rather than behaving like a generic chatbot.

Examples:

- “Make this easier.”
- “Explain this.”
- “I only want to register.”
- “Make the controls bigger.”
- “Remember that.”

A persistent `Original ↔ AURA` control proves and reverses the transformation.

## Locked event target

- **Primary platform:** macOS, Apple Silicon (`darwin-arm64`)
- **Browser host:** Electron / Chromium
- **Local UI:** one React + TypeScript `BrowserWindow`
- **Remote website:** one child `WebContentsView`
- **Remote AURA runtime:** dedicated preload in an isolated world
- **Page intelligence:** ranked runtime DOM/ARIA model + geometry/styles + viewport screenshot, with selective CDP enrichment
- **AI:** OpenAI Responses API called directly from Electron main for the event build
- **Initial model baseline:** `gpt-5.6-terra`, configurable
- **Memory:** local versioned JSON; profile + explicit learned preferences are required
- **Build/dev:** `electron-vite`; Forge only for final packaging

This is intentionally optimized for a polished one-day judged prototype rather than production browser infrastructure.

## What we are not building

- a Chromium or Firefox engine fork;
- Windows parity before the Mac build is polished;
- a generic AI browser assistant;
- a dashboard full of accessibility modes;
- a password manager, sync system, extension store, updater, or browser ecosystem;
- a large multi-agent workflow;
- arbitrary model-generated replacement websites;
- diagnosis-specific modes such as `ADHD Mode` or `Blind Mode`.

## Architecture direction

```text
                         USER
                          │
                       Learn Me
                          │
                          ▼
                 Profile + Memory
                          │
                          ▼
REAL WEBPAGE ───► Page Intelligence ◄─── Current Goal
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
        immediate local        OpenAI semantic
          adaptation             refinement
                │                   │
                └─────────┬─────────┘
                          ▼
                  validated plan
                          │
                          ▼
                   Make This Mine
                          │
                          ▼
                    REAL WEBPAGE
```

The browser shell is only the host. The personalized transformation engine is the product.

## Implementation sequence

```text
W0  Planning lock — ACCEPTED
 ↓
W1  Browser shell — CURRENT
 ↓
W2  Page Intelligence
 ↓
W3  Learn Me
 ↓
W4  Make This Mine
 ↓
W5  Talk to AURA + memory
 ↓
W6  Product polish
 ↓
W7  Judge-proofing / freeze
```

See `docs/browser/06-IMPLEMENTATION-PLAN.md` for acceptance gates.

## Existing code

The repository already contains a Chrome/WXT extension, capability/profile concepts, reversible transformations, an API, and tests from the earlier AURA direction.

On this branch that code is **reference material, not architectural authority**. Reuse proven logic selectively when it fits the browser architecture. Do not port the old side-panel product or Chrome-extension assumptions wholesale.

## Current state

W0 is accepted. **W1 — Browser shell** is ready to implement.
