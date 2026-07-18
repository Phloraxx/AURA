import { apiErrorSchema, transcriptionResponseSchema } from '@aura/shared';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import type { STTProvider } from './providers/index.js';

function audioForm(type = 'audio/webm'): FormData {
  const form = new FormData();
  form.append('audio', new Blob(['voice bytes'], { type }), 'answer.webm');
  form.append('languageHint', 'en');
  return form;
}

describe('POST /v1/speech/transcribe', () => {
  it('validates multipart audio and returns a normalized transcript', async () => {
    const transcribe = vi.fn<STTProvider['transcribe']>().mockResolvedValue({
      text: 'Larger text would help me.',
      confidence: 0.9,
    });
    const app = createApp({ sttProvider: { transcribe } });

    const response = await app.request('/v1/speech/transcribe', {
      method: 'POST',
      body: audioForm(),
    });

    expect(response.status).toBe(200);
    expect(transcriptionResponseSchema.parse(await response.json())).toEqual({
      text: 'Larger text would help me.',
      confidence: 0.9,
    });
    expect(transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'answer.webm',
        languageHint: 'en',
        mimeType: 'audio/webm',
      }),
    );
  });

  it('rejects missing and unsupported recordings before provider calls', async () => {
    const transcribe = vi.fn<STTProvider['transcribe']>();
    const app = createApp({ sttProvider: { transcribe } });

    const missing = await app.request('/v1/speech/transcribe', {
      method: 'POST',
      body: new FormData(),
    });
    const unsupported = await app.request('/v1/speech/transcribe', {
      method: 'POST',
      body: audioForm('application/octet-stream'),
    });

    expect(missing.status).toBe(400);
    expect(apiErrorSchema.parse(await missing.json()).error.code).toBe(
      'audio_required',
    );
    expect(unsupported.status).toBe(415);
    expect(apiErrorSchema.parse(await unsupported.json()).error.code).toBe(
      'unsupported_audio',
    );
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('uses the speech-specific size limit instead of the JSON request limit', async () => {
    const transcribe = vi.fn<STTProvider['transcribe']>().mockResolvedValue({
      text: 'This recording is larger than the onboarding JSON limit.',
    });
    const app = createApp({ sttProvider: { transcribe } });
    const form = new FormData();
    form.append(
      'audio',
      new Blob([new Uint8Array(96 * 1024)], { type: 'audio/webm' }),
      'answer.webm',
    );

    const response = await app.request('/v1/speech/transcribe', {
      method: 'POST',
      body: form,
    });

    expect(response.status).toBe(200);
    expect(transcribe).toHaveBeenCalledOnce();
  });
});
