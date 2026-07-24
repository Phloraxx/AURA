# AURA Browser Status

**Primary branch:** `main`

**Integration:** PR #2 (`aura-browser` → `main`) merged successfully after green GitHub CI.

**Current milestone:** W7 — Judge-proofing / release freeze

**Product state:** W1 through W6 are implemented. W7 hardening, real-site coverage, native packaging, automated rehearsal, and repository CI are complete. Feature scope is frozen.

## Primary product

AURA has exactly three first-class experiences:

1. **Learn Me** — short capability/preference calibration with persistent local profile.
2. **Make This Mine** — immediate deterministic adaptation plus validated semantic refinement of the real page.
3. **Talk to AURA** — Adjust, Explain, Goal/Guide, and explicit Remember interactions grounded in the current page.

`Original ↔ AURA` is mandatory and restores without page reload.

## Event target

- macOS on Apple Silicon (`darwin-arm64`)
- Electron `43.2.0`
- one trusted React `BrowserWindow`
- one remote `WebContentsView`
- isolated remote page preload
- `electron-vite` for development/build
- Electron Forge for native packaging

The packaged app path is:

```text
apps/browser/out/AURA-darwin-arm64/AURA.app
```

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

The real-site matrix is maintained in `tests/sites.md` and currently contains 27 sites across articles/news, commerce, universities, government/public services, technical documentation, forms, SPAs, listings, and public-information sites.

All 27 have verified local personalized adaptation and successful Original restoration. Live semantic-AI evidence exists for representative late/random sites.

## AI configuration

Event budget: approximately **USD 50**.

```text
OPENAI_MODEL=gpt-5.6-luna
AURA_PAGE_REASONING_EFFORT=medium
```

The flagship page-analysis call defaults to medium reasoning because earlier high-reasoning W4 runs produced good plans but typically took roughly 10–24 seconds. The effort is externally configurable, so `high` can be restored for the event without a code change if the final live Mac test shows a material quality regression.

Onboarding and conversation retain their already-verified reasoning settings until measured evidence justifies a change.

OpenAI failure never removes deterministic adaptation.

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

The established local suite contains 113 passing unit/integration tests plus Electron E2E coverage. The E2E journey covers clean launch, Learn Me, Make This Mine, Talk to AURA, Remember, navigation/session intent, Original restoration, restart, persistent memory, and serious/critical Axe checks.

PR #2's final CI run completed successfully before merge.

## Portability fix

Repository scripts invoke pnpm through Corepack so a clean machine does not require a separately exposed global `pnpm` binary. Electron Forge performs its own package-manager lookup, so the macOS packaging script prepends the repository's tiny `scripts/corepack-bin/pnpm` shim; Forge still resolves the pinned Corepack pnpm version instead of depending on a global install.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm browser:package:mac
```

The final hardening pass successfully cross-packaged the `darwin-arm64` bundle and verified that the `.app` embeds the generated AURA `.icns` byte-for-byte. Execution on the actual Mac remains part of the manual event smoke test.

## Event launcher

After packaging:

```bash
corepack pnpm browser:event
```

The launcher prompts for a temporary `OPENAI_API_KEY` when one is not already present, defaults to `gpt-5.6-luna`, and defaults page analysis to medium reasoning.

No OpenAI key is committed to the repository.

## Release hardening and design pass

The final audit-driven pass closes the remaining product-story gaps without expanding the event into new modes:

- flagship page analysis now receives the active session goal;
- preserved goals can continue across navigation and guide matching original controls;
- task guidance exposes a current `Step X of N` and one current original-page target;
- AURA's trusted shell now honors resolved text scale, line spacing, interaction target size, information density, and reduced-motion preference;
- `Original → conversational adjustment → semantic refinement` keeps the adaptation session state synchronized;
- explicit requests to keep technical details remove active additive simplifications for the current page;
- “Use comfortable defaults” now applies the same comfortable choices shown in Learn Me;
- screenshot privacy checks cover all supported contenteditable spellings;
- page-preload readiness is cached per document in Electron main, replayed to a
  remounted shell, and invalidated only when a full main-frame navigation
  begins; Electron regression coverage now exercises both shell reload and
  remote-page refresh;
- the app has one AURA visual identity across native icon, favicon, browser wordmark, panel mark, and custom interface glyphs;
- light/dark appearance, keyboard focus, reduced motion, and profile-sized controls are part of the shell design system.

The design contract is documented in `docs/browser/09-DESIGN-SYSTEM.md`.

## Remaining release gate

Only one manual operational gate remains:

> Run the packaged `AURA.app` on the actual event Mac with the real temporary OpenAI key using the event Wi-Fi or planned hotspot, then exercise Learn Me → arbitrary real site → Make This Mine → Talk to AURA → Remember → Original.

During that run, compare the default page reasoning (`medium`) with `high` on at least one difficult page. Keep `medium` unless `high` produces a clearly better judged result worth the added latency and API usage.

Any bug found by that smoke test may be fixed. No new features should be added.

## Source of truth

Read `docs/browser/README.md` first, then follow its reading order. `docs/browser/08-DECISIONS.md` records accepted architecture/release decisions.
