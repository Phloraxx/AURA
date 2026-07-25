import { Buffer } from 'node:buffer';

import {
  app,
  ipcMain,
  session,
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

function isAuraShellWebContents(contents: WebContents | null): boolean {
  if (contents === null || contents.isDestroyed()) return false;
  const currentUrl = contents.getURL();
  const devRendererUrl = process.env.ELECTRON_RENDERER_URL?.trim();
  if (devRendererUrl && currentUrl.startsWith(devRendererUrl)) return true;
  return currentUrl.startsWith('file://');
}

function configureShellMediaPermissions(): void {
  const shellSession = session.defaultSession;

  // Chromium performs a permission check before the request callback for many
  // media APIs. Permit media checks only for AURA's trusted local shell; remote
  // websites in the WebContentsView stay denied.
  shellSession.setPermissionCheckHandler((contents, permission) => {
    return permission === 'media' && isAuraShellWebContents(contents);
  });

  shellSession.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      if (permission !== 'media' || !isAuraShellWebContents(contents)) {
        callback(false);
        return;
      }
      const mediaTypes =
        'mediaTypes' in details && Array.isArray(details.mediaTypes)
          ? details.mediaTypes
          : [];
      callback(
        mediaTypes.length > 0 && mediaTypes.every((mediaType) => mediaType === 'audio'),
      );
    },
  );
}

function findPageWebContents(url: string): WebContents | null {
  return (
    webContents
      .getAllWebContents()
      .filter((contents) => !contents.isDestroyed())
      .find((contents) => {
        const current = contents.getURL();
        return (
          (current.startsWith('http://') || current.startsWith('https://')) &&
          sameDocument(current, url)
        );
      }) ?? null
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

function sendRecomposePlan(
  request: ReturnType<typeof localRecomposeRequestSchema.parse>,
  plan: ReturnType<typeof buildPageRecomposePlan>,
): boolean {
  const target = findPageWebContents(request.page.url);
  if (target === null) return false;
  target.send(IPC_CHANNELS.adaptationCommand, {
    pageId: request.page.pageId,
    plan,
    reduceMotion: request.profile.preferences.reduceMotion,
    revision: request.page.revision,
    type: 'apply-recompose',
  });
  return true;
}

function deterministicPlan(
  request: ReturnType<typeof localRecomposeRequestSchema.parse>,
) {
  return buildPageRecomposePlan({
    currentGoal: request.currentGoal,
    page: request.page,
    preset: request.preset,
    source: 'deterministic',
    subtitle:
      'AURA is rebuilding this real page now while local and cloud intelligence refine it.',
  });
}

ipcMain.handle(IPC_CHANNELS.startRecompose, (_event, untrusted) => {
  const request = localRecomposeRequestSchema.parse(untrusted);
  return sendRecomposePlan(request, deterministicPlan(request));
});

ipcMain.handle(IPC_CHANNELS.applyLocalRecompose, async (_event, untrusted) => {
  const request = localRecomposeRequestSchema.parse(untrusted);

  // The visual transformation starts before the local model returns. This makes
  // model latency visible as progressive refinement instead of a loading wait.
  if (!sendRecomposePlan(request, deterministicPlan(request))) {
    return localRecomposeResultSchema.parse({
      applied: false,
      durationMs: 0,
      error:
        'The current webpage changed before AURA could start personalization.',
      model: process.env.AURA_LOCAL_MODEL?.trim() || 'qwen3.5:4b-mlx',
      output: null,
    });
  }

  const result = await localProvider.analyze(request);
  if (result.output === null) {
    return localRecomposeResultSchema.parse({
      ...result,
      // `applied` describes the local-model refinement only. The deterministic
      // Recompose surface remains active, but the UI must not claim Qwen
      // successfully personalized the page when the local model failed.
      applied: false,
    });
  }

  const plan = buildPageRecomposePlan({
    currentGoal: request.currentGoal,
    local: result.output,
    page: request.page,
    preset: request.preset,
    source: 'local',
    subtitle:
      'AURA used the local model to choose the parts of this real page that matter most.',
  });
  if (!sendRecomposePlan(request, plan)) {
    return localRecomposeResultSchema.parse({
      ...result,
      applied: false,
      error:
        'The current webpage changed before local personalization could be applied.',
    });
  }
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
  configureShellMediaPermissions();
  const warm = await localProvider.warm();
  console.info(
    warm
      ? '[AURA] Local Qwen fast path is warm.'
      : '[AURA] Local Qwen fast path unavailable; deterministic/cloud paths remain active.',
  );
});
