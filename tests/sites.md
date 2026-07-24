# AURA Browser — Real-Site Compatibility Matrix

This file is the manual release gate for judge-selected-site reliability.

Use the actual primary macOS event machine. Do not mark a site PASS from memory or screenshots.

## Status values

- `PASS` — works as intended.
- `PARTIAL` — useful but with a known limitation documented in Notes.
- `FAIL` — core behavior is unusable or broken.
- `TODO` — not yet tested.

## Matrix

| Category | Site / URL | Loads | PageModel | Primary content/action | Local adapt | AI refine | Talk/goal | Original restore | Status | Notes | Commit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Article/news | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Article/news | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Article/news | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Article/news | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| E-commerce | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| E-commerce | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| E-commerce | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| E-commerce | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| University/college | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| University/college | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| University/college | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| University/college | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Government/public service | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Government/public service | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Government/public service | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Documentation/technical | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Documentation/technical | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Documentation/technical | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Form/application | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Form/application | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Form/application | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| SPA/dashboard | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| SPA/dashboard | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| SPA/dashboard | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Search/listing | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Search/listing | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Misc judge-like | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |
| Misc judge-like | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | | |

## Release gates

Before W3:
- at least 20 real pages produce a useful PageModel.

Before W5:
- at least 20 real pages survive Make This Mine without catastrophic loss of primary content/actions.

Before event freeze:
- 25–30 rows tested on the actual Mac;
- target >= 90% load/navigation success;
- target >= 85% useful personalized transformation;
- Original restore passes on 100% of the required demo corpus.

These are internal engineering targets, not accessibility/compliance claims.
