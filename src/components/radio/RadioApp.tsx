"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useRadio } from "@/hooks/useRadio";
import { useYouTubeConsent } from "@/lib/consent";
import { ConsentCard } from "./ConsentCard";
import { ControlsBar } from "./ControlsBar";
import { NowPlaying } from "./NowPlaying";
import { RadioSet } from "./RadioSet";
import { StationHeader } from "./StationHeader";
import { TuneInCard } from "./TuneInCard";
import { UpNext } from "./UpNext";
import { useNowPlayingTitle } from "./useNowPlayingTitle";

type RadioAppProps = {
  /** Decorative sun window, rendered on the server and slotted into the grid. */
  scenery?: ReactNode;
};

/**
 * For buttons that unmount themselves when pressed ("Not now", "Back to live"): once React has
 * re-rendered, move focus to a stable control instead of leaving it on the page body.
 */
function keepFocus(target: RefObject<HTMLButtonElement | null>): void {
  requestAnimationFrame(() => {
    const active = document.activeElement;
    if (active === null || active === document.body) target.current?.focus({ preventScroll: true });
  });
}

/** The station page's interactive part. Owns the single useRadio() instance. */
export function RadioApp({ scenery }: RadioAppProps) {
  const radio = useRadio();
  const { consent, grant, deny } = useYouTubeConsent();
  const acceptRef = useRef<HTMLButtonElement>(null);
  const powerRef = useRef<HTMLButtonElement>(null);
  const pendingTuneIn = useRef(false);
  const wasOff = useRef(true);
  const [nudge, setNudge] = useState(0);

  const { status, current, upcoming, elapsed } = radio;
  const off = status === "off";
  const playing = status === "playing";
  const remaining = current ? Math.max(0, current.track.duration - elapsed) : 0;

  useNowPlayingTitle(playing && current ? current.track : null);

  // Safety net for "Accept & tune in": should tuneIn() ever read consent from React state that
  // hasn't caught up with grant() yet, tune in as soon as it has.
  useEffect(() => {
    if (!pendingTuneIn.current || consent !== "granted") return;
    pendingTuneIn.current = false;
    if (radio.status === "off") radio.tuneIn();
  }, [consent, radio]);

  // The screen card unmounts on tune-in; hand keyboard focus to the power button instead of the page body.
  useEffect(() => {
    const active = document.activeElement;
    if (wasOff.current && !off && (active === null || active === document.body)) {
      powerRef.current?.focus({ preventScroll: true });
    }
    wasOff.current = off;
  }, [off]);

  function acceptAndTuneIn() {
    pendingTuneIn.current = true;
    grant();
    // Still inside the click, so the browser lets the music start with sound.
    radio.tuneIn();
  }

  function resumeLive() {
    // Still inside the click, so the browser lets the sound start.
    radio.resume();
    keepFocus(powerRef);
  }

  function decline() {
    deny();
    keepFocus(acceptRef);
  }

  function pressPower() {
    if (!off) {
      radio.tuneOut();
    } else if (consent === "granted") {
      radio.tuneIn();
    } else {
      // Never consent on the visitor's behalf: point them to the card that explains it.
      setNudge((count) => count + 1);
      acceptRef.current?.focus();
    }
  }

  const screenCard =
    consent === "granted" ? (
      <TuneInCard onTuneIn={radio.tuneIn} />
    ) : (
      <ConsentCard consent={consent} onAccept={acceptAndTuneIn} onDecline={decline} acceptRef={acceptRef} nudge={nudge} />
    );

  return (
    <>
      <StationHeader live={playing} />
      <main id="main" className="np-container np-main flex-1 pb-14 lg:pb-20">
        {scenery}
        <RadioSet
          status={status}
          playerHostRef={radio.playerHostRef}
          screenCard={screenCard}
          controls={
            <ControlsBar
              status={status}
              volume={radio.volume}
              muted={radio.muted}
              remaining={remaining}
              stationUpdated={radio.stationUpdated}
              onPower={pressPower}
              onResume={resumeLive}
              onVolume={radio.setVolume}
              onToggleMute={radio.toggleMute}
              powerRef={powerRef}
            />
          }
        />
        <div className="mt-2 grid content-start gap-5 [grid-area:info] md:grid-cols-2 lg:mt-0 lg:grid-cols-1 lg:gap-6">
          <NowPlaying current={current} elapsed={elapsed} live={playing} />
          <UpNext current={current} upcoming={upcoming} elapsed={elapsed} />
        </div>
      </main>
    </>
  );
}
