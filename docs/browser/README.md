# AURA Browser — Source of Truth

This directory is the canonical specification for the AURA Browser product line in `main`.

## Authority

For this product line, `docs/browser/` overrides extension-era documents whenever they conflict. Older documents remain historical reference only.

No implementation decision may silently contradict this source of truth. Material changes must be recorded in `08-DECISIONS.md` first.

## Product in one sentence

**AURA is a personalized accessibility browser that learns how a person comfortably perceives, understands, and interacts with the web, then adapts real webpages around that person and their current goal.**

## The only three first-class experiences

1. **Learn Me** — short conversational + experiential onboarding.
2. **Make This Mine** — personalized transformation of the real page.
3. **Talk to AURA** — natural language adjusts, explains, guides, or explicitly teaches AURA a preference.

Everything else is supporting infrastructure or a small control.

## Locked event architecture

- **Judged platform:** macOS on Apple Silicon (`darwin-arm64`).
- **Host:** Electron/Chromium.
- **UI composition:** one local React `BrowserWindow` + one remote `WebContentsView`.
- **Remote integration:** dedicated page preload in an isolated world.
- **Page intelligence:** ranked runtime DOM model + geometry/styles + viewport screenshot, with selective CDP Accessibility/DOMSnapshot enrichment only when it proves useful.
- **AI:** OpenAI Responses API called directly from Electron main for the event build.
- **Event AI:** `gpt-5.6-luna`; page analysis defaults to medium reasoning and remains configurable. Total event API use must stay within the approximately USD 50 budget.
- **Persistence:** versioned local JSON.
- **Build/dev:** `electron-vite`; Electron Forge only for final packaging.
- **Merge quality:** GitHub Actions must pass lint, typecheck, tests, build, and Electron E2E for PRs into `main`.

## Product-scope rule

A new addition belongs in the event build only if it materially improves at least one of:

- how well Learn Me understands the person;
- how convincingly/reliably Make This Mine transforms a judge-selected page;
- how naturally Talk to AURA changes or guides the real page;
- polish/recovery of that primary flow.

Otherwise defer it.

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
10. `09-DESIGN-SYSTEM.md`
11. `DEFINITION-OF-DONE.md`

`STATUS.md` at repository root records the active milestone and release evidence.

## Current stage

The AURA Browser was promoted to `main` through PR #2 after green GitHub CI. W1 through W6 are implemented and W7 hardening/release work is effectively complete except for the final credentialed OpenAI smoke test on the actual event network/hotspot and any issue that test reveals.

The feature scope is frozen. Only reliability, release, copy, and measured latency fixes belong before the event.

## Research basis

Current architecture was checked against primary documentation:

- Electron `BrowserWindow`: https://www.electronjs.org/docs/latest/api/browser-window
- Electron `WebContentsView`: https://www.electronjs.org/docs/latest/api/web-contents-view
- Electron preload/context isolation: https://www.electronjs.org/docs/latest/tutorial/tutorial-preload and https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron debugger/CDP transport: https://www.electronjs.org/docs/latest/api/debugger
- CDP Accessibility: https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/
- CDP DOMSnapshot: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
- `electron-vite`: https://electron-vite.org/guide/
- Electron packaging recommendation: https://www.electronjs.org/docs/latest/tutorial/application-distribution
- OpenAI model guidance: https://developers.openai.com/api/docs/models and https://developers.openai.com/api/docs/guides/latest-model
- W3C personalization direction: https://www.w3.org/WAI/adapt/

CDP experimental APIs and model behavior are version-sensitive. Pin the event toolchain/model configuration and test the exact operations instead of relying on unverified future compatibility.