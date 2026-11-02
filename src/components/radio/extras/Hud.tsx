import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../useTuning";
import type { MoneyShow } from "./useExtras";
import type { WantedView } from "./wanted";

const COUNT_MS = 1_200;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="np-hud-star" fill="currentColor">
      <path d="M12 2.5l2.85 6.1 6.65.75-4.95 4.55 1.35 6.6L12 17.2l-5.9 3.3 1.35-6.6L2.5 9.35l6.65-.75z" />
    </svg>
  );
}

function MoneyCounter({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const duration = prefersReducedMotion() ? 0 : COUNT_MS;
    let start: number | null = null;
    let frame = 0;
    const step = (time: number) => {
      start ??= time;
      const progress = duration === 0 ? 1 : Math.min(1, (time - start) / duration);
      setValue(Math.round(from + (to - from) * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return usd.format(value);
}

type HudProps = {
  wanted: WantedView;
  money: MoneyShow | null;
};

/** Money and stars under the listener count. Decoration only; never over the player. */
export function Hud({ wanted, money }: HudProps) {
  if (wanted.stars === 0 && money === null) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-full right-0 z-10 mt-1.5 flex flex-col items-end gap-1 select-none"
    >
      {money !== null && (
        <p key={money.seq} className="np-hud-money">
          <MoneyCounter from={money.from} to={money.to} />
        </p>
      )}
      {wanted.stars > 0 && (
        <p className={`np-hud-stars flex gap-0.5 ${wanted.evading ? "np-blink" : ""}`}>
          {Array.from({ length: wanted.stars }, (_, index) => (
            <StarIcon key={index} />
          ))}
        </p>
      )}
    </div>
  );
}
