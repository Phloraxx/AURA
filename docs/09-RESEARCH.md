# Research Notes

Last reviewed: 2026-07-18

This document records platform facts that influence implementation. Re-check official documentation before release because browser APIs and policies change.

## 1. Browser extensions can inspect and modify webpage DOM

Chrome content scripts run in the context of webpages and can read and modify the DOM. This is the foundation for the adaptation engine.

Official source:
- Chrome for Developers — Content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

Implementation consequence:
- keep DOM extraction and transformations in the content script,
- use message passing for APIs unavailable directly to content scripts.

## 2. Dynamic script/CSS injection is supported through chrome.scripting

`chrome.scripting` supports runtime injection with the `scripting` permission and appropriate host access or `activeTab`.

Official source:
- https://developer.chrome.com/docs/extensions/reference/api/scripting

Implementation consequence:
- current-page adaptation can use an explicit user action and `activeTab` in a least-privilege design,
- persistent automatic adaptation can request optional host permissions.

## 3. Chrome side panel is suitable for persistent extension UI

Chrome's Side Panel API hosts extension UI alongside webpage content and is available to Manifest V3 extensions on supported Chrome versions.

Official source:
- https://developer.chrome.com/docs/extensions/reference/api/sidePanel

Implementation consequence:
- onboarding, profile editing, voice controls, adaptation status, and undo should live in the side panel.

## 4. chrome.storage is the correct persistence mechanism

Chrome provides extension-specific storage accessible from extension contexts.

Official source:
- https://developer.chrome.com/docs/extensions/reference/api/storage

Implementation consequence:
- store the capability profile locally,
- use session storage or memory for ephemeral analysis,
- do not use host-page `localStorage` for profile persistence.

## 5. Manifest V3 disallows remotely hosted executable code

Manifest V3 requires executable extension logic to be bundled with the extension. Remote data such as JSON can be interpreted, but remote JavaScript/WASM must not be fetched and executed as extension code.

Official sources:
- https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code

Implementation consequence:
- model responses are structured data only,
- transformation code ships locally,
- no `eval`, `new Function`, or fetched remote scripts.

## 6. activeTab can reduce permission scope

`activeTab` grants temporary access to the current tab after a user gesture.

Official source:
- https://developer.chrome.com/docs/extensions/develop/concepts/activeTab

Implementation consequence:
- production design should support **Adapt this page** without permanent all-sites permission,
- optional persistent permissions can be added later.

## 7. W3C explicitly supports adaptation and personalization

WAI-Adapt exists to enable users to personalize presentation according to individual needs and preferences. W3C materials explicitly describe browser extensions and assistive technologies as consumers that can adapt content.

Official sources:
- https://www.w3.org/WAI/adapt/
- https://www.w3.org/WAI/WCAG2/supplemental/objectives/o8-personalization/
- https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p02-apis/

Product consequence:
- the high-level concept is legitimate but not wholly novel,
- novelty claims must focus on this product's capability-vector/composable-engine implementation.

## 8. Individual needs do not map cleanly to one diagnosis label

W3C cognitive accessibility material describes varied functional barriers and emphasizes that users may have different affected functions, may not have formal diagnoses, and may need different presentation or interaction strategies.

Official source:
- https://www.w3.org/WAI/people-use-web/abilities-barriers/cognitive/

Product consequence:
- capability-first onboarding is defensible,
- avoid diagnosis detection claims.

## 9. Prior art exists in adaptive reading/personalization

W3C participated in the Easy Reading project, which explored adaptive personalized interfaces, user profiles, and matching users to simplification support.

Official source:
- https://www.w3.org/WAI/about/projects/easy-reading/

Product consequence:
- do not pitch "personalized accessibility" itself as invented here,
- pitch the specific architecture and live cross-site extension implementation.

## 10. Speech recognition/synthesis exist as Web Speech APIs, but recognition should not be a hard dependency

The Web Speech API specification defines browser-facing speech recognition and speech synthesis.

Specification:
- https://dvcs.w3.org/hg/speech-api/raw-file/tip/webspeechapi

Implementation consequence:
- use speech synthesis behind an adapter,
- for reliable MVP STT, record audio with `MediaRecorder` and send to a backend provider,
- browser-native speech recognition may be added only after verifying target-browser support and extension context behavior.

## 11. WXT can generate extension manifests and supports modern extension structure

WXT generates manifests from project configuration and entrypoints.

Official source:
- https://wxt.dev/guide/essentials/config/manifest.html

Implementation consequence:
- use WXT to reduce Manifest V3 scaffolding time,
- inspect generated manifest during build to ensure permissions are correct.

## 12. Codex benefits from AGENTS.md instructions and reliable tests

OpenAI states that Codex can be guided by `AGENTS.md` files and performs best with clear repository guidance and reliable test setups.

Official source:
- https://openai.com/index/introducing-codex/

