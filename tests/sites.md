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
| Article/news | Wikipedia accessibility article | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | Live semantic and all four conversation families verified | W5 local |
| Article/news | BBC News | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | 180/264; local adaptation and exact restore verified | W4 local |
| Article/news | The Guardian | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | 180/953; local adaptation and exact restore verified | W4 local |
| Article/news | NPR | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | 180/660; local adaptation and exact restore verified | W4 local |
| E-commerce | Apple Mac store | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Product controls preserved through local adaptation | W4 local |
| E-commerce | eBay laptop listing | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Listing cards/actions and exact restore verified | W4 local |
| E-commerce | IKEA desks listing | PASS | PASS | PASS | PASS | TODO | PASS | PASS | PASS | All four conversation families verified | W5 local |
| University/college | MIT | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Spotlight/actions and exact restore verified | W4 local |
| University/college | Stanford | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Passed isolated retry after initial settle timeout | W4 local |
| University/college | Sahrdaya | PASS | PASS | PARTIAL | PASS | TODO | TODO | PASS | PASS | Site lacks a clear main landmark; useful actions preserved | W4 local |
| Government/public service | GOV.UK passport | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Start action and requirements preserved | W4 local |
| Government/public service | USA.gov passports | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Major passport tasks preserved | W4 local |
| Government/public service | India.gov.in | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Language, search, and accessibility controls preserved | W4 local |
| Documentation/technical | Electron webContents | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Dense navigation and late API content survived | W4 local |
| Documentation/technical | React Learn | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Tutorials, editors, and next action preserved | W4 local |
| Documentation/technical | TypeScript Docs | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Handbook structure and exact restore verified | W4 local |
| Form/application | W3C Forms tutorial | PASS | PASS | PASS | PASS | TODO | PASS | PASS | PASS | All four conversation families verified | W5 local |
| Form/application | GOV.UK contact form | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Labels, fields, warning, submit, and values preserved | W4 local |
| SPA/dashboard | GitHub Electron repository | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Repository navigation and code actions preserved | W4 local |
| Search/listing | MDN accessibility search | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Search results and exact restore verified | W4 local |
| Article/news | NASA News (late set) | PASS | PASS | PASS | PASS | PASS | TODO | PASS | PASS | Late/random live semantic pass | W4 Luna |
| University/college | Harvard (late set) | PASS | PASS | PASS | PASS | PASS | TODO | PASS | PASS | Late/random live semantic pass | W4 Luna |
| Government/public service | Canada benefits (late set) | PASS | PASS | PASS | PASS | PASS | TODO | PASS | PASS | Late/random live semantic pass | W4 Luna |
| Documentation/technical | Python tutorial (late set) | PASS | PASS | PASS | PASS | PASS | TODO | PASS | PASS | Late/random live semantic pass | W4 Luna |
| SPA/dashboard | Next.js Docs (late set) | PASS | PASS | PASS | PASS | PASS | TODO | PASS | PASS | Refined live semantic copy and restore verified | W4 Luna |
| Nonprofit/public information | UNICEF (final set) | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Chosen during W7; 105 targets and exact restore | W7 local |
| Technology/public information | Mozilla (final set) | PASS | PASS | PASS | PASS | TODO | TODO | PASS | PASS | Chosen during W7; 118 targets and exact restore | W7 local |

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
