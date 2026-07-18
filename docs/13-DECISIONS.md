# Architecture Decision Log

Record meaningful architecture changes here. Do not silently reverse decisions.

## ADR-001 — Capability model is not a diagnostic model

**Status:** Accepted

**Decision:** Use six MVP product dimensions plus explicit preferences. Never present scores as medical diagnosis.

**Reason:** The product needs composable signals, while diagnosis inference is unnecessary, risky, and scientifically unsupported by the MVP.

---

## ADR-002 — Separate capability dimensions from preferences

**Status:** Accepted

**Decision:** Store capability estimates separately from concrete interface preferences.

**Reason:** Two users with similar functional capability can prefer different interfaces. Adaptation policy should prioritize explicit preferences.

---

## ADR-003 — AI never directly transforms the DOM

**Status:** Accepted

**Decision:** AI returns structured semantic annotations or constrained profile patches only. Local code performs DOM changes.

**Reason:** Reliability, security, Manifest V3 compatibility, reversibility, and testability.

---

## ADR-004 — Deterministic features come before AI

**Status:** Accepted

**Decision:** Build profile, policy engine, and local reversible primitives before adding model calls.

**Reason:** The extension must remain useful during API failure and must not become an LLM wrapper.

---

## ADR-005 — Preserve host website nodes when possible

**Status:** Accepted

**Decision:** Prefer styling, annotation, collapsing, and conservative wrapping over cloning/replacing interactive elements.

**Reason:** Replacing nodes often loses event handlers and application state.

---

## ADR-006 — Local profile storage for MVP

**Status:** Accepted

**Decision:** Store profiles in `chrome.storage.local`. No user account/database is required.

**Reason:** Privacy, implementation speed, and offline behavior.

---

## ADR-007 — Hono backend with provider adapters

**Status:** Proposed/Accepted for MVP

**Decision:** Use a small Hono TypeScript API with abstract LLM/STT provider interfaces.

**Reason:** Lightweight deployment and provider portability.

Change only if the deployment target creates a concrete blocker.

---

## ADR-008 — Voice STT through backend for MVP

**Status:** Accepted

**Decision:** Use `MediaRecorder` in the extension and a backend STT provider. Browser-native speech recognition is optional, not required.

**Reason:** Avoid hard dependency on inconsistent browser speech recognition support.

---

## ADR-009 — Reversible transformations

**Status:** Accepted

**Decision:** Every adaptation primitive must implement or expose equivalent apply/revert behavior.

**Reason:** User trust, safety, compatibility, and demo quality.

---

## ADR-010 — Inject adaptation logic only after an explicit current-tab action

**Status:** Accepted

**Decision:** Package the adaptation entrypoint as a WXT runtime content script.
Use `activeTab` plus `scripting` to inject it when the user chooses **Adapt this
page** from the side panel. Do not declare a static all-sites content script for
the MVP.

**Reason:** This preserves the explicit user gesture, avoids permanent broad
page access, and still supports deterministic offline adaptation. The side
panel retries message delivery after injection so an already-running content
script is reused rather than duplicated.

---

## ADR-011 — OpenAI Responses adapter with an offline mock default

**Status:** Accepted

**Decision:** Implement `LLMProvider` with an OpenAI Responses API adapter using
strict structured output. Select the adapter only when
`LLM_PROVIDER=openai`; otherwise use a deterministic mock. Keep the model
configurable and default live configuration to `gpt-5.6-luna` as researched on
2026-07-18.

**Reason:** The provider boundary keeps business contracts independent of an
SDK, the live adapter supports schema-constrained profile patches, and the mock
keeps the complete repository testable without secrets or network access.

---

## ADR-012 — Side-panel-owned voice capture with direct API upload

**Status:** Accepted

**Decision:** Capture voice only in the visible side panel after an explicit
user action. Upload the bounded audio blob directly to the fixed AURA speech
endpoint and return only normalized transcript text. Do not send raw audio
through extension runtime messages or persist it in the capability profile.
Use an abstract `STTProvider`, with a deterministic mock as the default and an
OpenAI transcription adapter as an opt-in configuration.

**Reason:** Keeping microphone ownership in the visible UI provides clear
recording state and straightforward cleanup. Direct upload minimizes data
copies and extension-context exposure, while the adapter preserves provider
portability and offline testability.

---

## ADR-013 — Bounded semantic outline with fail-closed local validation

**Status:** Accepted

**Decision:** Build page analysis from at most 80 visible semantic elements
identified by session-local `aura:n*` IDs. Omit URLs, scripts, storage data,
password fields, and every form value. Treat all included page text as
untrusted data. Require strict structured model output, then reject the full
analysis if it references any unknown ID. Apply feature-specific confidence
thresholds locally and exclude locally flagged critical targets from
distraction handling.

**Reason:** A compact outline is sufficient for the MVP classifications while
substantially reducing privacy exposure and payload size. Server-side schema
validation plus independent page-local business validation prevents model
output from becoming executable authority. Failure leaves deterministic
adaptations intact.

---

## ADR-014 — Semantic plans compose locally with the deterministic plan

**Status:** Accepted

**Decision:** Convert validated semantic analysis into a constrained semantic
adaptation plan in the extension. Compose that plan with the already-active
deterministic plan before reconciliation. Each of the four semantic primitives
uses only registered IDs, performs a final local safety check, preserves host
nodes, and implements revert. Text simplification accepts plain text only and
always includes an original/simplified toggle. Skip page analysis entirely when
the profile requests no semantic feature.

**Reason:** Composition prevents optional network or model failures from
removing offline adaptations. Local target resolution keeps model output away
from direct DOM authority, while explicit restore affordances make structural
changes understandable and reversible.
