import type { TranscriptionResponse } from '@aura/shared';

export interface TranscriptionInput {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  languageHint?: string;
}

export interface STTProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResponse>;
}

