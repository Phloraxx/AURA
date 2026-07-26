# AURA Documentation

This repository contains two generations of AURA work. The current product is
the **AURA Browser** in `apps/browser`.

## Canonical documentation

[`docs/browser/`](browser/README.md) is the sole source of truth for the current
product. Read it in the order listed in
[`docs/browser/README.md`](browser/README.md).

The canonical set covers:

- product scope and the three first-class experiences;
- Learn Me and the six-area functional support profile;
- Electron/Chromium architecture;
- runtime-first Page Intelligence;
- local Qwen and cloud GPT-5.6 Luna planning;
- trusted, reversible AURA Recompose;
- Talk to AURA, memory, native macOS speech, and transcription;
- automated WCAG evidence and personalized AURA Fit;
- design, motion, the AURA Guide, testing, and release decisions.

The dated implementation and release evidence is maintained in
[`STATUS.md`](../STATUS.md). The real-site compatibility matrix is
[`tests/sites.md`](../tests/sites.md).

## Historical extension documentation

The numbered Markdown files directly under `docs/` describe the earlier WXT
extension and its original API/product plan:

```text
00-PRODUCT-BRIEF.md … 15-PREFLIGHT-REVIEW.md
CODEX-MASTER-PROMPT.md
DEFINITION-OF-DONE.md
```

They are retained as engineering history and as reference for the legacy
`apps/extension` and `apps/api` code. They are **not authoritative** when they
conflict with `docs/browser/`.

## Product media

README screenshots live in [`docs/assets/readme/`](assets/readme/).

The repository also includes:

- an [80-second narrated demo](../artifacts/demo-video/AURA-demo-complete-80s.mp4);
- a [feature-complete silent product tour](../artifacts/demo-video/AURA-feature-complete-silent-master-1080p.mp4);
- the [full narration script](../artifacts/demo-video/AURA-FULL-DEMO-SCRIPT.md)
  and [shot list](../artifacts/demo-video/AURA-FULL-DEMO-SHOT-LIST.md);
- the [live demonstration runbook](../artifacts/demo-video/LIVE-DEMO-RUNBOOK.md);
- the [short-demo plan](../artifacts/demo-video/DEMO-PLAN.md).

## Documentation maintenance rule

When product behavior changes:

1. update the relevant canonical browser document;
2. add or supersede an ADR in
   [`08-DECISIONS.md`](browser/08-DECISIONS.md) for material scope or
   architecture changes;
3. update [`STATUS.md`](../STATUS.md) with verified evidence only;
4. keep the root [`README.md`](../README.md) focused on what the current product
   does and how to run it.
