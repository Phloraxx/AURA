# Hackathon Demo Plan

> **Productization note:** This file preserves the original stable MVP demo path. The canonical final hackathon choreography is now defined in `docs/17-HACKATHON-WOW-IMPLEMENTATION-PLAN.md`, including AURA Fit, AURA Lens, same-page/different-profile adaptation, Task Mode, guided forms, AURA Rescue, the Decision Inspector, and Original/AURA comparison. Use this baseline while those phases are under implementation; use the revised two-minute demo in the new roadmap for final rehearsal.

## Goal

Tell one clear story in under two minutes.

## Demo setup

Prepare:

- extension already installed,
- API running,
- stable demo network or fallback canned AI responses,
- cluttered article fixture,
- three seeded profiles,
- one fresh onboarding profile.

Start the app and repeatable fixture server in separate terminals:

```bash
corepack pnpm dev
corepack pnpm demo:fixtures
```

Load the development or production extension, then open
`http://127.0.0.1:4173/cluttered-article.html`. Keep the mock providers enabled
for the default offline-stable path. Before each rehearsal, click **Undo all**
if adaptations are active and use **Reset demo profiles** to restore the three
seeded profiles.

## Script

### 0:00–0:15 — Problem

Say:

> Most accessibility tools start by asking what disability someone has and then apply a preset. Real people have combinations of needs and preferences. AURA models capabilities instead.

### 0:15–0:40 — Multimodal onboarding

Open first-run setup.

Show:

- Talk with me,
- Chat with me,
- Simple answers,
- Quick setup.

Answer one question by voice.

Say:

> The onboarding itself adapts to the user. It asks about functional difficulty, not medical diagnosis.

### 0:40–0:55 — Capability profile

Show plain-language resulting preferences.

Say:

> Under the hood this becomes a multidimensional capability profile plus explicit preferences.

### 0:55–1:20 — Adapt page

Open cluttered article.

Click **Adapt this page**.

Expected visual changes:

- sidebar/recommendations collapse,
- main article becomes focused,
- typography changes,
- motion reduces,
- primary action becomes obvious.

Say:

> Local rules apply immediately. AI only helps understand semantics such as what is main content or distracting. It never generates code that we execute.

### 1:20–1:40 — Switch profile

Switch to a low-vision profile.

Same page changes differently:

- larger text,
- enhanced contrast,
- stronger spacing,
- less aggressive focus simplification.

Say:

> Same website, different person, different interface. There are no disability-specific modes; the engine composes adaptations.

### 1:40–1:50 — Undo

Click **Undo all**.

Show original site restored.

The side panel's active-adaptation list labels local and semantic changes, so
the audience can see that semantic analysis augments rather than replaces the
offline engine.

### 1:50–2:00 — Close

Say:

> We are not trying to replace websites or diagnose users. We are building a personal adaptation layer for the web: capability profile in, reversible accessible interface out.

## Judge questions

### Is this just an LLM wrapper?

Answer:

> No. The core is a deterministic policy and transformation engine. AI is constrained to onboarding conversation and semantic classification. All DOM changes are local, typed, reversible code.

### Does it work on every website?

Answer:

> Not perfectly. The MVP targets normal DOM-based sites. Canvas/WebGL and highly custom applications require separate handling. We deliberately avoid claiming universal compliance.

### Is the capability vector medically valid?

Answer:

> It is not a diagnostic model. It is a product preference/capability abstraction used to choose interface adaptations. Users can edit all preferences directly.

### What happens to private page data?

Answer:

> The profile is local by default. We extract a compact semantic representation, remove form values/secrets, and only send minimal data when semantic AI is enabled.

### Why a browser extension?

Answer:

> It can adapt existing websites at the user-agent layer without waiting for every site owner to redesign their product.
