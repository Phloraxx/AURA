# Testing Strategy

## Test pyramid

### Unit tests

Highest priority:

- capability profile validation,
- profile patch merging,
- policy engine outputs,
- confidence threshold logic,
- semantic ID validation,
- each adaptation primitive's state bookkeeping,
- safe-target exclusion rules.

### DOM tests

Use a DOM-capable test environment for primitives where possible.

Each primitive should test:

1. apply changes expected DOM/style/attributes,
2. second apply does not duplicate effects,
3. revert restores original state,
4. missing target does not crash,
5. unrelated host changes are not overwritten unnecessarily.

### API contract tests

Test:

- invalid requests rejected,
- invalid model JSON rejected,
- unknown DOM IDs rejected,
- oversized payload rejected,
- provider timeout normalized,
- provider failure returns accessible retryable error.

### Fixture tests

Each fixture has expected semantic properties.

#### cluttered article

Expected:

- main article detected,
- sidebar/recommendations eligible for collapse,
- article never collapsed,
- focus mode preserves navigation restoration.

#### complex form

Expected:

- inputs and labels preserved,
- validation errors never hidden,
- values survive adaptation/reversion,
- larger targets do not detach handlers.

#### product page

Expected:

- buy/add-to-cart candidate highlighted,
- product title/price retained,
- recommendations may collapse,
- purchase/security controls never replaced by generated controls.

## Playwright

Use Playwright persistent Chromium context for extension smoke tests if the project setup supports it reliably.

Candidate flows:

1. load extension,
2. open fixture,
3. open side panel or trigger adaptation,
4. apply profile A,
5. assert page marker styles,
6. undo,
7. switch profile,
8. apply profile B.

Do not block the hackathon on brittle automation of Chrome side-panel internals; keep a reliable manual smoke checklist.

## Accessibility testing

For side panel and onboarding:

- keyboard-only walkthrough,
- visible focus check,
- 200% zoom check,
- reduced-motion check,
- automated axe-core scan where practical,
- screen-reader manual smoke test if available.

## AI testing

Do not rely only on live model tests.

Create canned JSON fixtures for:

- valid analysis,
- invented IDs,
- low-confidence distractions,
- forbidden critical control targeting,
- malformed JSON,
- overly long labels.

Live provider tests should be opt-in and not required for default unit tests.

## Failure testing

Simulate:

- API unreachable,
- slow response,
- invalid response,
- microphone denied,
- transcription failure,
- page navigation during analysis,
- DOM target removed before transformation.

Expected result: deterministic adaptation remains usable and the extension does not corrupt the page.

## Manual demo checklist

- [ ] Fresh install opens onboarding.
- [ ] Keyboard-only onboarding works.
- [ ] Voice recording works.
- [ ] Profile persists.
- [ ] Fixture opens in original state.
- [ ] Profile A changes page.
- [ ] Undo restores page.
- [ ] Profile B changes same page differently.
- [ ] Backend-off mode still changes page deterministically.
- [ ] AI status/error is non-blocking.
- [ ] No console errors that break the flow.
