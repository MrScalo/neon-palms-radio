import type { SVGProps } from "react";

// Minimal stroke glyphs drawn on a 24px grid (no icon dependency in this project).
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PowerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5v8" />
      <path d="M6.6 7.2a7.5 7.5 0 1 0 10.8 0" />
    </Icon>
  );
}

export function SpeakerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
    </Icon>
  );
}

export function SpeakerMutedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="m16 9.5 5 5" />
      <path d="m21 9.5-5 5" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 5.5v13" />
      <path d="M15.5 5.5v13" />
    </Icon>
  );
}

export function HeadphonesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 14.5V12a7.5 7.5 0 0 1 15 0v2.5" />
      <path d="M4.5 14h2a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 6.5 20H6a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M19.5 14h-2a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 1.5 1.5h.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 5.2v13.6L19 12z" />
    </Icon>
  );
}
