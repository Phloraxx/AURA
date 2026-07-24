# Definition of Done — AURA Browser Event Build

AURA is event-ready only when every required item below is true on the primary macOS machine.

## Learn Me

- First launch clearly explains what AURA does.
- User can complete onboarding without developer guidance.
- Onboarding asks experiential, non-diagnostic questions.
- At least three calibration interactions visibly change the onboarding experience.
- A meaningful profile is created in roughly 60–90 seconds on the demo path.
- Profile persists after restart.
- User can reset/re-run onboarding.

## Browser

- App launches reliably on macOS.
- Address/search field works.
- Back, forward, and refresh work.
- Ordinary HTTPS websites render normally.
- Window resizing does not break page/panel layout.
- Visible UI contains no debug panels, raw JSON, or placeholder controls.

## Page Intelligence

- AURA runtime injects idempotently.
- Stable AURA target IDs exist for relevant page elements.
- DOM/layout snapshot works on the pinned Electron version.
- Accessibility tree capture works on the pinned Electron version.
- Screenshot capture works.
- Balanced PageModel does not simply truncate DOM order.
- SPA/navigation invalidation works for tested routes.
- At least 20 real pages produce useful models before flagship implementation is declared complete.

## Make This Mine

- Clicking Make This Mine produces immediate deterministic visual change.
- AI refinement can materially change hierarchy/focus/content presentation.
- Same page adapts differently for at least two different profiles.
- Text simplification is targeted and reversible.
- Secondary content can be de-emphasized/collapsed without losing required primary actions on the corpus.
- Form/task guidance can point to original controls.
- Model timeout/unavailability leaves useful local adaptation.
- No required demo page loses entered form values because of AURA.

## Original ↔ AURA

- Original removes all AURA-owned changes without page reload.
- AURA reapplies the current plan without duplicated wrappers/listeners/styles.
- Toggle works repeatedly on the required corpus.

## Talk to AURA

The following intents work reliably:

- make this easier;
- explain this;
- focus on a stated goal;
- change presentation/interaction comfort;
- guide through a task/form;
- remember a confirmed preference.

At least three different page categories have been used to demonstrate these intents.

## Memory

- Explicit user preference can be remembered.
- Remembered preference changes a later interaction where relevant.
- Site-specific preference can be stored.
- User can inspect and forget persistent memory.
- Session intent survives navigation during the current session.

## Product polish

- Primary layout feels intentionally designed.
- Typography, spacing, icons, and states are consistent.
- Make This Mine has a polished transition/state sequence.
- Reduced-motion preference is respected by AURA UI.
- Keyboard access covers primary AURA controls.
- AURA controls have meaningful accessibility names for VoiceOver.
- Errors are presented in user language, not stack traces.

## Real-site reliability

- `tests/sites.md` contains 25–30 manually tested real pages.
- Target load/navigation success >= 90% on that corpus.
- Target useful personalized transformation >= 85% on that corpus.
- Original restore succeeds on 100% of the required demo corpus.
- No known crash remains on the prepared judging path.

These percentages are internal engineering targets only, not accessibility/compliance claims.

## Event rehearsal

- Clean launch → onboarding → arbitrary website → Make This Mine → Talk to AURA → memory → Original has been rehearsed end-to-end at least three times.
- At least three websites used in final rehearsal were not the day's primary development fixtures.
- Packaged macOS build exists.
- Development-launch fallback exists.
- API credentials/config are verified on event network or hotspot.
- A seeded backup profile/memory file exists.

## Scope freeze

Once every required item above is green, do not add features.

Only bug fixes, reliability improvements, copy fixes, and visual polish are allowed before the event.