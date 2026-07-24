import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function AuraMark(props: IconProps): React.JSX.Element {
  return (
    <svg
      aria-hidden={props['aria-label'] === undefined ? true : undefined}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M17.5 46.5C19.9 32.3 25.1 20.2 32 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        d="M46.5 46.5C44.1 32.3 38.9 20.2 32 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        d="M24.5 35.5H39.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <circle cx="32" cy="13.5" fill="currentColor" r="3.5" />
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
