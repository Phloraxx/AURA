# 07 — Testing and Demo

## Primary acceptance test

The most important test is not a fixture.

> **A judge chooses a normal website that the team did not prepare, AURA loads it, understands enough of it to personalize, Make This Mine visibly improves the experience, Talk to AURA can act on a goal/correction, and Original restores the page.**

Everything else exists to make that moment reliable.

## Test layers

### 1. Unit tests

Use Vitest for:

- profile/preference resolution;
- memory schema/migrations;
- PageModel ranking and deduplication;
- adaptation-plan validation;
- target validation;
- original-state registry;
- task-step validation;
- AI output parsing;
- URL/navigation helpers.

### 2. Deterministic browser fixtures

Keep a small fixture suite representing failure patterns rather than product demos:

- dense article with repeated nav;
- long application form;
- e-commerce product page;
- dynamic SPA route;
- modal/sticky-header page;
- poorly labelled controls;
- nested sections/tables;
- page with large secondary recommendations.

These make CI repeatable.

### 3. Electron integration tests

Use Playwright Electron support or an equivalent stable test harness chosen in W1.

Automate critical flows where practical:

- browser launches;
- URL navigation works;
- PageView loads fixture;
- page runtime injects once;
- Make This Mine applies deterministic changes;
- Original restores;
- panel and browser controls remain usable;
- navigation invalidates old page targets.

### 4. Real-site manual matrix

This is mandatory because the judge will use the real web.

Maintain `tests/sites.md` with 25–30 pages across categories.

Suggested categories, not fixed domains:

| Category | Minimum pages | What it tests |
|---|---:|---|
| Article/news/blog | 4 | reading hierarchy, clutter, long text |
| E-commerce/product | 4 | primary action, price/specs, recommendations |
| University/college | 4 | dated layouts, dense nav, notices, forms |
| Government/public service | 3 | forms, complex wording, hierarchy |
| Documentation/technical | 3 | dense technical text, preserve terminology |
| Forms/application | 3 | labels, grouping, progressive guidance |
| SPA/dashboard | 3 | dynamic routes and DOM mutation |
| Search/listing | 2 | repeated cards/results, ranking |
| Miscellaneous judge-like page | 2 | breadth |

Do not optimize all tests around the same framework or layout.

## `tests/sites.md` format

Each row records:

```text
URL/category
Loads
PageModel healthy
Primary content correct
Primary action correct
Deterministic adaptation
AI refinement
Talk-to-AURA goal
Original restore
Major bug
Last tested commit
```

Use simple PASS / PARTIAL / FAIL values.

## Minimum real-site gates

### Before W3

20 pages must produce a useful PageModel.

### Before W5

20 pages must survive Make This Mine with no catastrophic loss of primary content/actions.

### Before event freeze

25–30 pages tested manually on the actual event Mac.

Target event quality:

- >= 90% load/navigation success on corpus;
- >= 85% useful personalized transformation;
- 100% Original restore on required demo corpus;
- no known crash on the prepared event path.

These are internal engineering targets, not accessibility claims.

## Profiles for testing

Use capability-driven test profiles, not diagnosis labels.

At minimum:

### Profile A — visual/interaction support

- larger text;
- larger controls;
- clear focus;
- retain information density.

### Profile B — attention/cognitive support

- lower information density;
- reduced motion;
- progressive disclosure;
- concise language.

### Profile C — language/detail preference

- clearer phrasing;
- preserve technical terms;
- strong hierarchy;
- moderate visual changes.

The same page must produce visibly different plans for A/B/C.

## AI test modes

Support three configurations.

### `mock`

Deterministic CI and fixture tests.

### `live`

Real OpenAI provider for development and final event build.

### `offline/failure`

Simulated timeout/unavailable API to verify local deterministic adaptation remains useful.

The event API budget is approximately USD 50. Record request usage, avoid
duplicate analysis, and test latency/failure even when the remaining budget is
comfortable.

## Performance logging

Development builds should record timings without exposing them in event UI:

- DOM ready → runtime injected;
- page capture duration;
- PageModel creation duration;
- AI request duration;
- click Make This Mine → deterministic first paint;
- AI response → semantic adaptation applied.

Keep a simple median/p95 log during W7.

## Regression rule

Every important real-site failure that can be reduced to a stable HTML pattern should create a local regression fixture/test.

Do not write tests that scrape a volatile production site in CI unless there is a compelling reason.

## Event demo choreography

Target 3–4 minutes.

### 1. Learn Me — ~45–60 seconds

Start from a clean demo profile.

Show:

- conversation;
- one or two live calibration changes;
- short profile summary.

Do not spend the entire demo onboarding.

### 2. Judge-selected website — ~20 seconds

Say:

> “Please give us a normal website to try.”

Navigate there.

AURA reaches ready state.

### 3. Make This Mine — ~30–60 seconds

Press the button.

Show immediate local shift followed by semantic refinement.

Use `Original ↔ AURA` once so the difference is obvious.

### 4. Talk to AURA — ~45 seconds

Use a goal relevant to the page:

> “I only want to apply.”

or

> “Help me find what I need to buy this.”

Then a correction:

> “Keep the technical details.”

Show the page respond.

### 5. Memory — ~20 seconds

Say:

> “Remember that.”

Confirm memory succinctly. If time allows, navigate to another page and show the preference reused.

### 6. Close — ~10 seconds

Return to Original and summarize:

> “AURA is not one accessibility mode. It learns the person, understands the page, and adapts the same web differently for each individual.”

## Failure recovery

### OpenAI slow

Local adaptation is already visible. Continue explaining while status says `Understanding what matters…`.

### OpenAI unavailable

Continue with deterministic profile adaptation and say deeper page understanding is temporarily unavailable.

### Weird page / low confidence

Apply conservative presentation adaptation and use Talk to AURA for explanation/highlighting rather than aggressive collapse.

### Website blocks embedded browser behavior

Have two known public backup domains ready, but do not lead with prepared fixtures unless necessary.

### App crash

Keep a packaged build and a development launch path tested on the Mac before judging.

## Event freeze

At least one day before the event, or as early as the schedule permits:

- freeze Electron/OpenAI SDK versions;
- freeze prompts;
- stop adding features;
- clear debug logs from visible UI;
- package the event build;
- back up the repository and memory/profile seed;
- rehearse from clean launch three times;
- rehearse with at least three websites not used during development that day.
