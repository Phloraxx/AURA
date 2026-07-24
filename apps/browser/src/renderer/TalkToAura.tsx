import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { ConversationState } from '../shared/conversation';
import type { BrowserProfile } from '../shared/profile';
import { MicrophoneIcon, SpeakerIcon } from './Brand';

const SUGGESTIONS = [
  'Make this easier',
  'Explain this page',
  'Help me with my goal',
] as const;

interface TalkToAuraProps {
  disabled: boolean;
  onConfirmMemory: () => Promise<void>;
  onDismissMemory: () => Promise<void>;
  onSend: (message: string) => Promise<void>;
  onUpdateMemory: (preferences: string[]) => Promise<void>;
  profile: BrowserProfile;
  state: ConversationState;
}

type VoiceState = 'idle' | 'listening' | 'transcribing';

function shortSpokenReply(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  const sentences = compact.match(/[^.!?]+[.!?]?/g) ?? [compact];
  const first = sentences.slice(0, 2).join(' ').trim();
  return first.length <= 240 ? first : `${first.slice(0, 237).trim()}…`;
}

function chooseRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const candidate of [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return undefined;
}

function latestAssistantMessageId(state: ConversationState): string | null {
  return (
    [...state.messages].reverse().find((item) => item.role === 'assistant')?.id ??
    null
  );
}

