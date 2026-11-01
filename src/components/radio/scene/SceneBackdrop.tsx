import { PalmSprite, PalmTree } from "./PalmTree";
import { StarField } from "./StarField";

/** Sky, stars and the travelling grid floor. Purely decorative, pure CSS. */
export function SceneBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="np-scene pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden select-none"
    >
      <div className="np-sky" />
      <StarField />
      <div className="np-floor">
        <div className="np-floor-plane">
          <div className="np-floor-lines" />
        </div>
        <div className="np-floor-shade" />
      </div>
      <div className="np-horizon" />
    </div>
  );
}

/** Palms framing the page. A separate layer so they stand in front of the sun but behind the content. */
export function ScenePalms() {
  return (
    <div
      aria-hidden="true"
      className="np-scene np-palms pointer-events-none absolute inset-x-0 top-0 -z-2 overflow-hidden select-none"
    >
      <PalmSprite />
      <PalmTree variant="short" className="np-palm np-palm--far" sway={{ duration: 11, delay: -4 }} />
      <PalmTree variant="tall" className="np-palm np-palm--left" sway={{ duration: 9, delay: -2 }} />
      <PalmTree variant="tall" mirrored className="np-palm np-palm--right" sway={{ duration: 10, delay: -6 }} />
    </div>
  );
}
