# 01 — Experience

## Experience goal

AURA should feel calm, personal, and obvious. The user should never feel that they are operating an accessibility control panel.

The visible product language revolves around only:

- **Learn Me**
- **Make This Mine**
- **Talk to AURA**

## First launch — Learn Me

### Entry

The first screen communicates one idea:

> **Let’s find your comfortable web.**

Primary action:

`Find my comfort`

Secondary:

`Use comfortable defaults`

The required event path is experiential calibration plus one optional
free-text preference. Voice may be added later but must not be implied as
required by the primary flow.

### Design rule

Do not make onboarding an open-ended chatbot interview that can wander.

Use a short deterministic backbone. OpenAI is reserved for converting the
user's optional final note into at most one explicit learned preference.

Target roughly four areas:

1. **Reading comfort** — text size, spacing, detail preference.
2. **Interaction comfort** — control/target size and focus visibility.
3. **Attention/presentation** — motion and simultaneous information density.
4. **Understanding style** — concise vs detailed explanations; preserve technical terms.

The entire judged path should stay around **60–90 seconds**. It must remain
fully useful without the optional note or an OpenAI response.

### Conversation style

Ask one concrete question at a time.

Good:

- “Does this text feel comfortable to read?”
- “Which of these button sizes feels easiest to use?”
- “Would you rather see everything at once or reveal things step by step?”
- “Do moving elements make pages harder to follow?”
- “When I simplify something, should I keep technical terms?”

Avoid:

- diagnosis labels;
- raw capability scores;
- long questionnaires;
- asking the user to understand accessibility terminology.

### Live calibration — first wow moment

The onboarding UI itself changes while the user is answering.

Examples:

- text/spacing update immediately after a reading choice;
- controls resize during the target-size choice;
- a dense and calmer layout can be compared directly;
- a small motion example can be reduced/disabled;
- explanation copy becomes more concise/detailed as the user chooses.

The user should experience AURA learning them before browsing.

### Completion

Show one short human summary, for example:

> I’ll use comfortable text sizing, keep controls easy to reach, reduce unnecessary movement, and simplify dense instructions while keeping technical terms.

Primary action:

`Start browsing`

No numeric disability dashboard.

## Browser shell

The judged browser is deliberately minimal.

Visible chrome:

- back;
- forward;
- refresh;
- address/search field;
- AURA/profile control;
- panel toggle.

Tabs are not required before the flagship flow is stable.

### Default layout

```text
+---------------------------------------------------------------+
| AURA   <  >  reload   Search or enter address...      profile |
+--------------------------------------------------+------------+
|                                                  |            |
|                                                  |   AURA     |
|                 REAL WEBSITE                     |            |
|                                                  |  Ready for |
|                                                  |  this page |
|                                                  |            |
|                                                  | [Make this |
|                                                  |   mine]    |
|                                                  |            |
|                                                  | Ask AURA…  |
+--------------------------------------------------+------------+
```

The panel can collapse; the remote PageView is resized rather than visually covered by the local shell.

## Page-ready state

Do not show a score/dashboard.

When local page understanding is ready:

> **Ready to adapt this page for you.**

Primary action:

`✦ Make This Mine`

Small optional detail:

`What did AURA notice?`

This may show a few human observations, not a separate Lens product.

## Make This Mine

### Perceived sequence

1. User presses the button.
2. Profile-based changes begin immediately.
3. Small calm status: `Understanding what matters on this page…`
4. AI semantic refinement arrives.
5. Status becomes: `Adapted for you`.

Never block the browser behind a full-screen AI spinner.

### Visual result

Depending on the person/page, AURA may:

- improve text scale/spacing/reading width;
- reduce motion;
- enlarge targets/focus visibility;
- emphasize primary content/actions;
- de-emphasize or safely collapse clearly secondary regions;
- surface deadlines/prices/status information;
- simplify selected dense instructions;
- reveal form sections progressively;
- add a compact AURA-owned summary/guidance strip;
- preserve technical detail when preferred.

The visual difference should be obvious, but reliability wins over dramatic DOM surgery.

### Intervention order

AURA should prefer:

1. presentation improvement;
2. emphasis/de-emphasis;
3. safe reversible collapse/text simplification;
4. AURA-owned guidance/summary tied to original controls.

Large-scale arbitrary DOM reparenting is not required for the event build.

### Comparison

After transformation, keep a persistent:

`Original ↔ AURA`

It is both a trust control and a primary demo device.

## Talk to AURA

Conversation is grounded in the current page, profile, session goal, and explicit memory.

The user may type normal language; internally the event build optimizes four action families.

### 1. Adjust

Examples:

- “Make this easier.”
- “Make the buttons bigger.”
- “This is too distracting.”
- “Give me more detail.”

Expected result: page presentation changes.

### 2. Explain

Examples:

- “Explain this.”
- “What does this section mean?”

Expected result: concise personalized explanation, optionally linked/highlighted to real content.

### 3. Goal / Guide

Examples:

- “I’m trying to register.”
- “Help me apply.”
- “I only want to find the price.”

Expected result: AURA identifies the relevant content/controls and guides the user through the actual site.

AURA may scroll, highlight, collapse secondary content, and show the current step. The user still activates consequential original controls.

### 4. Remember

A correction may produce:

> `Remember this preference?`

`Remember` persists it globally. `Just for now` changes only the current session.

Anything else can receive a normal answer without becoming a new mode.

## Memory surface

Provide a small `What AURA remembers` view with readable statements and edit/forget/reset actions.

Global preference memory is required for the event. Per-site memory is secondary.

## Error/fallback states

### AI unavailable

> `Using what I already know about you. Deeper page understanding is temporarily unavailable.`

Keep deterministic adaptation active.

### Low page confidence

> `I can safely improve the presentation here, but this page uses an unusual interface.`

Use conservative transformations only.

### Canvas/WebGL-heavy page

Keep the page functional and use the AURA panel for explanation/guidance rather than pretending the canvas was structurally rebuilt.

## Visual design principles

- quiet neutral palette with one AURA accent;
- strong hierarchy and whitespace;
- large comfortable targets;
- concise copy;
- no dashboard aesthetic;
- no rainbow accessibility toolbar;
- no excessive cards;
- smooth but reduced-motion-aware transitions;
- keyboard-operable primary interactions;
- meaningful VoiceOver semantics for the browser's own UI.

## Stretch items

Only after W7 core gates are green:

- voice input;
- basic multi-tab UI;
- animated split-screen comparison;
- Windows smoke build;
- site-specific auto-memory/auto-adapt polish.

Stretch items never delay random-site reliability or Make This Mine.
