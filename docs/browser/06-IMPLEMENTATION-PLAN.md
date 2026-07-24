# 06 — Implementation Plan

## Rule

Implement one milestone at a time. Do not jump ahead because a later feature looks exciting.

Every milestone must end with a working, testable state.

## W0 — Planning lock

Goal: freeze the event product before browser code starts.

Required:

- `docs/browser/` reviewed and internally consistent;
- branch target confirmed as macOS;
- exactly three first-class experiences retained;
- Electron shell architecture accepted;
- PageModel and AI contract direction accepted;
- adaptation approach accepted;
- old extension-era docs marked non-authoritative for this branch;
- `STATUS.md` updated to W1-ready.

No browser implementation before W0 is accepted.

## W1 — Browser shell

Goal: AURA can browse ordinary sites in a polished minimal shell.

Implement:

- `apps/browser` scaffold;
- Electron + TypeScript + React tooling;
- `BaseWindow`;
- ChromeView;
- PageView with `WebContentsView`;
- AuraPanelView;
- address bar;
- back/forward/refresh;
- page title/loading state;
- simple error page;
- basic panel open/close;
- dev command and macOS packaging spike.

Do not implement AI or deep adaptation in W1.

Acceptance:

- launch from repo root;
- open at least Wikipedia, GitHub, an e-commerce page, and the college site;
- back/forward/refresh work;
- layout survives window resizing;
- local AURA UI never becomes part of the remote page;
- package/dev launch works on the primary Mac.

## W2 — Page Intelligence

Goal: understand arbitrary rendered pages reliably before building the flagship UI.

Implement:

- AURA page runtime injection;
- stable `data-aura-id` annotation;
- MutationObserver lifecycle;
- CDP attachment;
- DOMSnapshot capture;
- accessibility-tree capture;
- visible screenshot capture;
- candidate features/ranking;
- balanced compact PageModel;
- page revision/invalidation;
- debug-only PageModel inspector.

Acceptance:

- manually validate at least 20 real pages;
- identify headings, major regions, primary controls, forms, labels, and meaningful text;
- stable target IDs can be used for highlight/scroll and survive ordinary local mutations;
- no first-N DOM truncation strategy;
- measured capture latency recorded.

Stop here and fix extraction if it is weak. Do not compensate with prompt complexity.

## W3 — Learn Me

Goal: first-time user gets a real personalized profile.

Implement:

- browser-first onboarding UI;
- conversational text onboarding;
- profile resolution;
- three short calibration experiences: text presentation, control size, information density/motion;
- live adaptation of the onboarding UI;
- local JSON memory store;
- onboarding OpenAI operation;
- concise completion summary;
- reset/re-run onboarding.

Reuse proven capability/profile logic from the extension branch selectively; do not port extension UI.

Acceptance:

- two intentionally different onboarding conversations create visibly different resolved preferences;
- onboarding completes in roughly 60–90 seconds in the demo path;
- restart AURA and the profile persists;
- no raw capability-score dashboard in the primary UX.

Voice is not required in W3.

## W4 — Make This Mine

Goal: create the flagship wow moment.

Part A — deterministic:

- presentation-profile primitive;
- instant text/spacing/width/motion/targets/focus changes;
- Original/AURA session registry and toggle.

Part B — semantic:

- compact PageModel serialization;
- screenshot + profile + memory AI analysis;
- structured validation;
- semantic adaptation plan;
- emphasize/deemphasize/collapse;
- targeted text simplification;
- task/summary strip;
- form grouping/guidance primitives;
- graceful low-confidence fallback.

Acceptance:

- same page visibly transforms differently for at least two profiles;
- transformation works on at least 20 real corpus pages before polish;
- Original restores without reload;
- deterministic response starts immediately while AI runs;
- no broken primary action on the required corpus;
- model timeout leaves a useful local adaptation.

W4 is the highest-priority milestone in the project. Delay later milestones rather than shipping W4 half-finished.

## W5 — Talk to AURA

Goal: conversation changes the real browsing experience.

Implement the six required intents:

1. make easier;
2. explain;
3. focus on a stated goal;
4. adjust presentation;
5. guide through task/form;
6. remember a preference.

Implement:

- conversation UI;
- current page semantic state cache;
- session intent;
- `conversationTurn` API;
- adaptation patches;
- task guidance using original controls;
- memory proposals + explicit `Remember` action.

Acceptance:

- each required intent demonstrated on at least three distinct page categories;
- conversation does not trigger full page re-analysis unless the page materially changed;
- “Remember that” affects a later page/session after restart when appropriate.

## W6 — Product polish

Goal: make the prototype feel designed rather than assembled.

Focus exclusively on:

- browser chrome proportions;
- typography;
- spacing;
- icons;
- empty/loading/error states;
- AURA panel layout;
- Make This Mine transition;
- Original/AURA toggle;
- onboarding copy;
- memory summary;
- keyboard behavior;
- reduced-motion behavior;
- VoiceOver labels;
- animation restraint;
- hiding all debug/developer UI from event builds.

Acceptance:

- first-time flow requires no developer explanation;
- no obvious placeholder copy or raw JSON;
- no layout shift/clipping at the event Mac's expected resolution;
- primary actions have consistent visual hierarchy.

## W7 — Judge-proofing

Goal: improve breadth and recovery, not add features.

Activities:

- complete 25–30-site manual matrix;
- add targeted regression fixtures for discovered failure patterns;
- harden SPA route changes;
- harden forms/modals/sticky headers;
- test slow API and failed API;
- rehearse judge-selected-site flow;
- prepare local fallback fixtures only as backup;
- package the macOS event build;
- freeze dependencies and prompts;
- create demo backup profile/memory file.

Optional only if everything above is green:

- voice input;
- basic tabs;
- split-screen animated comparison;
- Windows smoke build.

## Work allocation for four people

Suggested parallelism after W1 architecture is stable:

### Workstream A — Browser + Page Intelligence

- Electron shell;
- CDP;
- runtime injection;
- snapshots;
- page lifecycle.

### Workstream B — Adaptation

- primitives;
- original-state registry;
- deterministic preferences;
- structural transformation;
- task guidance.

### Workstream C — AI + Memory

- OpenAI contracts/prompts;
- profile memory;
- site/session memory;
- conversation orchestration.

### Workstream D — UX + QA

- onboarding UI;
- browser/panel design;
- accessibility of AURA UI;
- site corpus;
- E2E/manual testing;
- demo choreography.

All work merges into `aura-browser`; avoid long-lived competing architectures.

## Commit discipline

Prefer milestone/subsystem commits:

```text
chore(browser): scaffold Electron shell
feat(browser): add WebContentsView navigation
feat(intelligence): capture DOM and AX page model
feat(profile): add browser onboarding and memory
feat(adaptation): add reversible presentation profile
feat(ai): analyze page with multimodal structured output
feat(aura): implement Make This Mine
feat(conversation): add contextual page commands
style(browser): polish judged experience
test(browser): harden real-site regression cases
```

## Change control

A new visible feature must answer:

1. Which of the three first-class experiences does it improve?
2. What existing work is it more important than?
3. Can it be removed without weakening the core demo?

If question 3 is yes, default to deferring it until W7 is green.