# AURA Browser Status

**Primary branch:** `main`

**Integration:** PRs #8–#10 are merged into `main`. The current local
judge-hardening pass reconciles the conversation, Recompose, voice,
and design work before one focused integration commit.

**Current milestone:** W7 — Judge-proofing / release freeze

**Product state:** Learn Me, full-page AURA Recompose, Talk to AURA, explicit memory, local Qwen acceleration, cloud refinement, voice input/output, native packaging, automated rehearsal, and repository CI are implemented. Feature scope is frozen; only measured event-smoke bugs may be changed.

## Primary product

AURA has exactly three first-class experiences:

1. **Learn Me** — short capability/preference calibration with persistent local profile.
2. **Make This Mine** — immediate full-page AURA Recompose of the real website, followed by local and cloud refinement.
3. **Talk to AURA** — Adjust, Explain, Goal/Guide, explicit Remember, push-to-talk dictation, and optional short spoken replies grounded in the current page.

`Original ↔ AURA` is mandatory and restores without page reload or loss of underlying page/form state.

## Event target

- macOS on Apple Silicon (`darwin-arm64`)
- Electron `43.2.0`
- one trusted React `BrowserWindow`
- one remote `WebContentsView`
- isolated remote page preload
- `electron-vite` for development/build
- Electron Forge for native packaging
- local Ollama fast path using `qwen3.5:4b-mlx`
- OpenAI deep refinement using `gpt-5.6-luna`

The packaged app path is:

```text
apps/browser/out/AURA-darwin-arm64/AURA.app
```

## AURA Recompose

`Make This Mine` no longer treats the website's original layout as sacred. AURA preserves the website's meaning, state, and real actions while rendering a trusted alternative interface above the original page.

The event build exposes four non-diagnostic judge presets plus the person's learned profile:

- **Clear & Calm** — fewer simultaneous choices and quieter hierarchy;
- **Easier to See** — large reflowed content and high-visibility controls;
- **Easy to Control** — large explicit controls and generous spacing;
- **Step by Step** — progressive disclosure with one clear stage at a time;
- **My profile** — the person's Learn Me profile and remembered preferences.

The visible transformation is progressive:

```text
Make This Mine
      ↓
deterministic Recompose appears immediately
      ↓
local Qwen chooses/prioritizes real page targets
      ↓
GPT-5.6 Luna can add deeper semantic/goal refinement
      ↓
ready
```

Only complete schema-validated plans are applied. Model output never supplies executable HTML, JavaScript, or CSS.

## Page Intelligence

Implemented and verified:

- stable page-session AURA target IDs;
- runtime-first DOM/ARIA extraction;
- headings, landmarks, forms/labels, geometry, selected styles, viewport state;
- repetition detection, deduplication, balanced ranking instead of first-N truncation;
- open Shadow DOM support;
- SPA/hash/history revision handling;
- screenshot capture;
- stale page/revision rejection;
- CDP Accessibility/DOMSnapshot enrichment remains an optional fallback; the verified event baseline does not depend on it.

The real-site matrix is maintained in `tests/sites.md` and contains 27 sites across articles/news, commerce, universities, government/public services, technical documentation, forms, SPAs, listings, and public-information sites.

The original matrix verified local personalized adaptation/restoration across all 27. The final event smoke must now specifically exercise the new full-page Recompose experience on arbitrary dense pages such as a marketplace/listing page.

## AI configuration

Event budget: approximately **USD 50**.

Cloud:

