# 03 — Page Intelligence

## Purpose

The Page Intelligence Engine converts an arbitrary rendered webpage into a compact, stable semantic model that AURA can personalize.

The event requirement is not to perfectly model the entire browser DOM. It is to reliably answer:

- what is this page for?
- what content matters?
- what can the user act on?
- which parts are likely to create friction for this person?
- which real elements can AURA safely target and later restore?

## Core principle

**Rank and summarize; never blindly truncate DOM order.**

A giant navigation bar, repeated product carousel, or feed must not consume the representation before AURA reaches the page's actual task/content.

## Primary source — page preload runtime

The remote PageView preload is the main extraction source.

It runs on every navigation and annotates meaningful targets:

```text
data-aura-id="aura-123"
```

Eligible elements include:

- headings;
- substantial text blocks;
- links and buttons;
- form controls and labels;
- semantic landmarks;
- dialogs;
- meaningful lists/tables;
- images with useful alt text;
- cards/sections with clear visual or semantic boundaries;
- explicit ARIA-role elements;
- significant visible containers.

Do not annotate every wrapper `div`.

### Why runtime-first

The preload can directly produce the fields AURA actually needs while preserving the exact AURA target ID used for later transformation. It avoids mandatory merging of separate DOMSnapshot node indexes back into the actionable runtime model.

## Candidate feature model

For each eligible target, derive a compact feature record:

```ts
interface ElementFeatures {
  auraId: string;
  tag: string;
  role?: string;
  accessibleName?: string;
  text?: string;
  href?: string;
  inputType?: string;
  visible: boolean;
  inViewport: boolean;
  rect?: { x: number; y: number; width: number; height: number };
  fontSizePx?: number;
  fontWeight?: number | string;
  lineHeightPx?: number;
  display?: string;
  position?: string;
  interactive: boolean;
  landmark?: string;
  headingLevel?: number;
  formAssociation?: string;
  textLength: number;
  childCount: number;
  repetitionKey?: string;
}
```

Computed styles should be deliberately limited to fields that influence ranking or transformations.

Do not include password values or arbitrary typed form values.

## Accessible semantics

The runtime should derive what it can from ordinary HTML/ARIA first:

- native element role;
- `role`;
- `aria-label` / `aria-labelledby`;
- associated `<label>`;
- `alt`;
- button/link text;
- heading/landmark structure;
- disabled/expanded/selected state where useful.

### Optional CDP Accessibility enrichment

Use Chromium's Accessibility domain when W2 testing shows it adds meaningful names/roles/state for complex widgets.

Do **not** make a full AX-tree request a precondition for every local PageModel.

The Accessibility domain is experimental, so pin the Electron version and test exactly the methods used.

Reference: https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/

## Screenshot

Capture the visible PageView after initial settle and before deep AI adaptation.

The screenshot is a normal input to multimodal page analysis because visual prominence cannot always be inferred from DOM semantics alone.

DOM/runtime semantics remain primary for actions because they map back to real targets.

Use viewport screenshots for the event baseline; do not build stitched full-page capture until a measured need appears.

## DOMSnapshot — fallback, not default

`DOMSnapshot.captureSnapshot` is available through CDP and can expose flattened DOM/layout/style data.

Use it during W2 investigation or as a targeted fallback when the runtime cannot model an important page pattern, such as a complex shadow/frame/layout case.

Do not permanently add it to every page-analysis critical path without evidence from the real-site matrix that it improves reliability.

Reference: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/

## Page lifecycle

### Navigation start

- invalidate the old PageModel revision;
- cancel/ignore stale AI results;
- preserve user profile and relevant remembered preferences;
- keep session intent only when navigation is part of the same active user goal.

### DOM ready

The page preload is already present. It:

- begins AURA-ID annotation;
- establishes mutation observation;
- emits the first local model when the page is useful enough to inspect.

### Initial settle

Use a bounded quiet-window strategy:

- document ready/DOMContentLoaded;
- short mutation quiet period;
- maximum timeout so SPAs that keep loading cannot stall AURA forever.

Never wait for indefinite network idle.

### Re-analysis

Refresh local PageModel when:

- SPA route changes;
- a major modal/region appears;
- the user asks about newly loaded content;
- meaningful mutation volume crosses a threshold.

Do not call OpenAI for every mutation.

