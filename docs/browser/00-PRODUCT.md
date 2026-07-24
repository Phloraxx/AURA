# 00 — Product

## Vision

The web is usually built once and presented the same way to everyone. AURA changes that relationship.

**AURA learns the person first, then turns each webpage into the version of that page that is easiest for that person to use.**

AURA is designed around capabilities and preferences rather than diagnosis labels. It may learn that someone benefits from larger controls, reduced motion, less simultaneous information, shorter explanations, stronger hierarchy, speech output, or preserved technical detail without requiring the person to identify with a medical category.

## Primary users

People who experience web friction related to vision, motor interaction, cognition, attention, language, hearing, or combinations of these. The product must also remain understandable and useful to people who simply want a calmer or easier browsing experience.

## Product promise

On a normal webpage selected by the user, AURA should be able to:

1. understand enough of the page to identify its structure, content, controls, and likely task paths;
2. combine that understanding with the active user's capability profile, explicit preferences, memory, and current goal;
3. visibly transform the real page while preserving its important functionality;
4. explain or adjust the transformation through conversation;
5. return cleanly to the original presentation.

## Three first-class experiences

### 1. Learn Me

A first-run experiential calibration with one optional conversational note. AURA
shows concrete alternatives and adapts the onboarding UI itself so the user
experiences preferences instead of configuring a medical-style settings form.

Required outcome: a useful persistent profile in roughly 60–90 seconds for a judge.

### 2. Make This Mine

The flagship experience and primary wow factor.

The user opens a real website and chooses **Make This Mine**. AURA immediately applies safe local adaptations, analyzes the page more deeply with AI, then refines hierarchy, clutter, wording, focus, controls, and task presentation for this person.

The same webpage must visibly adapt differently for different profiles.

### 3. Talk to AURA

Conversation is contextual and action-oriented. AURA is not a generic chatbot beside the webpage.

Examples:

- “Make this easier to read.”
- “I only want to register.”
- “Explain this.”
- “Keep the technical details.”
- “Make these controls easier for me.”
- “Remember that.”

The result should be a page change, task guide, explanation, or explicit memory update.

## Supporting controls, not separate products

The following may exist internally or as small supporting UI, but are not separate named modes in the event build:

- accessibility score / AURA Fit,
- Lens,
- Focus Mode,
- Reader Mode,
- Simplify Mode,
- Rescue Mode,
- Task Mode,
- disability presets as user-facing modes.

There is one primary transformation: **Make This Mine**.

## Required comparison control

A persistent, obvious `Original ↔ AURA` control must let the judge compare and restore the page instantly.

## Wow moment

The target demonstration is:

> The judge chooses a normal website we did not prepare. AURA understands the page, the judge presses **Make This Mine**, and the same real website visibly reorganizes around that person's needs. The judge then gives AURA a natural-language goal or correction and the page changes again.

The browser shell is not the innovation. The personalized transformation is.

## Non-goals for the event build

- Building or maintaining a browser engine.
- Production browser security hardening.
- Windows parity before the macOS demo is polished.
- Browser sync, password manager, bookmark ecosystem, extension store, updater, account system, or theme marketplace.
- Perfect support for Canvas/WebGL-only applications.
- Perfect support for every authentication/DRM flow.
- Diagnosing disabilities.
- Training a custom model.
- A large multi-agent orchestration graph.
- Replacing the entire webpage with untrusted model-generated HTML.
- Claiming WCAG certification or universal accessibility.

## Product principles

1. **Capability-first, not diagnosis-first.**
2. **Personalization must be visible.** Two profiles should not receive the same generic result.
3. **AI understands; trusted AURA code transforms.**
4. **Local response first, AI refinement second.** The product must feel immediate.
5. **The real site remains underneath.** Preserve original controls and state wherever practical.
6. **User corrections outrank inference.**
7. **Memory is explicit and inspectable.**
8. **One polished transformation beats ten shallow features.**
9. **Judge-selected-site reliability outranks internal feature count.**

## Success criteria

The event build succeeds when a first-time judge can:

- complete Learn Me without developer assistance,
- open their own normal website,
- use Make This Mine and see a meaningful personalized transformation,
- tell AURA what they are trying to do and see the page respond,
- teach AURA one preference and see it remembered,
- switch back to the original page instantly,
- use the experience without encountering obvious developer/debug UI.