```text
OPENAI_MODEL=gpt-5.6-luna
AURA_PAGE_REASONING_EFFORT=medium
AURA_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

Local:

```text
AURA_LOCAL_MODEL=qwen3.5:4b-mlx
AURA_OLLAMA_URL=http://127.0.0.1:11434
AURA_LOCAL_CONTEXT=8192
AURA_LOCAL_CONVERSATION=1
AURA_CONVERSATION_PROVIDER=cloud
```

The local model remains the Recompose structural planner and the offline Talk to
AURA fallback. Talk to AURA uses OpenAI first on the event Mac, then local
Ollama, then deterministic guidance. Schema-valid replies that discard an
explicit interface request are rejected. Conversation adjustments and goals
regenerate the visible Recompose surface instead of modifying only the hidden
original page. Local requests retain compact balanced context and an explicit
8192-token window.

GPT-5.6 Luna remains the deeper multimodal provider. Page analysis defaults to medium reasoning because earlier high-reasoning runs produced useful plans but materially higher latency. `high` remains an environment override for the final event comparison.

OpenAI failure never removes the deterministic/local interface.

## Voice

Event voice scope is intentionally small and reliable:

- push-to-talk microphone recording in Talk to AURA;
- transcription through `gpt-4o-mini-transcribe` after the person stops recording;
- transcript enters the same existing Talk to AURA pipeline as typed input;
- optional short spoken replies use the browser/macOS speech-synthesis surface;
- installed enhanced/premium voices are preferred, the person can choose a
  voice, and that choice is remembered locally;
- the existing AURA Halo reflects honest listening, transcribing, thinking,
  speaking, remembering, idle, and error states;
- starting a new dictation stops any currently spoken AURA reply.

The packaged app includes `NSMicrophoneUsageDescription`. Electron session permission handling explicitly allows audio media only for AURA's trusted local shell and denies arbitrary remote-page media requests.

## Automated verification

GitHub Actions is a merge gate for PRs into `main` and pushes to `main`.

CI performs:

```text
frozen-lockfile install via Corepack
lint
typecheck
unit/integration tests
build all applications
Electron Playwright E2E under Xvfb
```

The current unit/integration suite contains **141 passing tests** across Browser, shared package, API, and legacy extension, with two live-provider browser tests skipped unless explicitly enabled. Electron E2E covers clean launch, Learn Me, judge Recompose presets, full-page Recompose presence, request-driven visible Recompose changes, Step by Step progression, Talk to AURA, Remember, navigation/session intent, Original restoration, restart/persistent memory, and serious/critical Axe checks.

The latest event-Mac hardening pass additionally verified:

- live Ollama `0.32.3` with `qwen3.5:4b-mlx`, including a real
  schema-validated structural plan and an in-app
  **On-device refinement ready** state;
- Ollama JSON mode plus application-side schema validation for the MLX runner;
- persistent `Show on original page` behavior synchronized with the shell's
  `Original ↔ AURA` control;
- a quieter Comet-like contextual sidecar and flatter Recompose hierarchy,
  visually inspected in the running Electron app;
- stale-response guards so an older local refinement cannot replace a newer
  preset and conversation output cannot target an outdated PageModel revision;
- OpenAI-first Talk to AURA with local/offline fallback and requested-effect
  validation, measured at about 3.1 seconds for the live Luna goal request;
- visible conversation-driven Recompose regeneration for presentation
  adjustments and goal guidance;
- 44px minimum voice controls and race-safe spoken-reply state;
- a newly packaged and launched ad-hoc-signed `darwin-arm64` application;
- lint, all typechecks, 141 unit/integration tests, all builds, and all three
  Electron E2E journeys passing on the event Mac.

PR #8's final CI run completed successfully before merge.

## Portability and packaging

Repository scripts invoke pnpm through Corepack so a clean machine does not require a separately exposed global `pnpm` binary. Electron Forge performs its own package-manager lookup, so the macOS packaging script prepends the repository's `scripts/corepack-bin/pnpm` shim and still resolves the pinned Corepack pnpm version.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm browser:package:mac
```

The final design/package pass successfully cross-packaged the `darwin-arm64` bundle and verified that the `.app` embeds the generated AURA icon. Execution, microphone permission, local Qwen latency, and live voice/API behavior on the actual Mac remain part of the manual event smoke test.

## Event launcher

After packaging:

```bash
corepack pnpm browser:event
```

The launcher prompts for a temporary `OPENAI_API_KEY` when one is not already present, defaults to `gpt-5.6-luna`, and defaults page analysis to medium reasoning.

No OpenAI key is committed to the repository.

## Design identity

The judged build uses the AURA promo-film identity: near-black indigo surfaces, restrained violet/blue light, the AURA Halo, system-display typography, short physical microinteractions, and a profile-aware reduced-motion path.

The design contracts are documented in:

- `docs/browser/09-DESIGN-SYSTEM.md`
- `docs/browser/10-MOTION-PERSONALITY.md`
- `docs/browser/11-VIDEO-IDENTITY.md`

Recompose/voice architecture is documented in `docs/browser/12-RECOMPOSE-VOICE.md`.

## Remaining release gate

Only one manual operational gate remains:

> Run the packaged `AURA.app` on the actual event Apple-Silicon Mac with the installed `qwen3.5:4b-mlx`, a real temporary OpenAI key, microphone permission, and the event Wi-Fi or planned hotspot.

Exercise at minimum:

```text
Learn Me
→ dense arbitrary site / marketplace
→ Clear & Calm Recompose
→ Easier to See Recompose
→ Step by Step Recompose
→ Original
→ local Qwen warm-path latency check
→ Talk to AURA by keyboard
→ push-to-talk dictation
→ spoken AURA reply
→ Remember
→ navigation with goal preserved
→ Original restoration
```

During that run, compare page reasoning `medium` with `high` on one difficult page. Keep `medium` unless `high` produces a clearly better judged result worth the extra latency/API usage.

Any bug found by that smoke test may be fixed. No additional product modes or unrelated features should be added.

## Source of truth

Read `docs/browser/README.md` first, then follow its reading order. `docs/browser/08-DECISIONS.md` records accepted architecture/release decisions and `docs/browser/12-RECOMPOSE-VOICE.md` records the final Recompose/local-AI/voice event architecture.
