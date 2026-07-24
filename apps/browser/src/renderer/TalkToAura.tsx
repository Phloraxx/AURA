import { type FormEvent, useEffect, useRef, useState } from 'react';

import type { ConversationState } from '../shared/conversation';
import type { BrowserProfile } from '../shared/profile';

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
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMemoryDrafts(profile.learnedPreferences);
  }, [profile.learnedPreferences]);

  useEffect(() => {
    logRef.current?.scrollTo({
      behavior: profile.preferences.reduceMotion ? 'auto' : 'smooth',
      top: logRef.current.scrollHeight,
    });
  }, [profile.preferences.reduceMotion, state.messages, state.status]);

  async function send(nextMessage: string): Promise<void> {
    const trimmed = nextMessage.trim();
    if (!trimmed || disabled || state.status === 'responding') return;
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
            Ask naturally. AURA can adjust the page, explain it, guide a goal,
            or remember an explicit preference.
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
        <label htmlFor="aura-message">Ask or tell AURA</label>
        <div>
          <textarea
            disabled={disabled || state.status === 'responding'}
            id="aura-message"
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(message);
              }
            }}
            placeholder="For example: Help me apply, or make these controls bigger."
            rows={2}
            value={message}
          />
          <button
            className="send-button"
            disabled={
              disabled ||
              state.status === 'responding' ||
              message.trim().length === 0
            }
            type="submit"
          >
            Send
          </button>
        </div>
      </form>

      <details
        className="memory-editor"
        onToggle={(event) =>
          setMemoryOpen(event.currentTarget.open)
        }
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
          <button className="primary-compact" onClick={() => void saveMemory()} type="button">
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
