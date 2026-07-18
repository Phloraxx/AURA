# Data Model

## Capability profile

```ts
type EvidenceSource =
  | 'self_report'
  | 'calibration'
  | 'explicit_preference';

interface CapabilityDimension {
  /**
   * 0 = the interface should not rely on this capability.
   * 1 = no significant difficulty reported for this capability.
   * This is a product score, not a clinical measurement.
   */
  capacity: number;

  /** Confidence in the current estimate, 0..1. */
  confidence: number;

  /** Why the estimate exists. */
  sources: EvidenceSource[];
}

interface CapabilityProfile {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  dimensions: {
    visual: CapabilityDimension;
    auditory: CapabilityDimension;
    motor: CapabilityDimension;
    cognitive: CapabilityDimension;
    attention: CapabilityDimension;
    language: CapabilityDimension;
  };

  modalities: {
    preferredInput: Array<'pointer' | 'keyboard' | 'voice'>;
    preferredOutput: Array<'visual' | 'speech'>;
    screenReader: boolean;
  };

  preferences: {
    textScale: number;
    lineSpacing: number;
    readingWidth: 'normal' | 'narrow' | 'very_narrow';
    contrast: 'default' | 'enhanced';
    reduceMotion: boolean;
    focusMode: boolean;
    simplifyLanguage: boolean;
    enlargeTargets: boolean;
    targetSizePx: number;
    stepByStepForms: boolean;
    hideDistractions: boolean;
    clarifyControls: boolean;
  };
}
```

## Default profile

Do not initialize every capability as impaired. Start neutral:

```ts
const neutralDimension = {
  capacity: 1,
  confidence: 0,
  sources: [],
};
```

Preferences should default to no adaptation until onboarding or explicit user action changes them.

## Profile update rules

### Explicit statement

Example: "I am blind and use a screen reader."

- visual capacity can move strongly toward 0,
- confidence can be high,
- `screenReader = true`,
- do not ask irrelevant visual-preference questions.

### Ambiguous statement

Example: "Websites are hard to use."

- do not significantly change a capability dimension,
- ask a targeted functional follow-up.

### Calibration

Calibration is weaker evidence than explicit self-report.

Example: selecting a large text card should update `textScale` strongly as a preference, but should only weakly affect the visual capability score.

## Page representation

The extension sends a compact semantic snapshot, never executable scripts.

```ts
type SemanticElementType =
  | 'heading'
  | 'paragraph'
  | 'main'
  | 'nav'
  | 'aside'
  | 'link'
  | 'button'
  | 'form'
  | 'input'
  | 'label'
  | 'image'
  | 'landmark'
  | 'other';

interface PageElementSummary {
  id: string;
  type: SemanticElementType;
  tagName: string;
  text?: string;
  accessibleName?: string;
  role?: string;
  headingLevel?: number;
  inputType?: string;
  hrefKind?: 'same_origin' | 'external' | 'anchor' | 'none';
  visible: boolean;
  interactive: boolean;
  disabled?: boolean;
  bounds?: {
    width: number;
    height: number;
  };
}

interface PageRepresentation {
  version: 1;
  title: string;
  origin: string;
  pathname: string;
  language?: string;
  elements: PageElementSummary[];
}
```

Set hard limits on element count and text length.

## Semantic analysis

```ts
interface SemanticPageAnalysis {
  version: 1;
  mainContentIds: string[];
  primaryActionIds: string[];
  navigationIds: string[];
  distractions: Array<{
    id: string;
    confidence: number;
    reason: string;
  }>;
  ambiguousControls: Array<{
    id: string;
    suggestedLabel: string;
    confidence: number;
  }>;
  complexTextBlocks: Array<{
    id: string;
    confidence: number;
  }>;
  formGroups?: Array<{
    label: string;
    elementIds: string[];
  }>;
}
```

After Zod validation, reject any ID not present in the current `ElementRegistry`.

## Adaptation plan

```ts
type AdaptationKind =
  | 'increaseTextScale'
  | 'increaseLineSpacing'
  | 'limitReadingWidth'
  | 'improveContrast'
  | 'reduceMotion'
  | 'enlargeTargets'
  | 'enhanceFocusIndicators'
  | 'focusMainContent'
  | 'collapseDistractions'
  | 'highlightPrimaryAction'
  | 'clarifyAmbiguousControls'
  | 'simplifyText';

interface AdaptationInstruction {
  id: string;
  kind: AdaptationKind;
  source: 'deterministic' | 'semantic_ai' | 'manual';
  targetIds?: string[];
  params?: Record<string, unknown>;
  reason: string;
}

interface AdaptationPlan {
  version: 1;
  instructions: AdaptationInstruction[];
}
```

## Storage

For MVP:

- profiles: `chrome.storage.local`,
- active profile ID: `chrome.storage.local`,
- ephemeral analysis/cache: memory or `chrome.storage.session`,
- API secrets: backend only.

Do not store full page snapshots persistently unless a future feature clearly requires it.
