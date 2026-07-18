# Onboarding and Calibration

## Goal

Create a useful capability profile without requiring a diagnosis. The onboarding experience must itself be accessible.

## First screen

Present four clear choices:

- **Talk with me** — questions can be spoken and answers recorded.
- **Chat with me** — type answers.
- **Choose simple answers** — use large selectable options.
- **Quick setup** — configure common preferences directly.

All routes use the same underlying onboarding state machine.

## One state machine, multiple adapters

```text
OnboardingEngine
      │
      ├── InputAdapter: text
      ├── InputAdapter: buttons
      ├── InputAdapter: voice
      ├── OutputAdapter: visual text
      └── OutputAdapter: speech synthesis
```

The user can switch input or output modality at any time.

## Interview behavior

The LLM interviewer:

- asks exactly one question at a time,
- focuses on functional barriers and preferences,
- adapts future questions based on prior answers,
- accepts "skip" or "I don't know",
- normally finishes within 5–8 questions,
- never produces a medical diagnosis,
- never claims certainty from a short task,
- uses explicit self-report as stronger evidence than inference.

## Example functional questions

- "When a page has many sidebars, cards, and recommendations, does that make it harder to find what you need?"
- "Are you comfortable using a mouse or trackpad for small buttons?"
- "Would you like pages to reduce motion and animation automatically?"
- "Do you prefer instructions in shorter, simpler steps?"
- "Would you like questions and page content read aloud?"
- "Do you use a screen reader when browsing?"

Avoid asking for diagnostic labels or telling users that the system has detected a medical condition.

## Voice architecture

For MVP reliability:

```text
Microphone
   │
   ▼
MediaRecorder
   │ audio blob
   ▼
POST /v1/speech/transcribe
   │
   ▼
STT provider
   │ text
   ▼
OnboardingEngine
```

For speech output, use browser speech synthesis behind a small `SpeechOutput` adapter.

Do not make browser-native speech recognition a hard dependency. It can be an optional adapter later if verified reliable in the target environment.

## Calibration task 1: text presentation

Show 3–4 cards containing the same short paragraph with different:

- font size,
- line height,
- paragraph spacing,
- reading width.

Ask:

> Which version feels easiest to read?

Update explicit preferences strongly.

## Calibration task 2: control size and spacing

Show identical action controls with different target sizes and spacing.

Ask:

> Which set of controls feels easiest to select comfortably?

Do not treat click speed or task performance as a medical test.

Update:

- `enlargeTargets`,
- `targetSizePx`,
- optionally a weak motor-capability evidence signal when supported by the user's own description.

## Calibration task 3: clutter and focus

Show two versions of a mock article:

A. dense layout with sidebars, recommendations, and multiple competing controls.

B. focused layout with main content and secondary information collapsed.

Ask:

> Which layout feels easier to follow?

Update:

- `focusMode`,
- `hideDistractions`.

## Profile review screen

Before finishing onboarding, show plain-language results:

> AURA will currently:
>
> - make click targets larger,
> - reduce animation,
> - hide distracting secondary content,
> - offer simpler wording for complex passages.

Do not present raw numeric capability scores as medical measurements by default.

Allow the user to change every resulting preference.

## Onboarding LLM contract

Input:

- current profile draft,
- prior short transcript,
- current user response,
- already asked capability areas.

Output:

```json
{
  "assistantMessage": "...",
  "profilePatch": {},
  "confidence": 0.0,
  "suggestedCalibrationTask": null,
  "onboardingComplete": false
}
```

`profilePatch` must use a constrained schema, not arbitrary object mutation.

## Accessibility requirements for onboarding UI

- visible text for every spoken question,
- labels on microphone controls,
- clear recording state,
- keyboard start/stop alternative,
- no audio-only errors,
- no countdowns that cannot be extended,
- no required drag gestures,
- no forced animation,
- focus moves predictably after each step,
- completion does not depend on voice.
