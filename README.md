# AURA

**Adaptive User-Responsive Accessibility**

**AURA** is a browser extension that adapts websites to the individual capabilities and interaction preferences of the person using them.

> Accessibility should not begin with a diagnosis label. It should begin with what a person can comfortably perceive, understand, and control.

AURA builds a multidimensional capability profile through accessible multimodal onboarding and optional calibration tasks. It then combines deterministic adaptation primitives with conservative AI-assisted page understanding to personalize websites in real time.

## MVP thesis

The MVP proves one vertical slice:

1. A user completes onboarding through text, voice, keyboard, or pointer.
2. The system creates a capability profile without diagnosing the user.
3. The user opens a webpage and selects **Adapt this page**.
4. The extension extracts a compact semantic representation of the page.
5. A deterministic policy engine combines the user's needs.
6. Local reversible DOM transformations are applied immediately.
7. Optional AI analysis identifies page semantics such as primary content, distractions, ambiguous controls, and text worth simplifying.
8. The same webpage adapts differently when the active profile changes.

## Product principles

- **Capability-first, not diagnosis-first.** Never require a medical label.
- **Multimodal from the first screen.** Onboarding must itself be accessible.
- **AI understands; local code transforms.** Never execute AI-generated JavaScript or HTML.
- **Composable adaptations.** No `ADHDMode`, `BlindMode`, or `DyslexiaMode` architecture.
- **Reversible by design.** Every transformation must support `apply()` and `revert()`.
- **Useful without AI.** Deterministic adaptations must work offline or when the API fails.
- **Privacy by default.** Store capability profiles locally and minimize page data sent to servers.
- **Preserve website functionality.** Remodel the interface; do not rebuild the application from scratch.

## Proposed stack

- WXT
- Chrome Manifest V3
- React
- TypeScript with strict mode
- Zod
- Hono for the small backend API
- Provider abstractions for LLM and speech-to-text
- Vitest for unit tests
- Playwright for browser/integration tests

## Development

### Prerequisites

- Node.js 20.12 or newer (Node 20.20.2 is the current verified baseline)
- Corepack, included with the supported Node.js distribution
- Chrome 114 or newer

Install the entire workspace from the repository root:

```bash
corepack pnpm install
```

Run the repository quality gates:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Start the extension development server and local API together:

```bash
corepack pnpm dev
```

The API listens on `http://localhost:8787` by default and exposes
`GET /health`. Copy `.env.example` to `.env` when provider configuration is
introduced; provider secrets must remain in the API process.

The default `LLM_PROVIDER=mock` keeps onboarding offline and deterministic. To
exercise live adaptive onboarding, configure the API process with:

```dotenv
LLM_PROVIDER=openai
OPENAI_API_KEY=your_backend_only_key
OPENAI_MODEL=gpt-5.6-luna
AURA_ALLOWED_ORIGINS=chrome-extension://your-unpacked-extension-id
```

Never prefix provider keys with `WXT_PUBLIC_`; WXT public variables are bundled
into the extension. The API client falls back to local onboarding if the server
is unavailable or returns invalid data.

### Load the production build in Chrome

1. Run `corepack pnpm build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select `apps/extension/.output/chrome-mv3`.
6. Click the AURA toolbar action to open `sidepanel.html`.

The generated manifest is Manifest V3 and currently requests `storage`,
`activeTab`, `scripting`, and `sidePanel`, plus localhost API access for
development.

## Read this repository in this order

1. `AGENTS.md`
2. `docs/00-PRODUCT-BRIEF.md`
3. `docs/01-MVP-SCOPE.md`
4. `docs/02-ARCHITECTURE.md`
5. `docs/03-DATA-MODEL.md`
6. `docs/04-ONBOARDING-CALIBRATION.md`
7. `docs/05-ADAPTATION-ENGINE.md`
8. `docs/06-AI-CONTRACTS.md`
9. `docs/07-API-CONTRACTS.md`
10. `docs/08-SECURITY-PRIVACY.md`
11. `docs/15-PREFLIGHT-REVIEW.md`
12. `docs/09-RESEARCH.md`
13. `docs/10-IMPLEMENTATION-PLAN.md`
14. `docs/11-TESTING.md`
15. `docs/12-DEMO.md`
16. `docs/13-DECISIONS.md`
17. `docs/14-OPEN-QUESTIONS.md`
18. `docs/DEFINITION-OF-DONE.md`

Codex should start from `docs/CODEX-MASTER-PROMPT.md` after reading the documentation above.

## Non-goals for the hackathon MVP

- Guaranteeing that every website becomes fully accessible.
- Replacing screen readers or other assistive technologies.
- Diagnosing disabilities from user behavior.
- Training a custom ML model.
- Rebuilding arbitrary web applications from generated HTML.
- Supporting complex Canvas/WebGL applications perfectly.
- Creating a complete Chrome Web Store production release before the demo works.

## Demo promise

The winning demo is simple:

> Three users. One webpage. Three clearly different adaptations, all produced by the same capability-driven engine.
