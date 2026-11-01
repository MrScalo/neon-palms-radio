import type { ReactNode, RefObject } from "react";
import type { RadioStatus } from "@/lib/radio/types";

type RadioSetProps = {
  status: RadioStatus;
  playerHostRef: RefObject<HTMLDivElement | null>;
  /** Consent or tune-in card. Must be null whenever status !== "off": nothing may cover the player. */
  screenCard: ReactNode;
  controls: ReactNode;
  /** The three station presets */
  tuner: ReactNode;
  /** A station switch is settling; the idle screen flickers, but only while the player is off. */
  tuning: boolean;
};

/** The TV set: bezel, screen with the YouTube host, the control strip and the tuner below it. */
export function RadioSet({ status, playerHostRef, screenCard, controls, tuner, tuning }: RadioSetProps) {
  return (
    <section aria-labelledby="np-set-heading" className="np-chassis self-start p-3 [grid-area:set] sm:p-4 lg:p-5">
      <h2 id="np-set-heading" className="sr-only">
        Live player
      </h2>
      <div className="np-bezel">
        <div className="np-bezel-inner">
          <div className="np-screen" data-status={status} data-tuning={status === "off" && tuning}>
            <div aria-hidden="true" className="np-screen-idle">
              <span className="np-screen-sweep" />
            </div>
            {/* The radio engine mounts the YouTube iframe in here; React never renders children into it. */}
            <div ref={playerHostRef} className="absolute inset-0" />
            {status === "off" ? screenCard : null}
          </div>
        </div>
      </div>
      {controls}
      {tuner}
    </section>
  );
}
