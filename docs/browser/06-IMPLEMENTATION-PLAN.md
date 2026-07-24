# 06 — Implementation Plan

## Rule

Implement one milestone at a time. Every milestone must end in a working state.

Do not add visible features outside **Learn Me**, **Make This Mine**, **Talk to AURA**, or required browser/reliability support.

## W0 — Planning lock

**Status: accepted.**

Locked decisions:

- macOS / Apple-Silicon judged target;
- Electron browser shell;
- one `BrowserWindow` local shell + one remote `WebContentsView`;
- remote AURA runtime as preload;
- runtime-first PageModel + screenshot + selective CDP enrichment;
- direct OpenAI from Electron main for the event;
- GPT-5.6 Luna with high reasoning as the event baseline,
  environment-configurable;
- conservative reversible adaptation tiers;
- four reliable conversation action families;
- real-site testing as a release gate.

Implementation may begin at W1.

## W1 — Browser shell

Goal: AURA can browse ordinary sites in a polished minimal shell.

### Implement

- `apps/browser` scaffold;
- `electron-vite` + Electron + TypeScript + React;
- one local `BrowserWindow` React shell;
- one remote `WebContentsView`;
- shell preload with typed IPC;
- page preload skeleton;
- address/search field;
- back/forward/refresh;
- page title/loading/error state;
- AURA panel open/close with PageView resizing;
- macOS `darwin-arm64` dev/package spike.

Do not implement AI or real adaptation in W1.

### Acceptance

- launch from repository root;
- open Wikipedia, GitHub, one e-commerce page, and the college site;
- remote page is visually separate from trusted local shell;
- back/forward/refresh/address navigation work;
- panel resizing and window resizing are stable;
- page preload executes on navigation and can report URL/title/DOM-ready to main;
- packaged/dev build launches on the event Mac.

Freeze exact Electron/electron-vite versions after this milestone.

## W2 — Page Intelligence

Goal: build reliable actionable understanding before AI UX.

### Implement

- stable `data-aura-id` assignment in page preload;
- semantic candidate extraction;
- geometry + selected computed styles;
- HTML/ARIA/native accessible-name derivation;
- heading/landmark/form modeling;
- repetition detection/deduplication;
- balanced category ranking;
- compact `PageModel`;
- mutation/revision lifecycle;
- viewport screenshot capture;
- optional CDP Accessibility enrichment spike;
- DOMSnapshot diagnostic spike only if needed;
- debug-only PageModel inspector.

### Acceptance gate

- at least 20 real pages tested;
- at least five pages selected late rather than used for tuning;
- identify major regions/headings/actions/forms/labels/substantial text;
- stable target IDs support highlight/scroll;
- no first-N extraction;
- capture latency measured;
- no mandatory CDP feature remains unless its real-site benefit is demonstrated.

**Stop and fix extraction if this gate is weak. Do not compensate with prompt complexity.**

## W3 — Learn Me

Goal: create a useful persistent personalized profile in 60–90 seconds.

### Implement

- first-launch React onboarding;
- deterministic four-area calibration backbone:
  - reading comfort;
  - interaction/target comfort;
  - attention/motion/information density;
  - explanation/detail style;
- text conversation with AI-personalized follow-ups;
- live adaptation of onboarding UI;
- capability/preference model;
- versioned local JSON persistence;
- direct OpenAI `onboardingTurn` provider in Electron main;
- human-readable completion summary;
- reset/re-run path.

Selectively port proven profile logic from extension work where useful, without porting its UI.

### Acceptance

- two intentionally different users/answers produce visibly different resolved preferences;
- onboarding completes in ~60–90 seconds;
- UI visibly changes during calibration;
- profile survives restart;
- no diagnosis labels or raw score dashboard;
- OpenAI failure still leaves a deterministic calibration/profile path.

Voice is not required.

## W4 — Make This Mine

Goal: create the flagship wow moment.

### Part A — immediate deterministic adaptation

Implement:

- Tier 0 presentation profile;
- Original-state/session registry;
- `Original ↔ AURA`;
- text/spacing/width/motion/targets/focus primitives.

### Part B — semantic refinement

Implement:

- compact PageModel serialization;
- screenshot + profile + learned preferences + optional goal;
- direct Responses API `analyzePage` call;
- structured Zod validation;
- Tier 1 emphasize/deemphasize/highlight;
- Tier 2 safe collapse + targeted reversible text simplification;
- Tier 3 summary/task/form guidance strip;
- stale-target/revision rejection;
- low-confidence conservative fallback.

