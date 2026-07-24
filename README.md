# AURA Browser

**Adaptive User-Responsive Accessibility**

`main` now contains the canonical judged AURA Browser product.

> **AURA learns how the web works best for you, understands the page you are on, and reshapes that real page around you.**

## Source of truth

Start with **`docs/browser/README.md`**.

For the AURA Browser product line, `docs/browser/` is authoritative. Older extension-era documents are historical/reference material only when the current source of truth explicitly points to them.

Current release state is tracked in **`STATUS.md`**.

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
- **Page intelligence:** ranked runtime DOM/ARIA model + geometry/styles + viewport screenshot; CDP enrichment is an optional fallback, not a required critical-path dependency
- **AI:** OpenAI Responses API called directly from Electron main for the event build
- **Event model:** `gpt-5.6-luna`; page analysis defaults to `medium` reasoning and remains configurable
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
W0  Planning lock — COMPLETE
 ↓
W1  Browser shell — COMPLETE
 ↓
W2  Page Intelligence — COMPLETE
 ↓
W3  Learn Me — COMPLETE
 ↓
W4  Make This Mine — COMPLETE
 ↓
W5  Talk to AURA + memory — COMPLETE
 ↓
W6  Product polish — COMPLETE
 ↓
W7  Judge-proofing / release freeze — CURRENT
```

See `docs/browser/06-IMPLEMENTATION-PLAN.md` for milestone acceptance gates and `STATUS.md` for the current release evidence.

## Existing extension code

The repository also contains the earlier Chrome/WXT extension, capability/profile concepts, reversible transformations, API code, and tests.

That code is **reference/history, not architectural authority for the judged AURA Browser**. Reuse proven logic selectively when it fits the browser architecture; do not reintroduce the old side-panel product or Chrome-extension assumptions wholesale.

## Current state

The AURA Browser has been promoted to `main` through PR #2 after green GitHub CI. Feature scope is frozen. The remaining release work is operational verification on the actual event Mac/network and fixes only for issues that verification reveals.