# AURA Browser — Source of Truth

This directory is the canonical specification for the `aura-browser` branch.

## Authority

For this branch, the files in `docs/browser/` override the older extension-era documents in `docs/` whenever they conflict. Older documents remain historical reference only.

No implementation decision may silently contradict these documents. If the product direction, architecture, scope, or a major technical decision changes, update this source of truth first and record the reason in `08-DECISIONS.md`.

## Product in one sentence

**AURA is a personalized accessibility browser that learns how a person comfortably perceives, understands, and interacts with the web, then adapts real webpages around that person and their current goal.**

## The only three first-class product experiences

1. **Learn Me** — conversational and experiential onboarding that builds a capability-and-preference profile.
2. **Make This Mine** — AURA understands the current page and transforms it around the active user.
3. **Talk to AURA** — natural-language requests modify or guide the real page, with explicit memory when the user asks AURA to remember something.

Everything else is an implementation detail or supporting control. Do not introduce additional named modes unless this document and `00-PRODUCT.md` are deliberately revised.

## Event constraints

- Primary platform: **macOS only** for the judged build.
- Runtime: **Electron + Chromium**.
- This is a one-day-event prototype, so effort is optimized for demo reliability and visible product quality rather than production browser security, distribution, updater infrastructure, or cross-platform polish.
- OpenAI API capacity is not a practical cost constraint for the event; latency and reliability still are.
- The judge may choose an arbitrary normal website. Real-site robustness therefore outranks feature count.

## Reading order

1. `00-PRODUCT.md`
2. `01-EXPERIENCE.md`
3. `02-ARCHITECTURE.md`
4. `03-PAGE-INTELLIGENCE.md`
5. `04-AI-MEMORY.md`
6. `05-ADAPTATION.md`
7. `06-IMPLEMENTATION-PLAN.md`
8. `07-TESTING-DEMO.md`
9. `08-DECISIONS.md`
10. `DEFINITION-OF-DONE.md`

`STATUS.md` at repository root records the current milestone and must be kept current.

## Scope-control rule

A proposed addition belongs in the event build only if it measurably improves at least one of these:

- how well AURA understands the person,
- how convincingly and reliably **Make This Mine** transforms a judge-selected page,
- how naturally **Talk to AURA** changes or guides the real page,
- the polish or reliability of the primary demo path.

Otherwise it is deferred.

## Research basis

The architecture deliberately uses current official platform capabilities:

- Electron `BaseWindow` + `WebContentsView`: https://www.electronjs.org/docs/latest/api/web-contents-view
- Electron `webContents` and debugger/CDP access: https://www.electronjs.org/docs/latest/api/web-contents and https://www.electronjs.org/docs/latest/api/debugger
- Chrome DevTools Protocol DOM snapshots: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
- Chrome DevTools Protocol accessibility tree: https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/
- OpenAI Responses API with text/image input: https://platform.openai.com/docs/quickstart/make-your-first-api-request
- W3C WAI-Adapt personalization direction: https://www.w3.org/WAI/adapt/

The Chrome DevTools Protocol tip-of-tree contains experimental domains and is not backwards-compatible by guarantee. We therefore pin Electron and test the exact APIs used by the event build rather than assuming future CDP compatibility.