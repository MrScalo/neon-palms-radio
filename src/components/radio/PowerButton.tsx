import type { RefObject } from "react";
import type { RadioStatus } from "@/lib/radio/types";
import { PowerIcon } from "./icons";

type PowerButtonProps = {
  status: RadioStatus;
  onPress(): void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
};

export function PowerButton({ status, onPress, buttonRef }: PowerButtonProps) {
  const off = status === "off";
  const connecting = status === "connecting";
  const label = off ? "Tune in" : connecting ? "Tuning in…" : "Tune out";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onPress}
      aria-label={connecting ? "Tuning in. Press to cancel" : undefined}
      className={`group inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full border bg-ink/70 pr-5 pl-3 font-display text-[0.8125rem] tracking-[0.16em] whitespace-nowrap text-cream uppercase shadow-[inset_0_1px_0_rgb(255_244_230/0.08)] transition-[border-color,box-shadow,transform] duration-200 active:translate-y-px ${
        off
          ? "border-neon-pink/80 hover:shadow-[0_0_18px_rgb(255_47_160/0.45)]"
          : "border-neon-cyan/70 hover:shadow-[0_0_18px_rgb(34_230_255/0.35)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid size-7 place-items-center rounded-full border ${
          off
            ? "border-neon-pink/60 text-neon-pink"
            : "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_12px_rgb(34_230_255/0.45)]"
        } ${connecting ? "np-blink" : ""}`}
      >
        <PowerIcon className="size-4" />
      </span>
      {label}
    </button>
  );
}
