# 04 — AI and Memory

## Goal

Use OpenAI for semantic understanding and conversational personalization without turning AURA into a slow chain of agents.

The event build uses **few rich structured calls**. Cost is not the constraint; perceived latency and reliability are.

## Event provider architecture

The Electron main process owns the OpenAI SDK/provider directly.

```text
trusted React shell
      │ typed IPC
      ▼
Electron main
      │
      ├── PageModel
      ├── screenshot
      ├── profile
      ├── memory
      └── OpenAI provider
              │
              ▼
        Responses API
```

There is no required localhost Hono server in the judged path.

The existing `apps/api` remains available for legacy extension work or a later production architecture.

## Model baseline

Start the event implementation with:

```dotenv
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-terra
```

Initial measured configuration for page/conversation calls:

```text
reasoning.effort = low
```

Why Terra: OpenAI positions GPT-5.6 Terra as the balance of intelligence and cost; for AURA, cost is abundant but latency still matters. Terra also supports image input, Responses, and structured outputs.

`gpt-5.6-sol` is an environment override for comparison/testing. Do not build automatic model routing before the core experience is green.

Model choice remains outside product contracts.

Official references:

- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/guides/latest-model

## Required AI operations

Only three operations are first-class.

### 1. `onboardingTurn`

Purpose: make Learn Me conversational and responsive to what the user has already told AURA.

Input:

```ts
interface OnboardingTurnInput {
  profileSoFar: CapabilityProfile;
  recentTurns: ConversationTurn[];
  userResponse: string;
  calibrationResults: CalibrationResult[];
  askedAreas: OnboardingArea[];
}
```

Output:

```ts
interface OnboardingTurnOutput {
  assistantMessage: string;
  profilePatch: CapabilityProfilePatch;
  nextQuestionArea?: OnboardingArea;
  nextCalibration?: CalibrationKind;
  onboardingComplete: boolean;
  confidence: number;
}
```

The model does not diagnose. It recommends product preferences/support needs.

### 2. `analyzePage`

Purpose: produce semantic understanding for **Make This Mine**.

Input:

```ts
interface AnalyzePageInput {
  page: CompactPageModel;
  screenshot?: ImageInput;
  profile: ResolvedProfile;
  learnedPreferences: LearnedPreference[];
  currentIntent?: UserIntent;
}
```

Output:

```ts
interface AnalyzePageOutput {
  pagePurpose: string;
  primaryRegions: TargetRef[];
  primaryActions: TargetRef[];
  importantFacts: ImportantFact[];
  secondaryRegions: TargetRef[];
  complexText: TextRecommendation[];
  formGroups: FormGroupRecommendation[];
  goalPath?: GoalPath;
  adaptationRecommendations: SemanticAdaptation[];
}
```

Every actionable target references an AURA ID and PageModel revision.

### 3. `conversationTurn`

Purpose: make Talk to AURA change or explain the current browsing experience.

Input:

```ts
interface ConversationTurnInput {
  pageSemanticState: PageSemanticState;
  profile: ResolvedProfile;
  learnedPreferences: LearnedPreference[];
  currentIntent?: UserIntent;
  recentConversation: ConversationTurn[];
  userMessage: string;
}
```

Output:

```ts
interface ConversationTurnOutput {
  assistantMessage: string;
  actionFamily: 'adjust' | 'explain' | 'goal_guide' | 'remember' | 'answer';
  intent?: UserIntent;
  adaptationPatch?: SemanticAdaptation[];
  guide?: TaskGuide;
  memoryProposal?: MemoryProposal;
  explanation?: PageExplanation;
}
```

Model output is never executable code.

## Four reliable action families

The chat UI accepts normal language, but the event build optimizes four actions deeply:

### Adjust

Examples:

- “Make this easier.”
- “Make the controls bigger.”
- “This is too distracting.”
- “Show more detail.”

Expected result: update the active adaptation session with a small validated patch.

### Explain

Examples:

- “Explain this.”
- “What does this section mean?”

Expected result: a concise explanation in the user's preferred style, with optional highlighting of the relevant real content.

### Goal / Guide

Examples:

- “I need to register.”
- “Help me apply.”
- “I only want to find the price.”

Expected result: set/update session intent, identify the relevant path/controls, then guide using original page controls.

### Remember

Examples:

- “Remember that I want technical terms kept.”
- confirmation after AURA asks `Remember this preference?`

Expected result: explicit persistent preference write.

