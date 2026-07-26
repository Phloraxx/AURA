# Contributing to AURA

Thank you for helping make the web adapt more comfortably to the person using
it.

## Start with the source of truth

Before changing the current product, read:

1. [`AGENTS.md`](AGENTS.md);
2. [`docs/browser/README.md`](docs/browser/README.md) and its canonical reading
   order;
3. [`STATUS.md`](STATUS.md).

`apps/browser` is the canonical judged product. The numbered documents directly
under `docs/`, `apps/extension`, and `apps/api` describe or support the earlier
extension generation and are historical/reference material when they conflict
with `docs/browser/`.

Material architecture or product-scope changes require an ADR update in
[`docs/browser/08-DECISIONS.md`](docs/browser/08-DECISIONS.md).

## Development philosophy

AURA is an accessibility product. A feature is not complete merely because it
works with a mouse on one developer machine.

All user-facing AURA UI and AURA-owned page UI should be:

- keyboard operable and meaningfully screen-reader labelled;
- understandable without relying on colour alone;
- responsive to the learned text, spacing, target-size, information-density,
  and motion preferences;
- usable at zoom and narrow window sizes without horizontal overflow;
- tolerant of reduced-motion preferences;
- explicit about loading, fallback, memory, and restoration state;
- reversible when it changes the remote page.

## Scope rules

AURA has exactly three first-class experiences:

1. Learn Me;
2. Make This Mine;
3. Talk to AURA.

Do not introduce another named mode. `Scan this page`, Original/AURA, memory,
voice, model status, and judge presets are supporting controls.

Make This Mine and real-site reliability win scope conflicts.

## Pull request checklist

- [ ] The change improves Learn Me, Make This Mine, Talk to AURA, or
      judge-selected-site reliability.
- [ ] TypeScript remains strict and new external boundaries are validated with
      Zod.
- [ ] No API secret is added to source, renderer bundles, screenshots, logs, or
      fixtures.
- [ ] Models return typed plans only; no generated HTML, CSS, or JavaScript is
      executed.
- [ ] New page transformations are idempotent, target-validated, and reversible.
- [ ] Deterministic behavior remains useful when local/cloud AI is unavailable.
- [ ] Standards evidence and personalized AURA Fit remain clearly separated.
- [ ] Relevant unit, fixture, E2E, and real-site tests were added or updated.
- [ ] New UI was checked with keyboard focus, reduced motion, larger profile
      sizing, and meaningful names.
- [ ] Canonical docs, status evidence, and screenshots were updated when
      behavior or architecture changed.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm browser:test:e2e
```

For native packaging:

```bash
pnpm browser:package:mac
```

Real-site release evidence belongs in [`tests/sites.md`](tests/sites.md). Do
not add volatile production-site scraping to CI when a local regression fixture
can capture the failure pattern.
