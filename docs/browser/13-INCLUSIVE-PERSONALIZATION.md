# Inclusive Personalization, OOBE, and Page Scan

Status: accepted source of truth for the inclusive-personalization revision.

## Product rule

AURA does not create disability modes or diagnose a person. It learns a
combination of functional support needs and interaction preferences, then
adapts the web to that combination.

The six functional areas remain:

1. visual;
2. auditory;
3. motor and precision;
4. cognitive and executive processing;
5. attention and sensory load;
6. language and comprehension.

These dimensions can overlap, vary by context, and change over time. AURA
stores the resulting support profile, not a medical label.

## Learn Me: bounded AI-led interview

Learn Me is a conversation, not a settings wizard.

- The AURA Guide asks one short question at a time.
- The user always has large, explicit response choices and may add their own
  words.
- The AI may change question order, wording, acknowledgement, and follow-up
  based on previous answers.
- The deterministic six-area question bank is the reliable fallback.
- Every area must be covered; the AI may not infer an unanswered need.
- The normal path is at most eight questions and should finish in about two
  minutes.
- Questions ask about web tasks and comfort. They are not clinical tests and
  must never be presented as validated diagnosis or screening.
- The interface previews useful changes while the interview progresses.
- The final profile is explained, editable, stored locally, and may be reset.

Question responses use a functional continuum:

- no difficulty;
- some difficulty;
- a lot of difficulty;
- cannot reliably;
- not sure.

The wording is informed by the Washington Group functional-question pattern,
adapted specifically to web use. AURA does not claim that this adaptation is
the official Washington Group Short Set.

## The AURA Guide

The guide is an original inline SVG tree-sprite owned by AURA. It is not a
licensed character, a copy of Groot, or a remote third-party asset.

It has a small set of meaningful states: welcoming, asking, listening,
thinking, celebrating, guiding, and needs attention. Motion is quiet,
state-based, and stops when it has communicated its meaning. When reduced
motion is requested or detected, state changes remain visible without
animation. The guide never replaces clear labels and instructions.

## Scan this page

`Scan this page` is a supporting control within Make This Mine, not a fourth
first-class experience.

The scan presents:

1. factual **Automated WCAG 2.2 A/AA evidence**;
2. passed, failed, and needs-review rule counts;
3. issue severity, affected-location counts, and human-review requirements;
4. a separate **AURA Fit** heuristic personalized to the active support
   profile.

WCAG evidence is not reduced to a percentage. WCAG conformance is not a
weighted score, and a ratio of passed Axe rules can hide the impact of one
failure repeated across many controls. The UI reports that evidence directly,
for example:

```text
1 serious automated failure
79 affected controls
1 check needs human review
Conformance: not determined
```

### AURA Fit

AURA Fit is a supporting, explainable heuristic out of 100. It is not a WCAG
score, certification, diagnosis, or first-class mode.

It has five visible dimensions whose maxima total 100:

- interaction — 25;
- visual comfort — 25;
- focus — 20;
- understanding — 15;
- task simplicity — 15.

The deterministic calculation uses the ranked PageModel, automated WCAG
evidence, affected-location prevalence, and active six-area support profile.
Signals include control size/naming, text size/spacing, information density,
repetition, dense text, form labeling, task-control load, and relevant
automated standards failures.

An active AURA presentation may add bounded support credit only for changes
trusted code actually activated: presentation settings, Recompose, validated
local target selection, or validated semantic changes. Every dimension exposes
the evidence and applied support that produced its number.

Incomplete/manual-review outcomes lower the displayed evidence confidence but
are not silently treated as failures.

When Make This Mine begins, AURA preserves the latest original-page result (or
captures one before transforming), then automatically scans the active AURA
presentation after local and semantic refinement settle. The comparison shows:

- the original and adapted AURA Fit;
- resolved automated rule failures;
- remaining failures;
- newly introduced failures;
- manual-review items.

AURA never invents standards failures or transformation evidence for demo
effect. If the personalized presentation improves AURA Fit without changing an
automatically testable WCAG outcome, the UI says so explicitly.

## Common-comfort browser UI

The default AURA shell is system-first, low-glare, and deliberately calm:

- 16 px minimum body text;
- 14 px minimum supporting text, used sparingly;
- approximately 1.5 line height;
- 48 px default primary targets;
- visible 3 px keyboard focus;
- colour is never the only state cue;
- one dominant action per region;
- progressive disclosure for technical detail;
- no more than three peer cards visible in a decision group;
- responsive reflow and no horizontal scrolling at narrow widths;
- all decorative motion respects `prefers-reduced-motion`.

The cinematic event palette may be used in media and optional presentation
surfaces, but it no longer overrides the browser's everyday comfort baseline.

## Evidence boundary

Automated tools cannot determine WCAG conformance on their own. W3C cognitive
guidance also includes useful supplemental design objectives beyond
conformance. AURA therefore keeps three concepts separate:

- factual standards-derived automated evidence;
- profile-specific likely barriers;
- personal comfort preferences.

AURA Fit is the explicit bridge between the latter two. Its formula and
dimension evidence remain inspectable and must never be described as WCAG
conformance.