Repository consequence:
- keep `AGENTS.md` current,
- put authoritative build/test commands there once the workspace is scaffolded.

## 13. The repository runtime requires a Node-20-compatible WXT release

Checked: 2026-07-18

The development environment currently provides Node 20.20.2. WXT 0.20.27
declares Node 20 support itself, but its current publishing dependency resolves
to `listr2` 10, which requires Node 22.13 or newer. WXT 0.20.10 resolves its
publishing toolchain to the Node-20-compatible major while retaining the WXT
0.20 extension APIs used by AURA.

Primary package metadata checked:
- https://www.npmjs.com/package/wxt/v/0.20.10
- https://www.npmjs.com/package/publish-browser-extension/v/3.0.2

Implementation consequence:
- pin WXT exactly at 0.20.10 while the repository baseline remains Node 20,
- pin `@wxt-dev/module-react` at 1.1.4; newer releases select a Vite React
  plugin toolchain that does not prepare successfully with this WXT/Node pair,
- do not accept an automated WXT upgrade without running install, build, and
  generated-manifest verification on the supported Node runtime,
- revisit the pin when the project moves to Node 22.13 or newer.

## 14. Runtime content-script injection preserves the explicit user gesture

Checked: 2026-07-18

WXT supports content-script entrypoints with `registration: 'runtime'` and
documents executing the emitted content-script file through
`browser.scripting.executeScript`. Chrome's `activeTab` permission grants
temporary current-tab access after the user invokes the extension.

Even for runtime registration, declaring `matches: ['<all_urls>']` caused WXT
0.20.10 to add `<all_urls>` to the generated `host_permissions`. The match list
is unnecessary when the packaged file is injected directly with
`scripting.executeScript`, so AURA deliberately omits it.

Official sources:
- https://wxt.dev/guide/essentials/scripting
- https://developer.chrome.com/docs/extensions/develop/concepts/activeTab

Implementation consequence:
- AURA does not register its adaptation content script on every page at
  install time,
- the side-panel **Adapt this page** action injects
  `content-scripts/adaptive.js` into the active tab after the user gesture,
- the generated production manifest must not contain a static
  `content_scripts` entry or broad all-sites host permission.

## 15. OpenAI Responses structured output is suitable for constrained onboarding

Checked: 2026-07-18

The official OpenAI JavaScript SDK identifies the Responses API as its primary
API and provides Zod-backed structured-output parsing. The current model catalog
describes GPT-5.6 Luna as the cost-sensitive current frontier model and lists
Structured Outputs support. AURA still validates the parsed value again with
its shared Zod contract before accepting a profile patch.

The SDK's strict-schema converter also enforces the Responses API rule that all
object properties be required. AURA's public patch contract uses optional
fields, so the provider adapter uses a separate required-but-nullable schema and
removes nulls before validating against the public patch schema. A direct SDK
schema-generation test guards this boundary.

Official sources:
- https://github.com/openai/openai-node
- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/resources

Implementation consequence:
- use the backend-only OpenAI JavaScript SDK and Responses API,
- default the configurable live model to `gpt-5.6-luna`,
- use `responses.parse` with `zodTextFormat`, then parse again with the shared
  response schema,
- expose no OpenAI key, provider response body, or provider-specific format to
  the extension,
- keep `LLM_PROVIDER=mock` as the default so install, tests, and deterministic
  adaptation remain offline.

## 16. Voice answers can use MediaRecorder with backend transcription

Checked: 2026-07-18

The browser `MediaRecorder` API records a user-authorized `MediaStream` into
audio blobs. OpenAI's transcription API accepts audio files, and the current
model catalog lists `gpt-4o-mini-transcribe` as a speech-to-text model available
through the transcription endpoint.

Official sources:
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe

Implementation consequence:
- microphone capture begins only after an explicit side-panel action,
- the side panel uploads a bounded recording directly to the fixed AURA API;
  raw audio never crosses extension runtime messaging and is not stored in the
  capability profile,
- the API validates multipart size and MIME type before invoking an `STTProvider`,
- `STT_PROVIDER=mock` remains the offline default and the live model is
  configurable, defaulting to `gpt-4o-mini-transcribe`,
- every voice step retains a type-answer fallback.

## Open research tasks before production

Codex should research and document these only when needed for implementation:

- exact WXT side-panel entrypoint conventions for the selected version,
- current Chrome Web Store privacy disclosure requirements,
- optional host permission UX,
- behavior across Shadow DOM boundaries,
- cross-origin iframe limitations,
- impact of React/Vue hydration when DOM structure is reordered,
- target Chrome version and minimum `sidePanel` support,
- STT provider retention/privacy policies,
- whether on-device browser AI is available and appropriate as a future optional adapter.

## Research quality rule

For browser/runtime implementation details, prefer primary official documentation. For accessibility guidance, prefer W3C/WAI. For Codex behavior, prefer official OpenAI documentation. Record the date checked.
