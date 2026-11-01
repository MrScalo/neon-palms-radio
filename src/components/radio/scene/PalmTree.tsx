import type { CSSProperties } from "react";
import { PALMS, type PalmVariant } from "./palmGeometry";

const shapeId = (variant: PalmVariant) => `np-palm-shape-${variant}`;

/**
 * Defines every palm shape once; each PalmTree draws it with <use>, so the path data is sent
 * only once per page. Render exactly one sprite on any page that shows a PalmTree.
 */
export function PalmSprite() {
  const variants = Object.keys(PALMS) as PalmVariant[];
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute size-0 overflow-hidden">
      <defs>
        {variants.map((variant) => {
          const shape = PALMS[variant];
          return (
            <g key={variant} id={shapeId(variant)}>
              <path d={shape.trunk} />
              {shape.fronds.map((d, i) => (
                <path key={i} d={d} />
              ))}
              {shape.coconuts.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={c.r} />
              ))}
            </g>
          );
        })}
      </defs>
    </svg>
  );
}

type PalmTreeProps = {
  variant: PalmVariant;
  /** "side": pink rim on one side (lit from the sky); "outline": backlit all around (in front of the sun). */
  rim?: "side" | "outline";
  mirrored?: boolean;
  /** Sway timing, so neighbouring palms never move in lockstep. */
  sway?: { duration: number; delay: number };
  className?: string;
};

export function PalmTree({ variant, rim = "side", mirrored = false, sway, className }: PalmTreeProps) {
  const shape = PALMS[variant];
  const href = `#${shapeId(variant)}`;
  const pivotX = (mirrored ? 1 - shape.pivot.x : shape.pivot.x) * 100;
  const style: CSSProperties & Record<`--${string}`, string> = {
    transformOrigin: `${pivotX}% 100%`,
  };
  if (sway) {
    style["--np-sway-duration"] = `${sway.duration}s`;
    style["--np-sway-delay"] = `${sway.delay}s`;
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${shape.width} ${shape.height}`}
      preserveAspectRatio="xMidYMax meet"
      className={`${sway ? "np-sway " : ""}${className ?? ""}`}
      style={style}
    >
      <g transform={mirrored ? `translate(${shape.width} 0) scale(-1 1)` : undefined}>
        {rim === "side" ? (
          <use href={href} className="np-palm-rim" transform="translate(6 -3)" />
        ) : (
          <use href={href} className="np-palm-outline" />
        )}
        <use href={href} className="np-palm-body" />
      </g>
    </svg>
  );
}
