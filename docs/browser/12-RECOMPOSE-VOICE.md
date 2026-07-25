# 12 — AURA Recompose, Progressive Adaptation, Local AI, and Voice

## Why this exists

The previous event build could personalize typography, spacing, motion, emphasis, and selected semantic regions. That was reliable, but it still looked too much like the original website. On dense marketplaces such as Fiverr, the result did not communicate AURA's core idea strongly enough.

The event bar is now:

> **Preserve the website's meaning and real actions, not its layout.**

`Make This Mine` must be capable of presenting a substantially different interface for different people while continuing to operate the real website underneath.

## Judge presets

The event build exposes four non-diagnostic example profiles alongside the person's own Learn Me profile:

1. **Clear & Calm** — fewer simultaneous choices, one-column hierarchy, secondary information deferred.
2. **Easier to See** — larger reflowed content, stronger hierarchy, high-visibility controls.
3. **Easy to Control** — large explicit controls, generous separation, minimal precision-dependent interaction.
4. **Step by Step** — progressive disclosure with one clear stage/action at a time.

These are demonstrations of needs, not medical modes. The fifth option is **My profile**, which uses Learn Me.

## Recompose architecture

```text
real website
   │
   ├── DOM / ARIA / geometry / controls
   │
   ▼
PageModel
   │
   ├──────── deterministic first plan ────────┐
   │                                           │
   ├──────── local Qwen structural plan ──────┤
   │                                           │
   └──────── GPT-5.6 Luna refinement ─────────┤
                                               ▼
                                      validated RecomposePlan
                                               │
                                               ▼
                                       AURA Recompose UI
                                               │
                                               ▼
                                         action bridge
                                               │
                                               ▼
                                      original real controls
```

The original page remains loaded and retains form state. AURA renders a trusted alternative presentation above it. Recompose actions reference stable `data-aura-id` targets and activate/focus/scroll the corresponding real page elements.

The original website's arbitrary layout is **not** treated as sacred. Meaning, content, state, and functionality are.

## Page archetypes

The first implementation intentionally uses a small design grammar:

- `listing` — marketplaces, search results, directories, result grids;
- `article` — articles, documentation, policy/information pages;
- `form` — application, registration, checkout-like forms;
- `detail` — product/service/course/detail pages;
- `dashboard` — control-heavy application pages;
- `general` — safe fallback.

A small number of trusted archetypes produces a designed interface more reliably than asking an LLM to generate arbitrary HTML.

## Progressive transformation

Do **not** wait for every AI call before showing value.

The visible sequence is:

```text
Make This Mine
      ↓
Focus            deterministic, immediate
      ↓
Reshape          deterministic RecomposePlan appears
      ↓
Personalize      local Qwen plan reorders/prioritizes real targets
      ↓
Refine           cloud semantic facts/goal guidance arrive when available
      ↓
Ready
```

The AI output itself is not streamed into executable DOM. Only complete, schema-validated plans are applied. The *experience* streams through safe stages.

When supported by Chromium, plan swaps may use the same-document View Transition API. Never perform a network wait inside a View Transition callback.

Primary reference: https://developer.chrome.com/docs/web-platform/view-transitions/same-document

## Local model

The fast structural provider targets the model already installed for the event Mac:

```text
qwen3.5:4b-mlx
```

through local Ollama at:

```text
http://127.0.0.1:11434
```

Environment overrides:

```text
AURA_OLLAMA_URL
AURA_LOCAL_MODEL
```

The provider must:

- use structured JSON output;
- use low/no thinking for latency;
- use temperature `0`;
- keep the model warm (`keep_alive: -1`);
- receive a compact ranked PageModel rather than the entire DOM;
- return only target IDs and structural decisions, not executable HTML/JS;
- fall back instantly when Ollama/model is unavailable.

Ollama primary references:

- https://docs.ollama.com/api/introduction
- https://docs.ollama.com/api/chat
- https://docs.ollama.com/capabilities/structured-outputs
- https://docs.ollama.com/api/usage
- https://docs.ollama.com/faq
- https://ollama.com/library/qwen3.5/tags

The current Ollama library lists `qwen3.5:4b-mlx` as an MLX build for Apple Silicon.

## Cloud refinement

GPT-5.6 Luna remains the deep multimodal refinement provider for the event build. It can add validated page purpose, important facts, simplifications, primary targets, and goal guidance after the local interface is already usable.

The local model is a latency layer, not a replacement for the existing cloud validation architecture.

## Voice

Voice is an input/output layer around the existing Talk to AURA pipeline. It does not introduce a second AI brain.

### Input

Event scope is **push-to-talk dictation**, not an always-listening/full-duplex voice agent.

Flow:

```text
microphone
  ↓
MediaRecorder
  ↓
OpenAI transcription
  ↓
transcript in composer
  ↓
existing Talk to AURA request
```

The baseline implementation uses `gpt-4o-mini-transcribe` after the person stops recording because it is simple, low-cost, and uses the existing OpenAI key. A future enhancement may replace it with `gpt-realtime-whisper` transcript deltas without changing Talk to AURA.

Primary OpenAI references:

- https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe
- https://developers.openai.com/api/docs/models/gpt-realtime-whisper
- https://platform.openai.com/docs/api-reference/realtime

### Output

Spoken feedback uses the browser/macOS speech synthesis surface so no second cloud round trip is required. Spoken responses are intentionally short confirmations/guidance, while the visual page remains primary.

Examples:

- “Done. I kept the three options that matter.”
- “Start with your student ID. I’ll guide you one step at a time.”
- “Got it. I’ll keep technical terminology.”

Speech can be stopped immediately when the user starts dictating again.

Voice output must respect the person's reduced-motion/interaction preferences conceptually: it is optional, never blocks the page, and never becomes the only feedback channel.

## Safety and reversibility

- Local/cloud models return typed plans only.
- Every target ID is validated against the current PageModel.
- Recompose never stores or executes model-generated HTML/JS.
- Original/AURA must remain reversible without reload.
- Underlying form values and page state must survive toggles.
- When an AURA Recompose action cannot safely resolve a real target, it becomes a scroll/focus fallback rather than inventing an action.
- Recompose is removed on navigation/pagehide and recreated from the next page's model.

## Event acceptance criteria

AURA is ready when all of the following are true:

- the same arbitrary page looks materially different under at least three judge presets;
- Fiverr/search/listing pages no longer remain a lightly restyled grid;
- the first useful visible change begins immediately after `Make This Mine`;
- local Qwen failure still leaves a convincing deterministic Recompose interface;
- cloud failure still leaves the local/deterministic interface usable;
- `Original` restores the real website without reload and without losing form state;
- every Recompose action maps to a real current-page target;
- push-to-talk fills the existing Talk to AURA composer and can submit normally;
- AURA can speak a short assistant reply and can be interrupted;
- reduced-motion preferences disable spatial Recompose transitions;
- CI remains green for lint, typecheck, tests, build, and Electron E2E.
