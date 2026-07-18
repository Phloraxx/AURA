import { useEffect, useRef, useState } from 'react';

import { createAuraApiClient } from '../../lib/api/client';

const apiClient = createAuraApiClient();
const MAX_RECORDING_MS = 60_000;

interface VoiceAnswerProps {
  onTranscript: (text: string) => void;
}

function preferredMimeType(): string | undefined {
  if (!('MediaRecorder' in globalThis)) return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

export function VoiceAnswer({ onTranscript }: VoiceAnswerProps) {
  const [phase, setPhase] = useState<'idle' | 'requesting' | 'recording' | 'transcribing'>(
    'idle',
  );
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const discardRef = useRef(false);

  function releaseMedia() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    recorderRef.current = undefined;
  }

  useEffect(
    () => () => {
      discardRef.current = true;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      releaseMedia();
    },
    [],
  );

  async function startRecording() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in globalThis)) {
      setError('Voice recording is not supported here. Type your answer instead.');
      return;
    }
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener('stop', () => {
        const shouldDiscard = discardRef.current;
        const audio = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        chunksRef.current = [];
        releaseMedia();
        if (shouldDiscard) {
          setPhase('idle');
          return;
        }
        setPhase('transcribing');
        void apiClient
          .transcribeAudio(audio, navigator.language)
          .then(({ text }) => onTranscript(text))
          .catch(() => {
            setError('AURA could not transcribe that recording. Try again or type instead.');
            setPhase('idle');
          });
      });
      recorder.start(250);
      setPhase('recording');
      timeoutRef.current = setTimeout(() => recorder.stop(), MAX_RECORDING_MS);
    } catch {
      releaseMedia();
      setPhase('idle');
      setError('Microphone access was not granted. You can type your answer instead.');
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function cancelRecording() {
    discardRef.current = true;
    stopRecording();
  }

  return (
    <div className="voice-answer">
      <p className="recording-state" role="status" aria-live="polite">
        {phase === 'requesting' ? 'Requesting microphone access…' : null}
        {phase === 'recording' ? 'Microphone active. Recording your answer.' : null}
        {phase === 'transcribing' ? 'Transcribing your answer…' : null}
        {phase === 'idle' ? 'Microphone is off.' : null}
      </p>
      {phase === 'idle' ? (
        <button className="primary" type="button" onClick={() => void startRecording()}>
          Start recording
        </button>
      ) : null}
      {phase === 'recording' ? (
        <div className="actions compact-actions">
          <button className="primary recording-button" type="button" onClick={stopRecording}>
            Stop and use recording
          </button>
          <button className="secondary" type="button" onClick={cancelRecording}>
            Cancel recording
          </button>
        </div>
      ) : null}
      <p className="route-note">
        Recording starts only when you choose it and stops automatically after one minute.
        Audio is sent directly to the configured AURA API and is not stored in your profile.
      </p>
      {error ? <p className="error-message">{error}</p> : null}
    </div>
  );
}
