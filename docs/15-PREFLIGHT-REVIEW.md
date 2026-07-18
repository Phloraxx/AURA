# Pre-Implementation Review

Reviewed: 2026-07-18

This document records corrections and implementation guardrails found in a second architecture pass before coding begins. Where this file is more specific than earlier docs, follow this file.

## Verdict

The architecture is feasible and ready for implementation. The following details must be handled explicitly to avoid common Chrome-extension and privacy mistakes.

## 1. Network calls must respect extension execution contexts

Chrome content scripts remain subject to the page's same-origin policy for network requests. Extension pages and the extension service worker may make cross-origin requests to explicitly permitted hosts.

Therefore use this routing:

```text
Side panel ───────────────► AURA API
  onboarding / STT / text    direct extension-origin fetch

Content script ─► Background service worker ─► AURA API
  page analysis     JSON message                fixed API client
```

Rules:

- The content script must never be allowed to ask the background worker to fetch an arbitrary URL.
- The background worker owns a fixed/configured AURA API base URL.
- Add the API origin to `host_permissions` for development/production as appropriate.
- Use HTTPS outside localhost development.
- Use `credentials: 'omit'` for AURA API requests unless a future authenticated design explicitly requires credentials.

## 2. Do not send audio Blobs through chrome.runtime messaging

Chrome extension message passing uses JSON serialization. A `Blob`, `MediaStream`, function, DOM node, or similar object is not a safe message payload.

For voice onboarding:

1. record audio in the side panel,
2. upload the audio directly from the side panel to `/v1/speech/transcribe`,
3. receive text,
4. feed the text into the onboarding state machine.

Do not route raw audio through `chrome.runtime.sendMessage`.

## 3. Separate local page context from the network payload

Earlier data-model docs include `origin` and `pathname` in `PageRepresentation`. These may be useful locally, but the semantic AI endpoint does not need them by default.

Implement two concepts:

```ts
interface LocalPageContext {
  title: string;
  origin: string;
  pathname: string;
  language?: string;
}

interface NetworkPageRepresentation {
  version: 1;
  title: string;
  language?: string;
  elements: PageElementSummary[];
}
```

Default behavior:

- keep URL/origin locally,
- omit origin, full URL, query string, and pathname from AI requests,
- never include fragment identifiers,
- never include form values.

Only add site identity to a future endpoint if there is a concrete feature that requires it and the privacy model is updated.

## 4. Capability scores recommend; explicit preferences win

The policy engine must not repeatedly convert a low capability score into an adaptation that the user explicitly turned off.

Use this precedence:

```text
explicit user override
        >
calibration choice
        >
onboarding recommendation
        >
capability-derived recommendation
        >
default
```

Recommended architecture:

```text
Capability dimensions
       │
       ▼
Recommendation resolver
       │
       ├── suggested preferences
       │
Explicit preferences / overrides
       │
       ▼
Resolved Adaptation Preferences
       │
       ▼
Policy Engine + Page Signals
       │
       ▼
Adaptation Plan
```

The runtime policy engine should consume **resolved preferences**, not invent arbitrary capability thresholds throughout the codebase.

Keep threshold/recommendation logic centralized and testable.

## 5. MVP dimension-to-feature coverage

The six dimensions are a product abstraction. They do not all have equal feature coverage in the hackathon MVP.

| Dimension | MVP signals/adaptations |
|---|---|
| Visual | text scale, line spacing, reading width, enhanced contrast |
| Motor | larger targets, spacing, stronger keyboard focus |
| Cognitive | simpler language, clearer controls, focused content |
| Attention | reduced motion, focus mode, distraction collapse |
| Language | simpler language and terminology clarification |
| Auditory | controls whether speech output is useful/preferred; arbitrary media caption generation is **not** an MVP promise |

Do not imply that the MVP automatically captions or transcribes all website video/audio. Treat that as post-MVP work.

## 6. Accessible-name extraction is heuristic

Do not assume there is a simple content-script API that returns the browser's final computed accessible name for every element.

For MVP, implement an `AccessibleNameHeuristic` that checks, conservatively:

1. `aria-label`,
2. referenced `aria-labelledby` text,
3. associated `<label>` text for form controls,
4. `alt` for images,
5. visible control text,
6. `title` as a last-resort signal.

Call the field `accessibleNameHint` internally if needed to avoid implying full Accessibility Tree equivalence.

Never overwrite a non-empty reliable accessible name automatically.

## 7. Simplification must not destroy interactive inline content

Do not replace the `textContent` of a paragraph/container that contains links, buttons, form controls, or meaningful inline semantics.

For `simplifyText`:

- operate on plain leaf text blocks where possible,
- otherwise show simplified text in a separate reversible companion container,
- always preserve access to the original,
- never simplify high-stakes text automatically.

## 8. Sensitive-page behavior

Semantic AI analysis should be initiated by an explicit user adaptation action in the MVP, not silently on every page load.

Before sending a page snapshot:

- omit all input values,
- omit password fields entirely,
- omit hidden fields,
- omit URLs and query strings,
- cap element/text counts,
- consider skipping semantic AI by default on pages dominated by password/payment/authentication flows.

Deterministic local adaptations should still work on those pages.

## 9. Manifest baseline for the Chrome MVP

At minimum, plan for:

- Manifest V3,
- `sidePanel` permission,
- `storage` permission,
- `activeTab` permission,
- `scripting` permission if using user-triggered runtime injection,
- AURA API origin in `host_permissions`,
- explicit side panel entrypoint/default path,
- an extension action that opens the side panel.

Set and document a minimum Chrome version consistent with the Side Panel API used. The Side Panel API is available in Chrome 114+; if implementation uses a newer method, raise the minimum accordingly.

For the hackathon, broad page access may be temporarily used for development, but production architecture should prefer explicit/current-site access.

## 10. WXT structure check

The planned WXT paths are valid:

```text
entrypoints/background.ts
entrypoints/adaptive.content.ts
entrypoints/sidepanel/index.html
```

For a user-triggered content script, WXT supports runtime registration/execution. Verify the generated manifest and permission warnings rather than assuming runtime registration automatically yields least-privilege permissions.

## 11. Side-panel ownership of voice is intentional

`MediaRecorder` and user-facing microphone state belong in the side panel, not the Manifest V3 service worker.

The service worker can terminate when idle and has no DOM. Do not make it own a long-lived recording session.

## 12. Recommended first coding milestone

Before any LLM integration, prove this exact flow:

```text
Open fixture page
      ↓
Open AURA side panel
      ↓
Choose Demo Profile A
      ↓
Adapt this page
      ↓
Local reversible transformations apply
      ↓
Undo all
      ↓
Choose Demo Profile B
      ↓
Same page adapts differently
```

Once this works with the API completely offline, the project's core architecture is validated.

## Sources checked during this review

Primary documentation checked on 2026-07-18:

- Chrome Extensions — Side Panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Chrome Extensions — Cross-origin network requests: https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- Chrome Extensions — Message passing and JSON serialization: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- Chrome Extensions — Permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Chrome Extensions — Scripting API: https://developer.chrome.com/docs/extensions/reference/api/scripting
- WXT — Entrypoints: https://wxt.dev/guide/essentials/entrypoints
- WXT — Content scripts: https://wxt.dev/guide/essentials/content-scripts
- WXT — Scripting: https://wxt.dev/guide/essentials/scripting
