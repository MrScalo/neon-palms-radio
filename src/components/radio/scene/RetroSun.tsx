// Cut-out bands get thicker towards the horizon, the classic striped sunset.
const BANDS = [
  { y: 64, h: 2.5 },
  { y: 75, h: 4 },
  { y: 86, h: 5.5 },
  { y: 97.5, h: 7 },
  { y: 109.5, h: 8.5 },
];

/** The sun from its top down to the horizon line (the viewBox ends 25 units below its centre). */
export function RetroSun({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 200 125" className={className}>
      <defs>
        <linearGradient id="np-sun-fill" x1="0" y1="0" x2="0" y2="125" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe270" />
          <stop offset="0.28" stopColor="#ffd23f" />
          <stop offset="0.62" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff2fa0" />
        </linearGradient>
        <mask id="np-sun-bands" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="125">
          <rect width="200" height="125" fill="#fff" />
          {BANDS.map((band) => (
            <rect key={band.y} x="0" y={band.y} width="200" height={band.h} fill="#000" />
          ))}
        </mask>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#np-sun-fill)" mask="url(#np-sun-bands)" />
    </svg>
  );
}
