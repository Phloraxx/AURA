import type { RecomposePreset } from '../shared/recompose';

const PRESETS: ReadonlyArray<{
  description: string;
  label: string;
  value: RecomposePreset;
}> = [
  {
    description: 'Your Learn Me profile and remembered preferences.',
    label: 'My profile',
    value: 'personalized',
  },
  {
    description: 'Less noise, fewer simultaneous choices, clearer priority.',
    label: 'Clear & Calm',
    value: 'clear_calm',
  },
  {
    description: 'Large reflowed content and stronger visual hierarchy.',
    label: 'Easier to See',
    value: 'easier_to_see',
  },
  {
    description: 'Large explicit controls with generous spacing.',
    label: 'Easy to Control',
    value: 'easy_to_control',
  },
  {
    description: 'One clear stage at a time with obvious next actions.',
    label: 'Step by Step',
    value: 'step_by_step',
  },
];

interface RecomposePresetsProps {
  disabled: boolean;
  onChange: (preset: RecomposePreset) => void;
  value: RecomposePreset;
}

export function RecomposePresets({
  disabled,
  onChange,
  value,
}: RecomposePresetsProps): React.JSX.Element {
  return (
    <section className="recompose-presets" aria-labelledby="recompose-presets-title">
      <div className="recompose-presets-heading">
        <div>
          <p className="eyebrow">Try another experience</p>
          <h2 id="recompose-presets-title">How should this page work?</h2>
        </div>
        <span>Same website · different interface</span>
      </div>
      <div className="recompose-preset-grid" role="radiogroup" aria-label="AURA experience profile">
        {PRESETS.map((preset) => (
          <button
            aria-checked={value === preset.value}
            className={value === preset.value ? 'recompose-preset selected' : 'recompose-preset'}
            disabled={disabled}
            key={preset.value}
            onClick={() => onChange(preset.value)}
            role="radio"
            type="button"
          >
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
