# 03 — Page Intelligence

## Purpose

The Page Intelligence Engine converts an arbitrary rendered webpage into a compact, stable semantic model that AURA can personalize.

This replaces the extension-era strategy of taking a small prefix of matching DOM elements. The event build must reason about the page as a whole while still fitting within practical latency and model context limits.

## Design principle

**Rank and summarize; do not blindly truncate DOM order.**

A large navigation bar, product carousel, or repeated feed must not consume the representation before AURA reaches the page's real task/content.

## Inputs

### 1. AURA DOM runtime

The injected runtime marks relevant elements with stable IDs:

```text
data-aura-id="aura-123"
```

Eligible elements include:

- headings;
- paragraphs/text blocks;
- links;
- buttons;
- form controls and labels;
- landmarks;
- lists/tables where meaningful;
- images with useful alt text;
- dialogs;
- likely cards/sections;
- elements with explicit ARIA roles;
- significant visible containers.

Do not annotate every wrapper `div`.

### 2. DOMSnapshot

Use `DOMSnapshot.captureSnapshot` for a flattened DOM/layout view with a deliberately small computed-style list.

Initial style whitelist:

- `display`
- `visibility`
- `opacity`
- `position`
- `font-size`
- `font-weight`
- `line-height`
- `color`
- `background-color`
- `overflow`
- `cursor`

Add fields only when a transformation or scoring rule needs them.

CDP reference: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/

### 3. Accessibility tree

Use `Accessibility.getFullAXTree` or a narrower partial query after a W2 spike confirms performance.

Useful attributes include:

- role;
- accessible name;
- value/state where relevant;
- hierarchy;
- ignored state;
- focusability/interaction semantics.

The Accessibility domain is experimental, so the exact Electron/CDP version used for the demo must be pinned and tested.

Reference: https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/

### 4. Screenshot

Capture the visible PageView after load/settle and before deep adaptation.

The screenshot is supporting visual context, not the sole representation. DOM/AX semantics remain primary because they map back to actionable elements.

A second screenshot may be captured after adaptation for local/debug comparison or an optional AI critique pass, but this is not required for W4 completion.

## Page lifecycle

### Navigation start

- invalidate the previous PageModel;
- stop/debounce pending AI results for the old URL;
- preserve the user's persistent profile and relevant site memory.

### DOM ready

- inject the AURA runtime;
- establish stable AURA IDs;
- start mutation observation.

### Initial settle

Wait for one of:

- load completion plus a short quiet window;
- DOM ready plus a bounded timeout for SPAs.

Do not wait indefinitely for network idle because modern pages may keep connections open.

### Re-analysis

Trigger lightweight refresh when:

- SPA route changes;
- a major modal/page region appears;
- the user explicitly asks AURA about newly loaded content;
- DOM mutation volume crosses a threshold.

Do not rerun full OpenAI analysis on every mutation.

## Candidate feature model

For each eligible element, derive local features such as:

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
  interactive: boolean;
  landmark?: string;
  headingLevel?: number;
  formAssociation?: string;
  textLength: number;
  childCount: number;
}
```

Do not include password values or arbitrary typed form values in the AI representation.

## Ranking

The initial heuristic should reward elements likely to carry semantic or task value.

Illustrative scoring, to be tuned with tests:

```text
+50 inside main/article
+40 interactive form control
+35 heading
+30 visible in viewport
+25 primary landmark
+25 button/link with accessible name
+20 substantial visible text block
+15 explicit ARIA role
+15 associated form label
+10 large visual area
-20 repeated navigation/list item
-25 visually hidden/offscreen utility content
-30 tiny decorative container
-40 duplicate text/structure
```

Do not treat these numbers as product truth. They are an implementation heuristic and must be tuned against the real-site corpus.

## Representation budget

Do not use one flat `slice(N)`.

Build a balanced payload with category quotas, for example:

- page metadata;
- top landmarks/regions;
- all important visible headings up to a cap;
- primary forms and controls;
- top text blocks;
- top interactive actions;
- representative navigation;
- repeated structures summarized rather than repeated;
- viewport-local elements guaranteed representation.

Initial target: roughly **120–200 high-value nodes**, adjusted after measuring latency/context size.

## Canonical PageModel

The output consumed by AURA Brain should resemble:

```ts
interface PageModel {
  pageId: string;
  url: string;
  title: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  pageKindHint?: string;
  regions: PageRegion[];
  elements: PageElement[];
  forms: PageForm[];
  visibleAuraIds: string[];
  screenshot?: ScreenshotRef;
  revision: number;
}
```

`PageModel` is local deterministic observation. AI output is separate.

## AI semantic analysis output

AI may classify:

- page purpose/type;
- primary content regions;
- primary/secondary actions;
- important deadlines/prices/status information;
- secondary/distraction regions;
- complex text worth simplifying;
- form groups and likely order;
- likely task paths;
- confidence per structural recommendation.

All target references must be AURA IDs present in the current PageModel revision.

Stale IDs or revision mismatches are rejected.

## Dynamic pages

The AURA runtime maintains IDs for existing elements and assigns IDs to newly eligible elements.

A meaningful mutation increments the PageModel revision. AI results created for an older revision may still be used only if every referenced target still exists and passes validation.

For SPAs, listen to navigation events plus injected `history.pushState`/`replaceState`/`popstate` observation where required.

## Iframes

W2 requirement: correctly model the main frame.

W7 hardening: add same-origin and CDP-visible subframe support where it materially improves the site corpus. Cross-frame transformations must never be required for the core demo.

## Confidence/fallback

AURA Brain should receive a local `pageConfidence` derived from basic model health:

- enough semantic nodes found;
- main/heading/action structure present;
- screenshot available;
- runtime IDs healthy;
- no catastrophic extraction error.

Low confidence does not create another user-facing score. It simply causes AURA to use more conservative transformation primitives.

## Performance targets

Targets are event goals, not guarantees:

- runtime injection/initial local model: < 500 ms after usable DOM on ordinary pages;
- deterministic Make This Mine response: perceived within 300 ms after click;
- full page model capture: normally < 1.5 s;
- AI refinement should stream/status visibly rather than freeze the UI.

Measure these during W2/W4 and record actual results in `STATUS.md` or test artifacts.

## W2 acceptance criteria

Before onboarding or new UI work proceeds, Page Intelligence must be demonstrated on at least 20 real pages across the categories in `07-TESTING-DEMO.md` and must reliably identify:

- page title/purpose hints;
- major headings/regions;
- primary visible controls;
- forms and labels;
- substantial text blocks;
- stable IDs that can be targeted and restored.

If this is not reliable, do not hide the problem by adding more AI prompts. Fix extraction first.