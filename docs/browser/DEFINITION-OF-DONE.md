# Definition of Done — AURA Browser Event Build

AURA is event-ready only when every required item below is true on the primary macOS machine.

## Learn Me

- First launch clearly explains what AURA does.
- User completes onboarding without developer guidance.
- Questions are experiential and non-diagnostic.
- Reading, interaction, and attention/presentation calibration visibly change the onboarding UI.
- A meaningful profile is created in roughly 60–90 seconds.
- Profile persists after restart.
- User can reset/re-run onboarding.
- AI failure still leaves a usable deterministic calibration path.

## Browser

- `darwin-arm64` app/dev launch is reliable on the event Mac.
- Address/search field works.
- Back, forward, and refresh work.
- Ordinary HTTPS websites render normally.
- Local React shell and remote PageView stay visually/architecturally separate.
- Page preload runs after ordinary navigation/reload.
- Window/panel resizing does not break layout.
- Event UI contains no debug panels, raw JSON, or placeholder controls.

## Page Intelligence

- Remote page preload assigns stable AURA target IDs idempotently.
- Ranked runtime model captures major headings, regions, controls, forms/labels, and substantial text.
- Geometry/selected styles are available for meaningful targets.
- Screenshot capture works.
- Balanced PageModel does not simply truncate DOM order.
- SPA/navigation revision invalidation works for tested routes.
- Optional CDP Accessibility/DOMSnapshot features are required only if the implementation actually depends on them.
- At least 20 real pages produce useful models before W3/W4 are considered ready.
- At least five of those pages are late/random rather than extractor tuning fixtures.

## Make This Mine

- Clicking Make This Mine produces immediate deterministic visual change.
- AI refinement materially improves hierarchy/focus/content presentation on ordinary pages.
- Same page adapts meaningfully differently for at least two profiles.
- Tier 0–3 interventions work without requiring arbitrary DOM reconstruction.
- Text simplification is targeted and reversible.
- Secondary content can be de-emphasized/collapsed without losing primary actions on the required corpus.
- Form/task guidance points to original controls.
- Model timeout/unavailability leaves useful local adaptation.
- Required demo pages retain entered form values and ordinary control behavior.

## Original ↔ AURA

- Original removes all AURA-owned changes without page reload.
- AURA reapplies the current plan without duplicated wrappers/listeners/styles.
- Toggle works repeatedly on the required corpus.

## Talk to AURA

The four action families work reliably with natural phrasing:

- **Adjust** — easier/bigger/calmer/more or less detail;
- **Explain** — explain relevant content;
- **Goal / Guide** — focus on a stated goal and guide through original controls;
- **Remember** — persist a confirmed preference.

At least three different page categories demonstrate these actions.

## Memory

- Explicit global user preference can be remembered.
- Remembered preference changes a later interaction where relevant.
- User can inspect/edit/forget persistent memory.
- Session intent survives relevant navigation during the current session.
- Site-specific preference memory is optional for the event build.

## Product polish

- Primary layout feels intentionally designed.
- Typography, spacing, icons, and states are consistent.
- Make This Mine has a polished transition/state sequence.
- Reduced-motion preference is respected by AURA UI.
- Keyboard access covers primary AURA controls.
- AURA controls have meaningful VoiceOver names.
- Errors are presented in user language, not stack traces.
- AI waiting states feel intentional and never freeze the whole browser.

## Real-site reliability

- `tests/sites.md` contains 25–30 manually tested real pages.
- Target load/navigation success >= 90% on that corpus.
- Target useful personalized transformation >= 85% on that corpus.
- Original restore succeeds on 100% of the required demo corpus.
- No known crash remains on the prepared judging path.

These percentages are internal engineering targets, not accessibility/compliance claims.

## Event rehearsal

- Clean launch → Learn Me → arbitrary website → Make This Mine → Talk to AURA → Remember → Original is rehearsed end-to-end at least three times.
- At least three final-rehearsal sites were not primary development fixtures.
- Packaged macOS build exists.
- Development-launch fallback exists.
- OpenAI credentials/config are verified on the event network or hotspot.
- A seeded backup profile/memory file exists.

## Scope freeze

Once every required item is green, no new features.

Only bug fixes, reliability improvements, copy fixes, and visual polish are allowed before the event.
