import { PalmTree } from "./PalmTree";
import { RetroSun } from "./RetroSun";

/**
 * The sun setting on the horizon. It sits in the page grid (above the player on phones, beside it
 * on desktop) so it is never hidden behind the set; its bottom edge lines up with the backdrop's
 * horizon through the shared --horizon variables.
 */
export function SunWindow() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-(--sun-h) select-none [grid-area:sun]">
      <div className="np-sun-anchor">
        <div className="np-sun-halo" />
        <div className="np-sun-reflection" />
        <RetroSun className="np-sun relative" />
      </div>
      <PalmTree
        variant="short"
        rim="outline"
        className="np-palm np-palm--window"
        sway={{ duration: 8, delay: -3 }}
      />
    </div>
  );
}