Do not make arbitrary DOM reparenting a success criterion.

### Acceptance

- same real page transforms meaningfully differently for at least two profiles;
- at least 20 real pages survive Make This Mine before polish;
- Original restores without reload;
- local response begins immediately while AI runs;
- important page actions remain usable on the required corpus;
- model timeout leaves useful local adaptation;
- at least five late/random pages produce a useful result with no tuning.

**W4 is the highest-priority milestone. Delay or cut W5+ before shipping W4 half-finished.**

## W5 — Talk to AURA + memory

Goal: natural language changes or guides the real page.

### Required action families

1. **Adjust** — easier/bigger/calmer/more or less detail.
2. **Explain** — explain current content in the user's preferred style.
3. **Goal / Guide** — “I'm trying to…” and guide using original controls.
4. **Remember** — persist an explicit preference.

### Implement

- conversation UI;
- cached page semantic state;
- session intent;
- direct OpenAI `conversationTurn`;
- small adaptation patches;
- task guidance linked to original targets;
- explicit memory proposal/confirmation;
- global learned-preference persistence;
- `What AURA remembers` small editor.

Site-specific memory is secondary. Do not delay this milestone for it.

### Acceptance

- all four action families work across at least three page categories;
- user phrasing does not need to match exact commands;
- conversation does not reanalyze the whole page unless materially needed;
- `Remember` affects a later transformation after restart;
- current task can continue across ordinary navigation when appropriate.

## W6 — Product polish

Goal: make the prototype feel intentionally designed.

No new product capabilities.

Focus on:

- browser chrome proportions;
- typography and spacing;
- icons;
- onboarding copy;
- Make This Mine transition/state;
- AURA panel hierarchy;
- Original/AURA comparison;
- loading/error/fallback states;
- memory summary;
- keyboard behavior;
- reduced-motion behavior;
- VoiceOver semantics;
- removal of debug/developer UI;
- event-screen resolution testing.

### Acceptance

- first-time judge path needs no developer explanation;
- no placeholder/raw JSON/debug UI;
- no clipping/layout break at event resolution;
- clear consistent hierarchy;
- AI latency feels intentional rather than frozen.

## W7 — Judge-proofing / freeze

Goal: breadth, failure recovery, rehearsal. **No new feature work.**

### Activities

- complete 25–30-site real matrix;
- include several never-before-tested sites late in the cycle;
- add regression fixtures for discovered failure patterns;
- harden SPA route changes;
- harden forms/modals/sticky headers;
- test slow/failed OpenAI;
- test Original/AURA repeatedly;
- rehearse judge-chosen-site flow;
- keep local fixture pages only as emergency backup;
- package `darwin-arm64` build;
- freeze dependencies, prompts, schemas, and demo profile backup.

### Stretch only after core W7 passes

- voice input;
- basic tabs;
- site-specific memory polish;
- animated split-screen comparison;
- Windows smoke build;
- optional post-transform AI critique if it demonstrates measured benefit.

## Work allocation for four people

After W1 stabilizes:

### Workstream A — Browser + Page Intelligence

- Electron shell;
- page preload;
- PageModel lifecycle;
- optional CDP;
- screenshots;
- SPA handling.

### Workstream B — Adaptation

- Tier 0–3 primitives;
- original-state registry;
- target validation;
- form/task guidance.

### Workstream C — AI + Memory

- provider/contracts/prompts;
- Learn Me AI;
- page analysis;
- conversation;
- memory persistence.

### Workstream D — UX + QA

- onboarding/browser/panel design;
- accessibility of AURA UI;
- site corpus;
- manual/E2E testing;
- demo choreography.

All work integrates into `aura-browser`. Avoid parallel competing architectures.

## Commit discipline

```text
chore(browser): scaffold Electron shell
feat(browser): add remote WebContentsView navigation
feat(browser): add page preload runtime
feat(intelligence): build ranked PageModel
feat(profile): add Learn Me calibration and memory
feat(adaptation): add reversible presentation tiers
feat(ai): add multimodal page analysis
feat(aura): implement Make This Mine
feat(conversation): add contextual AURA actions
style(browser): polish judged experience
test(browser): harden real-site failures
```

## Change-control question

Before adding anything, ask:

> Does this materially improve Learn Me, Make This Mine, Talk to AURA, or judge-site reliability?

If not, defer it.
