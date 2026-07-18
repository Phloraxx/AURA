# Security and Privacy

## Threat model summary

The extension can potentially read webpage content, which may include sensitive information. Capability profiles may also reveal accessibility-related preferences. The MVP must therefore minimize access, transmission, storage, and logging.

## Core rules

1. Store capability profiles locally by default.
2. Keep API secrets only on the backend.
3. Do not transmit cookies, authentication tokens, or browser storage.
4. Do not transmit password values or hidden secrets from forms.
5. Prefer compact semantic page snapshots over raw HTML.
6. Do not log full page text in production.
7. Do not execute remote/model-generated code.
8. Use explicit host-permission strategy.
9. Make AI failure non-destructive.
10. Make adaptations reversible.

## Sensitive profile handling

A capability profile may be sensitive even when it avoids diagnostic labels.

For MVP:

- use `chrome.storage.local`,
- do not upload profiles to a database,
- send only the minimum profile fields required for onboarding calls,
- never include the profile in general analytics,
- provide a **Reset profile** action.

## Page data minimization

Before creating `PageRepresentation`:

- include visible semantic text only as needed,
- cap text per element,
- cap total text,
- omit script/style content,
- omit input values by default,
- never include password fields,
- redact likely secrets,
- omit cookies/localStorage/sessionStorage.

## Prompt injection

Webpage content is adversarial input.

Mitigations:

- model is told page text is untrusted data,
- no tools are available in the semantic page-analysis call,
- output is schema constrained,
- output cannot contain executable code in accepted fields,
- returned IDs must match local registry,
- high-risk transformations are blocked by business rules.

## Manifest V3 remote code

Bundle all executable extension code with the extension.

Backend/model responses are data only. Never fetch JavaScript or WASM and execute it.

## Permissions

Production preference:

- use the least privilege possible,
- use explicit user gesture for current-page adaptation where practical,
- request optional host permissions contextually for persistent automatic adaptation.

The hackathon build may temporarily use broader development permissions but must document them clearly.

## Reversion safety

Every transformation keeps enough original state to restore:

- prior inline styles changed by AURA,
- prior attributes changed by AURA,
- original text when simplified,
- collapse visibility state,
- injected wrappers/styles owned by AURA.

Do not attempt to restore unrelated host-page mutations that happened after adaptation.

## Logging

Development logs may include element IDs and counts.

Production logs should avoid:

- full page text,
- profile contents,
- audio recordings,
- transcriptions unless needed transiently for the request.

## Audio

- show clear microphone active state,
- start recording only after explicit user action,
- stop recording visibly and predictably,
- do not retain audio after transcription in MVP unless the provider requires temporary processing,
- document provider retention assumptions before deployment.

## User trust UI

The extension should clearly expose:

- what it changed,
- whether AI analysis was used,
- an undo action,
- a reset profile action,
- a way to turn automatic adaptation off.