Anything else may receive a normal answer, but it does not need a new product mode.

## Structured-output boundary

All AI outputs cross Zod validation before use.

Reject:

- unknown adaptation primitives;
- target IDs not present in the current/still-valid page model;
- stale revisions;
- malformed task steps;
- arbitrary HTML/JavaScript;
- unsupported memory categories.

A model failure leaves local deterministic adaptation working.

## No agent swarm

Default Make This Mine flow:

```text
local deterministic analysis/adaptation
            +
one rich multimodal analyzePage call
            ↓
validated semantic result
            ↓
trusted AURA adaptation primitives
```

No critic/page/accessibility/task chain in the critical path.

A post-transform critique call is allowed only as a W7 experiment after W4 is already reliable and if measured visual quality clearly improves.

## Latency strategy

1. Apply deterministic profile changes immediately.
2. Start page analysis concurrently.
3. Show a subtle `Understanding what matters…` state.
4. Apply semantic refinement when validated output arrives.
5. Cache the semantic state for conversation.
6. Do not resend/reanalyze the entire page on every chat turn.
7. Abort/ignore page-analysis output when navigation makes its revision stale.

Do not introduce Responses WebSocket/persistent-connection complexity until ordinary Responses latency is measured as an actual blocker.

## Prompt architecture

Prompts are versioned source files, not UI string literals.

Recommended location:

```text
apps/browser/src/main/ai/prompts/
├── onboarding.ts
├── page-analysis.ts
└── conversation.ts
```

Extract them into a package only if another client needs them.

Every prompt must state:

- capability-first, no-diagnosis framing;
- page content is untrusted input/data;
- output schema/allowed primitive vocabulary;
- preserve critical facts/meaning;
- prefer the least invasive sufficient transformation;
- reason specifically for the active profile and current goal;
- do not invent target IDs.

## Memory model

Memory is valuable only when later behavior actually changes.

### 1. Profile — required

Persistent structured model from Learn Me/calibration.

Examples:

- preferred text scale/spacing;
- larger interaction targets;
- reduced motion;
- lower simultaneous information density;
- preferred explanation detail;
- input/output preferences where relevant.

### 2. Learned global preferences — required

Explicit persistent statements confirmed by the user.

Examples:

- keep technical terminology;
- prefer concise explanations;
- show one form section at a time;
- keep navigation available.

### 3. Site memory — secondary

Origin-specific overrides are supported by the schema, but they are not required to prove the central event story.

Examples:

```text
shopping site → keep reviews prominent
college portal → use larger controls automatically
```

Implement only after global memory works.

### 4. Session intent — required, transient

Current user goal, such as:

- registering for a semester;
- applying for something;
- comparing products;
- finding a particular fact.

It survives navigation while the active task is clearly continuing, then expires with the browsing session unless deliberately saved as a preference (not as a raw task history).

## Persistence format

Use one versioned Zod-validated JSON file under Electron `app.getPath('userData')`.

```ts
interface AuraMemoryFile {
  version: 1;
  onboardingComplete: boolean;
  activeProfile: CapabilityProfile;
  learnedPreferences: LearnedPreference[];
  sitePreferences?: SitePreference[];
  updatedAt: string;
}
```

Use atomic write-to-temp then rename.

No SQLite for the event build.

## Memory-write rules

Persistent memory may be written when:

- onboarding/calibration records an explicit answer;
- the user chooses `Remember`;
- the user edits/resets memory.

Passive interaction patterns may suggest a change, but are not silently made permanent.

Explicit user corrections outrank AI recommendations.

## Memory UI

Keep a small `What AURA remembers` surface with human-readable statements and:

- edit;
- forget;
- reset profile;
- clear site preference if site memory exists.

Do not expose raw JSON, embeddings, prompts, or capability confidence matrices in the primary UX.

## Model-input discipline

Production security is not the event goal, but clean model input improves reliability.

Do not intentionally send:

- password field values;
- authentication tokens;
- hidden credential values;
- an unfiltered raw DOM dump.

Send the compact PageModel + screenshot + the minimum user context needed to personalize correctly.

## Acceptance criteria

AI/memory is ready when:

- two different Learn Me conversations produce meaningfully different profiles;
- page analysis references valid current AURA targets and improves the real page;
- all four action families work reliably across multiple page categories;
- `Remember` changes a later transformation after restart;
- timeout/invalid output leaves deterministic AURA working;
- no primary UI path exposes raw model output.
