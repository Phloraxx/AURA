# API Contracts

## General

Base path:

```text
/v1
```

All JSON endpoints:

- accept JSON,
- return JSON,
- validate request and response with shared Zod schemas,
- include request IDs in logs,
- enforce payload size limits,
- never expose provider error bodies directly to the extension.

## POST /v1/onboarding/respond

### Request

```ts
interface OnboardingRequest {
  profile: CapabilityProfile;
  transcript: Array<{
    role: 'assistant' | 'user';
    content: string;
  }>;
  userResponse: string;
  askedAreas: string[];
}
```

Keep transcript bounded. Summarize older context if needed.

### Response

```ts
interface OnboardingResponse {
  assistantMessage: string;
  profilePatch: CapabilityProfilePatch;
  confidence: number;
  suggestedCalibrationTask:
    | 'text_presentation'
    | 'control_size'
    | 'clutter_focus'
    | null;
  onboardingComplete: boolean;
}
```

## POST /v1/page/analyze

### Request

```ts
interface PageAnalysisRequest {
  page: PageRepresentation;
}
```

Do not send raw scripts, cookies, local storage, hidden password values, or form-entered secrets.

Redact sensitive input values before serialization.

### Response

`SemanticPageAnalysis`

Validate every returned target ID locally before use.

## POST /v1/text/simplify

### Request

```ts
interface SimplifyTextRequest {
  text: string;
  language?: string;
  desiredLevel?: 'simple' | 'very_simple';
}
```

### Response

```ts
interface SimplifyTextResponse {
  simplifiedText: string;
  requiresOriginal: boolean;
  warnings: string[];
}
```

## POST /v1/speech/transcribe

Use `multipart/form-data`.

Fields:

- `audio`: audio blob,
- optional `languageHint`.

Response:

```ts
interface TranscriptionResponse {
  text: string;
  confidence?: number;
}
```

Set a strict duration/size limit for hackathon usage.

## Error envelope

```ts
interface ApiError {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId?: string;
  };
}
```

The UI should translate this into accessible, non-technical messages.

## CORS

Allow only the extension origin(s) required for development/production plus explicitly configured local development origins.

Do not ship wildcard CORS by default.

## Rate limits

Hackathon defaults can be simple:

- onboarding: moderate per-minute limit,
- page analysis: one request per meaningful page state with cache/debounce,
- simplification: user-triggered or bounded automatic requests,
- transcription: strict audio size and request frequency.

## Caching

Cache semantic page analysis by a short-lived hash of the compact page representation if useful.

Never persist raw browsing history as a backend analytics feature in the MVP.
