import { describe, expect, it } from 'vitest';

import {
  parseMacVoiceList,
  preferredNativeVoice,
} from './native-speech';

describe('parseMacVoiceList', () => {
  it('keeps multi-word macOS voice names and language identifiers', () => {
    expect(
      parseMacVoiceList(
        [
          'Samantha            en_US    # Hello! My name is Samantha.',
          'Eddy (English (UK)) en_GB    # Hello! My name is Eddy.',
        ].join('\n'),
      ),
    ).toEqual([
      { id: 'Samantha', language: 'en_US', name: 'Samantha' },
      {
        id: 'Eddy (English (UK))',
        language: 'en_GB',
        name: 'Eddy (English (UK))',
      },
    ]);
  });

  it('prefers an enhanced English voice and then the familiar US AURA voices', () => {
    expect(
      preferredNativeVoice([
        { id: 'Daniel', language: 'en_GB', name: 'Daniel' },
        { id: 'Samantha', language: 'en_US', name: 'Samantha' },
        {
          id: 'Ava (Premium)',
          language: 'en_US',
          name: 'Ava (Premium)',
        },
      ])?.id,
    ).toBe('Ava (Premium)');
    expect(
      preferredNativeVoice([
        { id: 'Daniel', language: 'en_GB', name: 'Daniel' },
        { id: 'Samantha', language: 'en_US', name: 'Samantha' },
      ])?.id,
    ).toBe('Samantha');
  });
});
