# Architecture

## System overview

```text
┌────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION                       │
│                                                            │
│  ┌──────────────────────┐     ┌─────────────────────────┐  │
│  │      SIDE PANEL      │     │   BACKGROUND WORKER     │  │
│  │                      │     │                         │  │
│  │ onboarding           │◄───►│ API orchestration       │  │
│  │ profile editor       │     │ permissions/lifecycle   │  │
│  │ calibration          │     │ message routing         │  │
│  │ adaptation controls  │     └────────────┬────────────┘  │
│  └──────────┬───────────┘                  │               │
│             │                              │               │
│             └──────────────┬───────────────┘               │
│                            ▼                               │
│                ┌─────────────────────────┐                 │
│                │      CONTENT SCRIPT     │                 │
│                │                         │                 │
│                │ SemanticExtractor       │                 │
│                │ ElementRegistry         │                 │
│                │ PolicyEngine            │                 │
│                │ TransformEngine         │                 │
│                │ MutationObserver        │                 │
│                └────────────┬────────────┘                 │
│                             │                              │
│                  chrome.storage.local                     │
└─────────────────────────────┼──────────────────────────────┘
                              │ HTTPS
                              ▼
┌────────────────────────────────────────────────────────────┐
│                       SMALL API                            │
│                                                            │
│  POST /v1/onboarding/respond                              │
│  POST /v1/page/analyze                                    │
│  POST /v1/text/simplify                                   │
│  POST /v1/speech/transcribe                               │
│                                                            │
│  Provider adapters: LLMProvider, STTProvider               │
└────────────────────────────────────────────────────────────┘
```

## Runtime responsibilities

### Side panel

Owns:

- onboarding user experience,
- calibration UI,
- profile review/editing,
- adaptation status,
- manual toggles,
- undo/reset actions,
- voice recording controls,
- speech output controls.

Does not directly mutate arbitrary page DOM.

### Background service worker

Owns:

- extension lifecycle events,
- network/API orchestration when appropriate,
- permission flows,
- tab routing,
- messages between side panel and content scripts.

Does not access page DOM.

### Content script

Owns:

- DOM extraction,
- element registry,
- local heuristics,
- adaptation policy execution,
- DOM transformations,
- transformation state needed for revert,
- dynamic-page observation.

### Backend

Owns:

- secrets,
- model-provider calls,
- speech-to-text provider calls,
- JSON-schema/Zod validation,
- rate limiting and payload limits,
- provider normalization.

The backend must never return executable code.

## Monorepo layout

```text
aura/
├── AGENTS.md
├── README.md
├── CONTRIBUTING.md
├── apps/
│   ├── extension/
│   │   ├── entrypoints/
│   │   │   ├── background.ts
│   │   │   ├── adaptive.content.ts
│   │   │   └── sidepanel/
│   │   │       ├── index.html
│   │   │       ├── main.tsx
│   │   │       └── App.tsx
│   │   ├── components/
│   │   │   ├── onboarding/
│   │   │   ├── calibration/
│   │   │   ├── profile/
│   │   │   └── adaptation/
│   │   ├── lib/
│   │   │   ├── adaptation/
│   │   │   │   ├── policy-engine.ts
│   │   │   │   ├── transform-engine.ts
│   │   │   │   └── primitives/
│   │   │   ├── onboarding/
│   │   │   ├── page/
│   │   │   │   ├── semantic-extractor.ts
│   │   │   │   ├── element-registry.ts
│   │   │   │   └── mutation-observer.ts
│   │   │   ├── profile/
│   │   │   ├── storage/
│   │   │   └── voice/
│   │   └── wxt.config.ts
│   └── api/
│       └── src/
│           ├── index.ts
│           ├── routes/
│           ├── providers/
│           └── middleware/
├── packages/
│   └── shared/
│       └── src/
│           ├── profile.ts
│           ├── page.ts
│           ├── adaptation.ts
│           └── api.ts
├── fixtures/
│   ├── cluttered-article.html
│   ├── complex-form.html
│   └── product-page.html
└── docs/
```

## Adaptation sequence

```text
PAGE READY
   │
   ├─► Load local capability profile
   │
   ├─► Create deterministic policy
   │
   ├─► Apply immediate local primitives
   │
   ├─► Extract compact semantic page representation
   │
   ├─► Request optional semantic analysis
   │       └─ failure => continue without semantic adaptations
   │
   ├─► Validate model response against schema and registered IDs
   │
   ├─► Extend policy with semantic adaptations
   │
   └─► Apply/reconcile reversible transformations
```

## Messaging model

Prefer explicit typed message contracts:

```ts
type ExtensionMessage =
  | { type: 'PROFILE_GET' }
  | { type: 'PROFILE_SET'; profile: CapabilityProfile }
  | { type: 'PAGE_EXTRACT' }
  | { type: 'PAGE_ADAPT'; profile: CapabilityProfile }
  | { type: 'PAGE_REVERT' }
  | { type: 'PAGE_STATUS_GET' };
```

Messages must be validated where untrusted or cross-process data enters a subsystem.

## Permission strategy

MVP development may use broad host permissions for speed, but architecture should support two product modes:

1. **Adapt this page** using an explicit user gesture and temporary tab access.
2. **Always adapt allowed sites** using optional host permissions requested with context.

Document actual manifest decisions before release.

## Dynamic pages

Use a debounced `MutationObserver`.

Rules:

- never rescan the full document on every mutation,
- ignore mutations caused by AURA where possible,
- tag adapted elements,
- keep transformations idempotent,
- re-evaluate only affected subtrees,
- cap processing frequency.

## Website compatibility philosophy

Prefer, in order:

1. CSS-variable or scoped style changes,
2. additive ARIA/label annotations,
3. wrapping/collapsing without detaching interactive elements,
4. reordering only when necessary and safe,
5. temporary text replacement with original text preserved,
6. avoid cloning interactive controls unless absolutely necessary.

The more structural a transformation is, the more conservative it must be.