## Stable target IDs

AURA IDs are page-session target identifiers, not permanent identifiers across unrelated reloads.

Rules:

- existing eligible nodes keep the same ID while they remain in the document;
- new eligible nodes receive new IDs;
- removed IDs become invalid;
- AURA never assumes an ID from an old navigation still refers to anything;
- every semantic plan includes the PageModel revision it was produced against.

## Ranking

Start with explainable heuristics and tune against real pages.

Illustrative signals:

```text
+50 inside main/article
+45 interactive form control
+40 heading
+30 visible in viewport
+30 named button/action
+25 landmark/large content region
+20 substantial text block
+20 associated form label
+15 strong visual prominence
+10 large useful region
-20 repeated navigation/list item
-25 utility/offscreen content
-30 tiny decorative target
-40 duplicate text/structure
```

These values are implementation heuristics, not product scores.

## Repetition summarization

Repeated structures are one of the biggest arbitrary-site failure risks.

Detect and summarize patterns such as:

- navigation links;
- product cards;
- feed items;
- table rows;
- footer link groups;
- recommendation carousels.

The compact model may keep a few representative members plus a count/summary instead of sending every repeated node.

## Representation budget

Build a balanced payload by category, not one `slice(N)`.

Guarantee representation for:

- page title/metadata;
- main landmarks/regions;
- visible headings;
- forms and labels;
- important interactive controls;
- substantial text blocks;
- visible-viewport content;
- representative navigation;
- representative repeated structures.

Starting target: roughly **120–200 high-value targets**, adjusted after measuring actual input size and quality.

The model context window is not the reason to send noise. A smaller useful representation is easier to reason over and map back to the page.

## Canonical PageModel

```ts
interface PageModel {
  pageId: string;
  revision: number;
  url: string;
  title: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  regions: PageRegion[];
  elements: PageElement[];
  forms: PageForm[];
  repeatedStructures: RepeatedStructureSummary[];
  visibleAuraIds: string[];
  extractionHealth: ExtractionHealth;
}
```

Screenshot bytes/reference are transported beside the compact PageModel rather than embedded as PageElement data.

`PageModel` is deterministic observation. AI semantic interpretation is separate.

## Semantic AI output

AI may identify:

- page purpose/type;
- primary content;
- primary and secondary actions;
- important facts such as deadlines/prices/status;
- secondary/distraction regions;
- dense text worth simplifying;
- form groups/order;
- likely path for the user's current goal;
- confidence per structural recommendation.

Every actionable target reference must be an AURA ID from the current or still-valid PageModel revision.

## Confidence and fallback

Keep confidence internal.

`extractionHealth` may consider:

- enough semantic targets found;
- heading/main/action structure found;
- forms/labels modeled correctly where present;
- screenshot success;
- mutation/runtime health;
- target IDs valid.

Low confidence causes conservative transformation tiers. It does not produce a user-facing score.

## Dynamic pages / SPAs

The preload maintains IDs and observes mutations.

Listen to Electron navigation events and page-side History API route changes where necessary.

A semantic result for an older revision can be applied only when every referenced target still exists and passes validation; otherwise discard/reanalyze.

## Iframes and shadow DOM

W2 core requirement is the main frame and ordinary open shadow DOM that the runtime can access.

Do not spend W2 on universal cross-origin iframe transformation.

During W7, add targeted frame/CDP handling only for failure patterns that actually appear in the judge-like site corpus.

## Performance goals

Measure rather than assume.

Initial event targets:

- first local usable model: normally < 500 ms after usable DOM;
- deterministic Make This Mine response: perceived < 300 ms after click;
- rich compact model + screenshot ready: normally < 1.5 s on ordinary pages;
- AI runs asynchronously without freezing navigation/UI.

Record measured results during W2/W4.

## W2 acceptance gate

Before W3 onboarding feature work begins, demonstrate Page Intelligence on at least **20 real pages** across the testing categories.

It must reliably identify:

- major headings/regions;
- primary visible controls/actions;
- forms and labels;
- substantial text;
- visible viewport context;
- stable targets that can be highlighted/scrolled/restored.

At least five pages should be chosen **after** the extractor is mostly complete so we are not merely tuning against a fixed corpus.

If extraction is weak, stop and fix extraction. Do not compensate with more elaborate prompts.
