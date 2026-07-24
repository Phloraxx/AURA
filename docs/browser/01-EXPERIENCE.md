# 01 — Experience

## Experience goal

AURA should feel calm, personal, and obvious. The user should never feel that they are operating an accessibility control panel.

The visible product language revolves around only:

- **Learn Me**
- **Make This Mine**
- **Talk to AURA**

## First launch — Learn Me

### Entry

The first screen should communicate one idea:

> **Let’s make the web work better for you.**

Primary actions:

- `Talk with AURA`
- `Type instead`

A fast `Skip for now` path may create a neutral profile, but it is secondary.

### Conversation style

AURA asks one question at a time. Questions should be experiential and concrete rather than diagnostic.

Good:

- “Does this text feel comfortable to read?”
- “Do moving elements make pages harder to follow?”
- “Which of these button sizes feels easiest to use?”
- “Would you rather see all information at once or reveal it step by step?”
- “When I simplify something, should I usually keep technical terms?”

Avoid:

- “Do you have ADHD?”
- “Are you visually impaired?”
- exposing raw capability scores to the user.

### Live calibration

The onboarding UI should adapt while onboarding is happening.

Examples:

- text scale changes immediately after the user says text is too small;
- spacing changes as the user compares alternatives;
- control size changes during a target-size exercise;
- a dense and a simplified information layout are shown side by side;
- motion can be demonstrated and disabled.

The point is to make personalization tangible before the user even opens a website.

### Completion

AURA gives a short human-readable summary such as:

> I’ll use comfortable text sizing, reduce unnecessary movement, keep important actions obvious, and simplify dense instructions without removing technical terms.

Then:

`Start browsing`

Do not show a dashboard of numeric disability dimensions.

## Browser shell

The macOS event browser should be deliberately minimal.

Visible chrome:

- back,
- forward,
- refresh,
- address/search field,
- AURA identity/profile control,
- an AURA panel toggle.

Basic tab support is optional until the flagship flow is stable.

### Default layout

```text
+---------------------------------------------------------------+
| AURA   <  >  reload   Search or enter address...      profile |
+--------------------------------------------------+------------+
|                                                  |            |
|                                                  |   AURA     |
|                 REAL WEBSITE                     |            |
|                                                  |  page      |
|                                                  |  context   |
|                                                  |            |
|                                                  | [Make this |
|                                                  |   mine]    |
|                                                  |            |
|                                                  | Ask AURA…  |
+--------------------------------------------------+------------+
```

The panel may collapse to give the page more room.

## Page-ready state

AURA should not overwhelm the user with a score or scanner report.

When enough local page information is available, show:

> **Ready to adapt this page for you.**

Primary action:

`✦ Make This Mine`

Secondary affordance:

`What did AURA notice?`

The secondary view can summarize a few observations, but it is not a separate Lens product.

## Make This Mine

### Perceived sequence

1. User presses the button.
2. Immediate local adaptation begins within a fraction of a second.
3. A small calm status appears: `Understanding what matters on this page…`
4. AI refinement arrives and structural changes settle in.
5. Status becomes: `Adapted for you`.

Do not block the entire browser behind a spinner while waiting for AI.

### Visual result

Depending on the profile and page, AURA may:

- improve text scale, line spacing, and reading width;
- reduce animation;
- enlarge or clarify controls;
- de-emphasize or collapse secondary regions;
- surface primary actions and deadlines;
- simplify dense instructions;
- reveal long forms progressively;
- visually group related controls;
- add a compact AURA-owned task/summary strip;
- preserve detailed information when the profile prefers it.

### Comparison

`Original ↔ AURA` must be available after transformation.

The transition should be quick and visually clean. It is both a trust control and a demo device.

## Talk to AURA

Conversation is always grounded in the current page, active profile, current session goal, and relevant memory.

### Supported event intents

The first event build should support a small, polished set:

1. **Ease** — “Make this easier.”
2. **Explain** — “Explain this section.”
3. **Focus on goal** — “I’m trying to register/apply/buy/find…”
4. **Adjust presentation** — “Make this bigger / less distracting / more detailed.”
5. **Guide** — “Help me through this form/task.”
6. **Remember** — “Remember that.”

Anything outside the set may still receive a normal explanation, but these six must change the experience reliably.

### Guidance

When a user states a goal, AURA should guide through the original site's controls rather than pretending to have completed the task.

Example:

> I found the registration form. There are four steps. I’ll keep the current step prominent and leave the other information available when you need it.

AURA can scroll, highlight, collapse secondary content, and explain. The user still activates consequential controls.

## Memory interaction

When the user makes a correction, AURA can offer:

> `Remember this preference?`

Explicit `Remember` writes persistent memory. `Just this page` changes only the current session/site state.

The event UI needs a small `What AURA remembers` view with edit/delete controls, but it should not dominate the main experience.

## Error and fallback states

### AI unavailable

Do not fail the product. Say:

> `Using your saved preferences. Deeper page understanding is temporarily unavailable.`

The local deterministic adaptation remains active.

### Low page confidence

Say:

> `I can safely improve presentation here, but this page uses an unusual interface.`

Apply conservative transformations only.

### Canvas/WebGL-heavy page

Use a companion explanation/task panel rather than pretending the canvas itself has been reconstructed.

## Visual design principles

- quiet neutral palette with one AURA accent;
- large comfortable hit targets;
- no dashboard aesthetic;
- no rainbow accessibility toolbar;
- no excessive cards;
- concise copy;
- smooth but reduced-motion-aware transitions;
- strong hierarchy and whitespace;
- every primary interaction usable by keyboard;
- the browser's own UI must remain accessible with macOS VoiceOver semantics.

## Stretch items

Only after all required flows are polished:

- voice input;
- basic multi-tab UI;
- animated split-screen comparison;
- Windows build.

Stretch items must never delay random-site reliability or Make This Mine.