export function TalkToAura({
  disabled,
  onConfirmMemory,
  onDismissMemory,
  onSend,
  onUpdateMemory,
  profile,
  state,
}: TalkToAuraProps): React.JSX.Element {
  const [message, setMessage] = useState('');
  const [memoryDrafts, setMemoryDrafts] = useState(
    profile.learnedPreferences,
  );
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceReplies, setVoiceReplies] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const lastSpokenMessageId = useRef<string | null>(null);

  useEffect(() => {
    setMemoryDrafts(profile.learnedPreferences);
  }, [profile.learnedPreferences]);

  useEffect(() => {
    logRef.current?.scrollTo({
      behavior: profile.preferences.reduceMotion ? 'auto' : 'smooth',
      top: logRef.current.scrollHeight,
    });
  }, [profile.preferences.reduceMotion, state.messages, state.status]);

  useEffect(() => {
    if (
      !voiceReplies ||
      voiceState !== 'idle' ||
      state.status === 'responding'
    ) {
      return;
    }
    const latest = [...state.messages]
      .reverse()
      .find((item) => item.role === 'assistant');
    if (
      latest === undefined ||
      latest.id === lastSpokenMessageId.current ||
      !('speechSynthesis' in window)
    ) {
      return;
    }
    lastSpokenMessageId.current = latest.id;
    const utterance = new SpeechSynthesisUtterance(
      shortSpokenReply(latest.content),
    );
    utterance.rate = 0.98;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice =
      voices.find(
        (voice) =>
          voice.lang.toLocaleLowerCase().startsWith('en') &&
          /(samantha|ava|daniel|serena)/i.test(voice.name),
      ) ??
      voices.find((voice) => voice.lang.toLocaleLowerCase().startsWith('en')) ??
      null;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [state.messages, state.status, voiceReplies, voiceState]);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
      }
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  async function send(nextMessage: string): Promise<void> {
    const trimmed = nextMessage.trim();
    if (!trimmed || disabled || state.status === 'responding') return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setMessage('');
    setError(null);
    try {
      await onSend(trimmed);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not respond just now.',
      );
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void send(message);
  }

  function releaseMicrophone(): void {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  async function transcribeRecording(blob: Blob): Promise<void> {
    if (blob.size === 0) {
      setVoiceState('idle');
      setError('AURA did not receive any microphone audio.');
      return;
    }
    setVoiceState('transcribing');
    try {
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      const result = await window.aura.transcribeVoice({
        bytes,
        mimeType: blob.type || 'audio/webm',
      });
      setVoiceState('idle');
      setVoiceReplies(true);
      void send(result.text);
    } catch (caughtError) {
      setVoiceState('idle');
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not transcribe that voice request.',
      );
    }
  }

  async function startListening(): Promise<void> {
    if (
      disabled ||
      state.status === 'responding' ||
      voiceState !== 'idle'
    ) {
      return;
    }
    setError(null);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError('Microphone dictation is not available in this build.');
      return;
    }
    try {
      const allowed = await window.aura.ensureMicrophoneAccess();
      if (!allowed) {
        setError('Microphone access is disabled for AURA in macOS settings.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = chooseRecorderMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType === undefined ? undefined : { mimeType },
      );
      recorderRef.current = recorder;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener(
        'stop',
        () => {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || mimeType || 'audio/webm',
          });
          chunksRef.current = [];
          releaseMicrophone();
          void transcribeRecording(blob);
        },
        { once: true },
      );
      lastSpokenMessageId.current = latestAssistantMessageId(state);
      recorder.start(200);
      setVoiceReplies(true);
      setVoiceState('listening');
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 20_000);
    } catch (caughtError) {
      releaseMicrophone();
      setVoiceState('idle');
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not start the microphone.',
      );
    }
  }

  function stopListening(): void {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  }

  async function saveMemory(): Promise<void> {
    setError(null);
    try {
      await onUpdateMemory(
        memoryDrafts.map((item) => item.trim()).filter(Boolean),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not update memory.',
      );
    }
  }

  async function confirmMemory(): Promise<void> {
    setError(null);
    try {
      await onConfirmMemory();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not remember that preference.',
      );
    }
  }

  async function dismissMemory(): Promise<void> {
    setError(null);
    try {
      await onDismissMemory();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not dismiss that preference.',
      );
    }
  }

  async function forgetMemory(preferences: string[]): Promise<void> {
    setMemoryDrafts(preferences);
    setError(null);
    try {
      await onUpdateMemory(preferences);
    } catch (caughtError) {
      setMemoryDrafts(profile.learnedPreferences);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'AURA could not forget that preference.',
      );
    }
  }

  return (
    <section className="talk-card" aria-labelledby="talk-title">
      <div className="talk-heading">
        <div>
          <p className="eyebrow">Talk to AURA</p>
          <h2 id="talk-title">What do you want to do here?</h2>
        </div>
        {state.currentIntent === null ? null : (
          <span className="intent-chip">Goal: {state.currentIntent.goal}</span>
        )}
      </div>

      {state.messages.length === 0 ? (
        <div className="conversation-empty">
          <p>
            Type or speak naturally. AURA can adjust the page, explain it,
            guide a goal, or remember an explicit preference.
          </p>
          <div className="suggestion-row" aria-label="Suggested requests">
            {SUGGESTIONS.map((suggestion) => (
              <button
                disabled={disabled}
                key={suggestion}
                onClick={() => void send(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          aria-label="Conversation with AURA"
          aria-live="polite"
          className="conversation-log"
          ref={logRef}
          role="log"
          tabIndex={0}
        >
          {state.messages.map((item) => (
            <div className={`message ${item.role}`} key={item.id}>
              <strong>{item.role === 'user' ? 'You' : 'AURA'}</strong>
              <p>{item.content}</p>
            </div>
          ))}
          {state.status === 'responding' ? (
            <div className="message assistant waiting">
              <strong>AURA</strong>
              <p>Working with this page and your preferences…</p>
            </div>
          ) : null}
        </div>
      )}

      {state.pendingMemory === null ? null : (
        <div className="memory-proposal" role="status">
          <strong>Remember this preference?</strong>
          <p>{state.pendingMemory.preference}</p>
          <span>{state.pendingMemory.reason}</span>
          <div>
            <button
              className="primary-compact"
              onClick={() => void confirmMemory()}
              type="button"
            >
              Remember
            </button>
            <button onClick={() => void dismissMemory()} type="button">
              Just for now
            </button>
          </div>
        </div>
      )}

      <form className="conversation-form" onSubmit={submit}>
        <div className="conversation-label-row">
          <label htmlFor="aura-message">Ask or tell AURA</label>
          <button
            aria-label={
              voiceReplies
                ? 'Turn spoken AURA replies off'
                : 'Turn spoken AURA replies on'
            }
            aria-pressed={voiceReplies}
            className="voice-reply-toggle"
            onClick={() => {
              if (voiceReplies && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              if (!voiceReplies) {
                lastSpokenMessageId.current = latestAssistantMessageId(state);
              }
              setVoiceReplies(!voiceReplies);
            }}
            type="button"
          >
            <SpeakerIcon
              aria-hidden="true"
              className="interface-icon compact"
            />
            {voiceReplies ? 'Voice on' : 'Voice off'}
          </button>
        </div>
        <div className="conversation-composer">
          <textarea
            disabled={
              disabled ||
              state.status === 'responding' ||
              voiceState === 'transcribing'
            }
            id="aura-message"
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(message);
              }
            }}
            placeholder={
              voiceState === 'listening'
                ? 'Listening…'
                : voiceState === 'transcribing'
                  ? 'Turning your voice into a request…'
                  : 'For example: Find a logo designer under ₹5,000.'
            }
            rows={2}
            value={message}
          />
          <button
            aria-label={
              voiceState === 'listening' ? 'Stop listening' : 'Speak to AURA'
            }
            className={
              voiceState === 'listening'
                ? 'voice-button listening'
                : 'voice-button'
            }
            disabled={
              disabled ||
              state.status === 'responding' ||
              voiceState === 'transcribing'
            }
            onClick={() =>
              voiceState === 'listening'
                ? stopListening()
                : void startListening()
            }
            type="button"
          >
            <MicrophoneIcon aria-hidden="true" className="interface-icon" />
          </button>
          <button
            className="send-button"
            disabled={
              disabled ||
              state.status === 'responding' ||
              voiceState !== 'idle' ||
              message.trim().length === 0
            }
            type="submit"
          >
            Send
          </button>
        </div>
        {voiceState === 'listening' ? (
          <p className="voice-status" role="status">
            <span aria-hidden="true" /> Listening — tap the microphone when
            you’re done.
          </p>
        ) : voiceState === 'transcribing' ? (
          <p className="voice-status" role="status">
            Turning that into a request…
          </p>
        ) : null}
      </form>

      <details
        className="memory-editor"
        onToggle={(event) => setMemoryOpen(event.currentTarget.open)}
        open={memoryOpen}
      >
        <summary>What AURA remembers</summary>
        <p>
          Only preferences you explicitly taught AURA are stored here. You can
          edit or forget them.
        </p>
        {memoryDrafts.length === 0 ? (
          <p className="muted">No learned preferences yet.</p>
        ) : (
          <div className="memory-list">
            {memoryDrafts.map((preference, index) => (
              <div className="memory-item" key={`memory-${index}`}>
                <label htmlFor={`memory-${index}`}>
                  Preference {index + 1}
                </label>
                <textarea
                  id={`memory-${index}`}
                  onChange={(event) => {
                    const next = [...memoryDrafts];
                    next[index] = event.target.value;
                    setMemoryDrafts(next);
                  }}
                  rows={2}
                  value={preference}
                />
                <button
                  onClick={() => {
                    const next = memoryDrafts.filter(
                      (_item, itemIndex) => itemIndex !== index,
                    );
                    void forgetMemory(next);
                  }}
                  type="button"
                >
                  Forget
                </button>
              </div>
            ))}
          </div>
        )}
        {memoryDrafts.length > 0 ? (
          <button
            className="primary-compact"
            onClick={() => void saveMemory()}
            type="button"
          >
            Save memory
          </button>
        ) : null}
      </details>

      {error === null ? null : (
        <p className="conversation-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
