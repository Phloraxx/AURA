# Contributing

## Development philosophy

AURA is an accessibility product. A feature is not complete merely because it works with a mouse on the developer's machine.

All user-facing extension UI should be:

- keyboard operable,
- screen-reader labelled,
- understandable without relying only on color,
- usable at high zoom,
- tolerant of reduced-motion preferences,
- large enough for users with limited pointer precision.

## Pull request checklist

- [ ] The change is within MVP scope or explicitly documented as a stretch goal.
- [ ] TypeScript passes in strict mode.
- [ ] Zod validates new external data boundaries.
- [ ] No API secrets are exposed to the extension.
- [ ] No AI-generated code is executed.
- [ ] New transformations can be reverted.
- [ ] Deterministic features still work when the backend is unavailable.
- [ ] Relevant tests were added or updated.
- [ ] Documentation was updated when behavior or architecture changed.
- [ ] Accessibility was manually checked for new UI.

## Research changes

If a browser/platform assumption changes, update `docs/09-RESEARCH.md` with:

- date checked,
- authoritative source,
- what changed,
- implementation impact.
