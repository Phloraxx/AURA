import type { RescueSuggestion as RescueSuggestionData } from '@aura/shared';

interface RescueSuggestionProps {
  suggestion: RescueSuggestionData;
  onAccept: () => void;
  onDismiss: () => void;
}

export function RescueSuggestion({ suggestion, onAccept, onDismiss }: RescueSuggestionProps) {
  return (
    <section className="card rescue-card" aria-labelledby="rescue-title" role="alert">
      <p className="section-kicker">AURA Rescue</p>
      <h2 id="rescue-title">{suggestion.title}</h2>
      <p className="help-text">{suggestion.message}</p>
      <div className="actions compact-actions">
        <button className="primary" type="button" onClick={onAccept}>Try this</button>
        <button className="secondary" type="button" onClick={onDismiss}>Not now</button>
      </div>
    </section>
  );
}
