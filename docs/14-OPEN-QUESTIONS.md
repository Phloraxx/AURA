# Open Questions

These questions should not block initial scaffolding. Resolve them only when the relevant phase begins.

## Product

- Should the six dimensions remain exactly visual, auditory, motor, cognitive, attention, and language after user testing?
- Should raw capacity scores ever be visible to users, or only plain-language adaptation preferences?
- Should users create multiple profiles, or should one editable profile be the default MVP experience?
- Which adaptation should be default-on versus suggested?

## Extension platform

- Use `activeTab` only for MVP demo, or broad development host permissions for speed?
- What exact optional-permission UX should production use?
- How should Shadow DOM elements be represented in the element registry?
- Should same-origin iframes be analyzed recursively in MVP?
- What is the safest strategy for cross-origin iframes?

## Adaptation

- How aggressive should `focusMainContent` be on application-style pages rather than articles?
- What local heuristics are reliable enough to avoid an AI request?
- How should the engine handle CSS-in-JS pages that overwrite styles?
- When should semantic analysis be re-run after SPA navigation?

## AI

- Which provider offers the best structured-output latency/cost for hackathon use?
- Should page analysis use one model call per page or separate calls for simplification?
- How much page text can be omitted without harming semantic classification?
- Should semantic analysis be cached per URL + page-structure hash?

## Voice

- Which STT provider will be used for the demo?
- What audio MIME types are supported in the chosen browser and backend runtime?
- How long can an onboarding voice answer be?
- What is the fallback when microphone permission is denied?

## Demo

- Which real public site can be used safely for a live demo without risking layout changes?
- Should the official demo use only fixtures for reliability and then show a real-site bonus example?

## Post-MVP research

- user studies with disabled participants,
- compatibility with screen readers,
- WAI-Adapt semantics integration,
- per-site learning and overrides,
- on-device AI,
- user-controlled cloud profile sync,
- extension store review/privacy requirements.
