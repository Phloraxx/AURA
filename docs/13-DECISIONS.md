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
