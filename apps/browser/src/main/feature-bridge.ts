import { Buffer } from 'node:buffer';

import {
  app,
  ipcMain,
  systemPreferences,
  webContents,
  type WebContents,
} from 'electron';
import OpenAI, { toFile } from 'openai';

import { IPC_CHANNELS } from '../shared/contracts';
import {
  localRecomposeRequestSchema,
  localRecomposeResultSchema,
} from '../shared/recompose';
import {
  voiceTranscriptionRequestSchema,
  voiceTranscriptionResponseSchema,
} from '../shared/voice';
import { buildPageRecomposePlan } from '../page-recompose/plan';
import { createLocalRecomposeProvider } from './ai/local-recompose-provider';

const TRANSCRIPTION_MODEL =
  process.env.AURA_TRANSCRIPTION_MODEL?.trim() || 'gpt-4o-mini-transcribe';
const localProvider = createLocalRecomposeProvider();
let transcriptionClient: OpenAI | null = null;

function sameDocument(left: string, right: string): boolean {
  try {
    const a = new URL(left);
    const b = new URL(right);
    a.hash = '';
    b.hash = '';
    return a.href === b.href;
  } catch {
    return left === right;
  }
}

function findPageWebContents(url: string): WebContents | null {
  const candidates = webContents
    .getAllWebContents()
    .filter((contents) => !contents.isDestroyed())
    .filter((contents) => {
      const current = contents.getURL();
      return current.startsWith('http://') || current.startsWith('https://');
    });
  return (
    candidates.find((contents) => sameDocument(contents.getURL(), url)) ??
    candidates[0] ??
    null
  );
}

function getTranscriptionClient(): OpenAI {
  if (transcriptionClient !== null) return transcriptionClient;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OpenAI is not configured for AURA voice transcription.');
  }
  transcriptionClient = new OpenAI({
    apiKey,
    maxRetries: 1,
    timeout: 25_000,
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  });
  return transcriptionClient;
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

ipcMain.handle(IPC_CHANNELS.applyLocalRecompose, async (_event, untrusted) => {
  const request = localRecomposeRequestSchema.parse(untrusted);
  const result = await localProvider.analyze(request);
  if (result.output === null) {
    return localRecomposeResultSchema.parse({
      ...result,
      applied: false,
    });
  }

  const plan = buildPageRecomposePlan({
    currentGoal: request.currentGoal,
    local: result.output,
    page: request.page,
    preset: request.preset,
    source: 'local',
    subtitle: 'AURA used the local model to choose the parts of this real page that matter most.',
  });
  const target = findPageWebContents(request.page.url);
  if (target === null) {
    return localRecomposeResultSchema.parse({
      ...result,
      applied: false,
      error: 'The current webpage changed before local personalization could be applied.',
    });
  }
  target.send(IPC_CHANNELS.adaptationCommand, {
    pageId: request.page.pageId,
    plan,
    revision: request.page.revision,
    type: 'apply-recompose',
  });
  return localRecomposeResultSchema.parse({
    ...result,
    applied: true,
  });
});

ipcMain.handle(IPC_CHANNELS.ensureMicrophoneAccess, async () => {
  if (process.platform !== 'darwin') return true;
  const current = systemPreferences.getMediaAccessStatus('microphone');
  if (current === 'granted') return true;
  if (current === 'denied' || current === 'restricted') return false;
  return systemPreferences.askForMediaAccess('microphone');
});

ipcMain.handle(IPC_CHANNELS.transcribeVoice, async (_event, untrusted) => {
  const request = voiceTranscriptionRequestSchema.parse(untrusted);
  const startedAt = performance.now();
  const file = await toFile(
    Buffer.from(request.bytes),
    `aura-voice.${extensionForMimeType(request.mimeType)}`,
    { type: request.mimeType },
  );
  const transcription = await getTranscriptionClient().audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
  });
  return voiceTranscriptionResponseSchema.parse({
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    text: transcription.text,
  });
});

void app.whenReady().then(async () => {
  const warm = await localProvider.warm();
  console.info(
    warm
      ? '[AURA] Local Qwen fast path is warm.'
      : '[AURA] Local Qwen fast path unavailable; deterministic/cloud paths remain active.',
  );
});
