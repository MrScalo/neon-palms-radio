"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { COUNTDOWN } from "@/config/countdown";
import { DEFAULT_STATION_ID } from "@/config/stations";
import { useRadio } from "@/hooks/useRadio";
import { useYouTubeConsent } from "@/lib/consent";
import { ConsentCard } from "./ConsentCard";
import { ControlsBar } from "./ControlsBar";
import { Hud } from "./extras/Hud";
import { useExtras } from "./extras/useExtras";
import { NowPlaying } from "./NowPlaying";
import { RadioSet } from "./RadioSet";
import { StationHeader } from "./StationHeader";
import { playStaticBurst, staticPeakGain } from "./staticBurst";
import { reconcileAddress, stationPath, withStationPath } from "./stationUrl";
import { Tuner } from "./Tuner";
import { TuneInCard } from "./TuneInCard";
import { UpNext } from "./UpNext";
import { useNowPlayingTitle } from "./useNowPlayingTitle";
import { usePresence } from "./usePresence";
import { prefersReducedMotion, useTuning } from "./useTuning";

type RadioAppProps = {
  /** The station this page is for: the default station at /, the others on their own page. */
  stationId?: string;
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

/** The radio page's interactive part. Owns the single useRadio() instance. */
export function RadioApp({ stationId = DEFAULT_STATION_ID, scenery }: RadioAppProps) {
  const radio = useRadio(stationId);
  const rootRef = useRef<HTMLDivElement>(null);
  const extras = useExtras(rootRef);
  const { consent, grant, deny } = useYouTubeConsent();
  const acceptRef = useRef<HTMLButtonElement>(null);
  const powerRef = useRef<HTMLButtonElement>(null);
  const pendingTuneIn = useRef(false);
  const wasOff = useRef(true);
  const [nudge, setNudge] = useState(0);
  // Tied to the station it is about, so it goes quiet once the address picks another one.
  const [announcement, setAnnouncement] = useState({ stationId: "", text: "" });
  const { event: tuneEvent, tuning, startTuning } = useTuning();

  const { status, station, stations, setStation, current, upcoming, elapsed } = radio;
  const off = status === "off";
  const playing = status === "playing";
  const remaining = current ? Math.max(0, current.track.duration - elapsed) : 0;

  useNowPlayingTitle(playing && current ? current.track : null, station);
  const presence = usePresence(station.id);

  // Next keeps this page alive (hidden) while the listener is on another page, and switching
  // stations only rewrites the address. So on first load and every time the page shows again, line
  // the station up with the address: an old ?station= link or a station page (Back/Forward) wins; a
  // bare "/" gets the kept station's page written back. Hiding the page tuned out, so no gesture is
  // needed here.
  const syncWithAddress = useEffectEvent(() => {
    const action = reconcileAddress(window.location, stations, station.id, DEFAULT_STATION_ID);
    if (action === null) return;
    if (action.select !== undefined) setStation(action.select);
    if (action.writePath === undefined) return;
    try {
      window.history.replaceState(null, "", withStationPath(window.location.href, action.writePath));
    } catch {
      // The address is a convenience.
    }
  });

  // Effects re-run when Next shows the kept page again, which is exactly when to check.
  useEffect(() => {
    syncWithAddress();
  }, []);

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

  function switchStation(id: string) {
    const next = stations.find((item) => item.id === id);
    if (next === undefined || next.id === station.id) return;
    // First thing in the gesture: tuned in, the new station's video may only start from inside it.
    setStation(next.id);
    extras.onSwitch();
    const reducedMotion = prefersReducedMotion();
    if (!off) playStaticBurst(staticPeakGain(radio.volume, radio.muted, reducedMotion));
    startTuning(!reducedMotion);
    const slot = radio.onAir?.get(next.id);
    setAnnouncement({
      stationId: next.id,
      text: slot
        ? `Now on ${next.name}, ${next.frequency} FM: ${slot.track.title} by ${slot.track.artist}.`
        : `Now on ${next.name}, ${next.frequency} FM.`,
    });
    try {
      window.history.replaceState(null, "", withStationPath(window.location.href, stationPath(next, DEFAULT_STATION_ID)));
    } catch {
      // Browsers throttle history updates when keys are held down; the link is a convenience.
    }
  }

  const screenCard =
    consent === "granted" ? (
      <TuneInCard stationName={station.name} onTuneIn={radio.tuneIn} />
    ) : (
      <ConsentCard consent={consent} onAccept={acceptAndTuneIn} onDecline={decline} acceptRef={acceptRef} nudge={nudge} />
    );

  return (
    <div
      ref={rootRef}
      className="np-radio flex flex-1 flex-col"
      data-station={station.id}
      data-switched={tuneEvent !== null}
      style={{ "--station-accent": station.accent } as CSSProperties}
    >
      <StationHeader
        live={playing}
        station={station}
        listeners={presence?.total ?? null}
        onCountdownTune={() => switchStation(COUNTDOWN.stationId)}
        hud={<Hud wanted={extras.wanted} money={extras.money} />}
      />
      <main id="main" className="np-container np-main flex-1 pb-14 lg:pb-20">
        {scenery}
        <RadioSet
          status={status}
          playerHostRef={radio.playerHostRef}
          screenCard={screenCard}
          tuning={tuning}
          controls={
            <ControlsBar
              status={status}
              volume={radio.volume}
              muted={radio.muted}
              remaining={remaining}
              stationUpdated={radio.stationUpdated}
              notice={extras.notice}
              onPower={pressPower}
              onResume={resumeLive}
              onVolume={radio.setVolume}
              onToggleMute={radio.toggleMute}
              powerRef={powerRef}
            />
          }
          tuner={
            <Tuner
              stations={stations}
              station={station}
              onAir={radio.onAir}
              listeners={presence?.stations ?? null}
              announcement={announcement.stationId === station.id ? announcement.text : ""}
              onSelect={(id) => {
                switchStation(id);
                extras.onPresetPress(stations.findIndex((item) => item.id === id));
              }}
            />
          }
        />
        <div className="mt-2 grid content-start gap-5 [grid-area:info] md:grid-cols-2 lg:mt-0 lg:grid-cols-1 lg:gap-6">
          <NowPlaying station={station} current={current} elapsed={elapsed} live={playing} />
          <UpNext station={station} current={current} upcoming={upcoming} elapsed={elapsed} />
        </div>
      </main>
    </div>
  );
}
