import { useId, type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;
export type AuraGuideMood =
  | 'welcoming'
  | 'asking'
  | 'listening'
  | 'thinking'
  | 'celebrating'
  | 'guiding'
  | 'attention';

export function AuraGuide({
  mood = 'welcoming',
}: {
  mood?: AuraGuideMood;
}): React.JSX.Element {
  const id = useId().replaceAll(':', '');
  return (
    <svg
      aria-label="AURA Guide"
      className={`aura-guide mood-${mood}`}
      role="img"
      viewBox="0 0 180 190"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`guide-body-${id}`} x1="45" x2="137" y1="31" y2="166">
          <stop stopColor="#347557" />
          <stop offset="1" stopColor="#173f32" />
        </linearGradient>
        <linearGradient id={`guide-leaf-${id}`} x1="40" x2="140" y1="30" y2="100">
          <stop stopColor="#8bcf9b" />
          <stop offset="1" stopColor="#4d9e70" />
        </linearGradient>
      </defs>
      <g className="guide-crown">
        <path d="M54 61C36 49 38 29 55 27c6-16 27-15 34-2 13-15 37-7 36 12 20-2 26 24 9 34H55c-9-2-14-5-17-12 4 2 10 3 16 2Z" fill={`url(#guide-leaf-${id})`} />
        <path d="M73 49 62 23M96 50l7-32M116 54l20-20" fill="none" stroke="#285d46" strokeLinecap="round" strokeWidth="7" />
        <circle cx="61" cy="25" fill="#b8e5a9" r="8" />
        <circle cx="104" cy="18" fill="#8ed4a0" r="9" />
        <circle cx="137" cy="34" fill="#a9dda2" r="8" />
      </g>
      <path className="guide-body" d="M56 59c-7 21-9 46-7 73 2 23 17 38 40 38 25 0 41-15 42-39 1-29-2-53-9-72-19 8-47 8-66 0Z" fill={`url(#guide-body-${id})`} />
      <path d="M65 77c-10 16-18 35-19 55M116 78c11 17 18 35 18 55" fill="none" stroke="#2d6a4f" strokeLinecap="round" strokeWidth="12" />
      <path d="M73 164 66 181M106 164l8 17" stroke="#173f32" strokeLinecap="round" strokeWidth="11" />
      <g className="guide-face">
        <ellipse cx="76" cy="96" fill="#eff8ec" rx="7" ry="8" />
        <ellipse cx="105" cy="96" fill="#eff8ec" rx="7" ry="8" />
        <circle cx="78" cy="98" fill="#183e32" r="3" />
        <circle cx="103" cy="98" fill="#183e32" r="3" />
        <path className="guide-mouth" d="M78 116c7 7 17 7 24 0" fill="none" stroke="#d9ead9" strokeLinecap="round" strokeWidth="4" />
      </g>
      <path className="guide-heart-leaf" d="M145 70c-13-15-31 3-12 20 19-17 1-35-12-20" fill="#8bcf9b" />
    </svg>
  );
}

/**
 * AURA Halo
 *
 * The event-video identity is a luminous, almost-complete ring: the web is one
 * continuous space, while the small opening represents the point where AURA
 * adapts the experience around the person. It is deliberately not a letter A,
 * medical symbol, eye, or generic sparkle.
 */
export function AuraMark(props: IconProps): React.JSX.Element {
  const id = useId().replaceAll(':', '');
  const gradientId = `aura-halo-${id}`;
  const glowId = `aura-glow-${id}`;

  return (
    <svg
      aria-hidden={props['aria-label'] === undefined ? true : undefined}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="12" x2="52" y1="12" y2="52">
          <stop offset="0" stopColor="#C59BFF" />
          <stop offset="0.46" stopColor="#8A63FF" />
          <stop offset="0.78" stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#66C8FF" />
        </linearGradient>
        <filter id={glowId} height="180%" width="180%" x="-40%" y="-40%">
          <feGaussianBlur result="blur" stdDeviation="2.3" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        className="aura-mark-ghost"
        cx="32"
        cy="32"
        r="20.5"
        stroke="currentColor"
        strokeOpacity="0.14"
        strokeWidth="3"
      />
      <circle
        className="aura-mark-ring"
        cx="32"
        cy="32"
        filter={`url(#${glowId})`}
        r="20.5"
        stroke={`url(#${gradientId})`}
        strokeDasharray="112 17"
        strokeLinecap="round"
        strokeWidth="3.4"
        transform="rotate(-78 32 32)"
      />
      <circle
        className="aura-mark-focus"
        cx="42.8"
        cy="49.1"
        fill="#74C8FF"
        r="1.9"
      />
    </svg>
  );
}

export function AuraBrand(): React.JSX.Element {
  return (
    <div className="brand" aria-label="AURA Browser">
      <span className="brand-mark" aria-hidden="true">
        <AuraMark />
      </span>
      <span className="brand-wordmark">AURA</span>
    </div>
  );
}

export function BackIcon(props: IconProps): React.JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M15.5 5.5 9 12l6.5 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}

export function ForwardIcon(props: IconProps): React.JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="m8.5 5.5 6.5 6.5-6.5 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps): React.JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M18.2 8.2V4.8m0 0h-3.4m3.4 0-2.1 2.1A7.2 7.2 0 1 0 19 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function AuraSparkIcon(props: IconProps): React.JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M12 3.5c.55 4.25 2.75 6.45 7 7-.4.08-.78.17-1.15.28C14.34 11.8 12.5 14.1 12 18.5c-.5-4.4-2.34-6.7-5.85-7.72A13.5 13.5 0 0 0 5 10.5c4.25-.55 6.45-2.75 7-7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <circle cx="18.5" cy="5.5" fill="currentColor" r="1.35" />
    </svg>
  );
}

export function CheckIcon(props: IconProps): React.JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="m6.5 12.3 3.4 3.4 7.6-8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}

export function MicrophoneIcon(props: IconProps): React.JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <rect x="8.25" y="3.5" width="7.5" height="11" rx="3.75" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.8 11.8a6.2 6.2 0 0 0 12.4 0M12 18v2.5M9.2 20.5h5.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

export function SpeakerIcon(props: IconProps): React.JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M5 10v4h3.2l4.3 3.5v-11L8.2 10H5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M17.8 6.8a7.2 7.2 0 0 1 0 10.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}
