import { z } from 'zod';

export const nativeSpeechVoiceSchema = z.object({
  id: z.string().trim().min(1),
  language: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export const nativeSpeechVoicesSchema = z.array(nativeSpeechVoiceSchema);

export const nativeSpeechRequestSchema = z.object({
  rate: z.number().int().min(120).max(260).default(185),
  text: z.string().trim().min(1).max(500),
  voiceId: z.string().trim().min(1).nullable(),
});

export type NativeSpeechRequest = z.infer<typeof nativeSpeechRequestSchema>;
export type NativeSpeechVoice = z.infer<typeof nativeSpeechVoiceSchema>;

export function nativeVoiceScore(voice: NativeSpeechVoice): number {
  const name = voice.name.toLocaleLowerCase();
  const language = voice.language.toLocaleLowerCase();
  let score = language.startsWith('en') ? 100 : 0;
  if (language === 'en_us') score += 20;
  if (/(premium|enhanced)/.test(name)) score += 100;
  if (/\bava\b/.test(name)) score += 60;
  else if (/\bsamantha\b/.test(name)) score += 55;
  else if (/\bserena\b/.test(name)) score += 50;
  else if (/\bdaniel\b/.test(name)) score += 45;
  else if (/\b(allison|zoe|susan)\b/.test(name)) score += 35;
  return score;
}

export function preferredNativeVoice(
  voices: NativeSpeechVoice[],
): NativeSpeechVoice | null {
  return (
    [...voices].sort(
      (left, right) =>
        nativeVoiceScore(right) - nativeVoiceScore(left) ||
        left.name.localeCompare(right.name),
    )[0] ?? null
  );
}

export function parseMacVoiceList(output: string): NativeSpeechVoice[] {
  const voices = output
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#/.exec(line);
      if (match === null) return null;
      const name = match[1]?.trim() ?? '';
      const language = match[2]?.trim() ?? '';
      return { id: name, language, name };
    })
    .filter((voice): voice is NativeSpeechVoice => voice !== null);
  return nativeSpeechVoicesSchema.parse(voices);
}
