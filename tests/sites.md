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
| Article/news | Wikipedia accessibility article | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 180/1126 targets; 76.5 ms extraction | W2 local |
| Article/news | BBC News | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 180/264; repeated stories retained as useful actions | W2 local |
| Article/news | The Guardian | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 180/953; 47.3 ms extraction | W2 local |
| Article/news | NPR | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 180/660; 46.8 ms extraction | W2 local |
| E-commerce | Apple Mac store | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Product controls and shopping guides represented | W2 local |
| E-commerce | eBay laptop listing | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Listing cards/actions represented; 69.3 ms | W2 local |
| E-commerce | IKEA desks listing | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Products, prices, listing controls represented | W2 local |
| University/college | MIT | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 94/109 targets; spotlight and audience links found | W2 local |
| University/college | Stanford | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 180/298; carousel and content actions found | W2 local |
| University/college | Sahrdaya | PASS | PASS | PARTIAL | W4 | W4 | W5 | W4 | PASS | Useful admission/actions found; site lacks a clear main landmark; 401.5 ms | W2 local |
| Government/public service | GOV.UK passport | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Start action and supporting requirements represented | W2 local |
| Government/public service | USA.gov passports | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Major passport tasks represented | W2 local |
| Government/public service | India.gov.in | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Cookie, accessibility, language, search controls represented | W2 local |
| Documentation/technical | Electron webContents | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 178/1608; late API content survives dense navigation | W2 local |
| Documentation/technical | React Learn | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Tutorials, editors, and next action represented | W2 local |
| Documentation/technical | TypeScript Docs | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | 71/253; handbook structure retained | W2 local |
| Form/application | W3C Forms tutorial | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Stable heading target highlight verified | W2 local |
| Form/application | GOV.UK contact form | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Form labels, fields, warning, and submit action found | W2 local |
| SPA/dashboard | GitHub Electron repository | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Repository navigation and code actions represented | W2 local |
| Search/listing | MDN accessibility search | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Search results and page structure represented | W2 local |
| Article/news | NASA News (late set) | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Chosen after extractor completion; 78/190 | W2 local |
| University/college | Harvard (late set) | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Chosen after extractor completion; 159/203 | W2 local |
| Government/public service | Canada benefits (late set) | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Chosen after extractor completion; benefit actions found | W2 local |
| Documentation/technical | Python tutorial (late set) | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Chosen after extractor completion; 88/362 | W2 local |
| SPA/dashboard | Next.js Docs (late set) | PASS | PASS | PASS | W4 | W4 | W5 | W4 | PASS | Chosen after extractor completion; 136/482 | W2 local |
| Misc judge-like | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | Reserved for W7 | |
| Misc judge-like | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | Reserved for W7 | |

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
