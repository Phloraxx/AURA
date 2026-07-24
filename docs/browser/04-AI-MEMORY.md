# 04 — AI and Memory

## Goal

Use OpenAI for semantic understanding and conversational personalization without turning AURA into a slow chain of agents.

The event build should use **few, rich, structured calls** rather than many sequential model hops.

## Provider architecture

Keep provider-specific code behind an interface so model choice remains environment-configurable.

Use the OpenAI **Responses API**. It supports multimodal text/image input and structured output patterns suitable for AURA's page-analysis contracts.

Reference: https://platform.openai.com/docs/quickstart/make-your-first-api-request

## Required AI operations

Only three first-class operations are required.

### 1. `onboardingTurn`

Purpose: understand the person during Learn Me.

Input:

```ts
interface OnboardingTurnInput {
  profileSoFar: CapabilityProfile;
  transcriptSummary: string;
  recentTurns: ConversationTurn[];
  userResponse: string;
  calibrationResults: CalibrationResult[];
}
```

Output:

```ts
interface OnboardingTurnOutput {
  assistantMessage: string;
  profilePatch: CapabilityProfilePatch;
  learnedPreferenceProposals: MemoryProposal[];
  nextCalibration?: CalibrationKind;
  onboardingComplete: boolean;
  confidence: number;
}
```

The model must not diagnose. It may infer product preferences and capability support needs with confidence.

### 2. `analyzePage`

Purpose: produce semantic understanding for Make This Mine.

Input:

```ts
interface AnalyzePageInput {
  page: CompactPageModel;
  screenshot?: ImageInput;
  profile: ResolvedProfile;
  relevantMemory: MemoryContext;
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
  taskHints: TaskHint[];
  adaptationRecommendations: SemanticAdaptation[];
}
```

Every target must reference an AURA ID from the exact or still-valid PageModel revision.

### 3. `conversationTurn`

Purpose: handle Talk to AURA.

Input:

```ts
interface ConversationTurnInput {
  pageContext: PageSemanticState;
  profile: ResolvedProfile;
  relevantMemory: MemoryContext;
  currentIntent?: UserIntent;
  recentConversation: ConversationTurn[];
  userMessage: string;
}
```

Output:

```ts
interface ConversationTurnOutput {
  assistantMessage: string;
  intent?: UserIntent;
  adaptationPatch?: SemanticAdaptation[];
  guide?: TaskGuide;
  memoryProposal?: MemoryProposal;
  explanation?: PageExplanation;
}
```

Conversation output is not executable code. It is a structured request that trusted AURA code validates and performs.

## Structured output rule

All model outputs cross a Zod validation boundary before use.

Reject:

- unknown adaptation primitive types;
- target IDs not present in the current page model;
- malformed task steps;
- arbitrary HTML/JavaScript;
- stale page revisions;
- unsupported memory categories.

A model failure degrades to local adaptation rather than breaking the browser.

## No agent swarm

Do not build separate sequential “page agent”, “accessibility agent”, “critic agent”, and “task agent” for the event build.

Default flow:

```text
local deterministic analysis
        +
one rich page-analysis call
        ↓
validated structured result
        ↓
trusted local adaptation
```

A second critique call is a stretch optimization only if W4 is already reliable and the first transformation visibly benefits from it.

## Latency strategy

OpenAI credits are abundant; user waiting time is not.

Therefore:

1. apply deterministic profile preferences immediately;
2. start page analysis concurrently;
3. show a subtle `Understanding what matters…` state;
4. apply validated semantic refinement when it arrives;
5. cache the resulting semantic state for conversation;
6. do not reanalyze the whole page on every user message.

## Prompt architecture

Prompts live as versioned source files, not large string literals scattered through UI code.

Suggested files:

```text
apps/api/src/prompts/browser/
├── onboarding.ts
├── page-analysis.ts
└── conversation.ts
```

Each prompt must define:

- AURA's role;
- capability-first/no-diagnosis framing;
- page content as untrusted data;
- allowed output schema;
- instruction to preserve important information;
- instruction to prefer minimal sufficient adaptation;
- instruction to reason specifically for the active profile, not generic accessibility.

## Memory model

Memory is a product feature only when it changes future behavior.

Use four layers.

### 1. Profile

Persistent structured capability and presentation model created by onboarding/calibration.

Examples:

- prefers text around a larger scale;
- benefits from larger interaction targets;
- prefers reduced motion;
- benefits from lower simultaneous information density;
- uses keyboard/voice/pointer preferences.

### 2. Learned preferences

Persistent natural/product preferences explicitly confirmed by the user.

Examples:

- keep technical terminology;
- prefer concise explanations;
- reveal forms one section at a time;
- keep navigation visible;
- prioritize keyboard-friendly controls.

### 3. Site memory

Origin-specific overrides.

Examples:

```text
amazon.in → keep reviews prominent
college.example → auto-apply larger controls
```

### 4. Session memory

Non-persistent current browsing intent/task.

Examples:

- applying for a scholarship;
- comparing laptops;
- registering for semester 7.

Session memory survives normal navigation during the active browser session, then expires unless deliberately saved.

## Persistence format

For the event build, use a Zod-validated JSON document stored under Electron `app.getPath('userData')`.

Suggested schema:

```ts
interface AuraMemoryFile {
  version: 1;
  activeProfileId: string;
  profiles: CapabilityProfile[];
  learnedPreferences: LearnedPreference[];
  sitePreferences: SitePreference[];
  updatedAt: string;
}
```

Use atomic write-then-rename behavior so a crash during write does not destroy the file.

Do not introduce SQLite unless JSON is proven insufficient.

## Memory-write rules

Persistent memory may be written when:

- onboarding/calibration has an explicit user answer;
- the user chooses `Remember`;
- the user explicitly edits memory/settings.

Repeated behavior may produce a suggestion, but not silently become permanent memory for the event build.

User corrections have higher precedence than AI recommendations.

## Memory UI

A secondary `What AURA remembers` surface should show short human-readable statements with:

- edit;
- forget;
- clear site memory;
- reset profile.

Do not expose raw embeddings, prompts, confidence matrices, or developer JSON in the main experience.

## Page context and privacy boundary

Security is not the event's optimization target, but model input still needs product discipline.

Do not send:

- password field values;
- authentication tokens;
- hidden credential values;
- the entire raw DOM when a compact semantic representation is available.

The model should receive enough context to personalize reliably, not every byte of the page.

## Model configuration

Never hard-code the project to one model ID in product contracts.

Environment variables:

```dotenv
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

The event team can select the strongest available model that satisfies image input + structured output + acceptable latency.

## Acceptance criteria

AI/memory is ready when:

- onboarding can create meaningfully different profiles from different conversations;
- a page analysis references valid AURA targets and changes the page;
- Talk to AURA can reliably execute the six intents in `01-EXPERIENCE.md`;
- `Remember that` changes a later transformation;
- invalid/model-timeout responses leave local adaptation working;
- no UI path depends on exposing raw model output.