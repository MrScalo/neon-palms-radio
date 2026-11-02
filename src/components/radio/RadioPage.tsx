import { SiteFooter } from "@/components/legal/SiteFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { stationPageGraph } from "@/lib/seo/structuredData";
import type { Station } from "@/lib/radio/types";
import { RadioApp } from "./RadioApp";
import { SceneBackdrop, ScenePalms } from "./scene/SceneBackdrop";
import { StationTicker } from "./StationTicker";
import { SunWindow } from "./scene/SunWindow";

/** The radio, opened on `station`. Shared by the home page (default station) and the station pages. */
export function RadioPage({ station }: { station: Station }) {
  return (
    <>
      <JsonLd data={stationPageGraph(station)} />
      <div className="np-stage relative isolate flex flex-1 flex-col overflow-x-clip">
        <SceneBackdrop />
        <ScenePalms />
        <RadioApp stationId={station.id} scenery={<SunWindow />} />
        <StationTicker />
      </div>
      <SiteFooter />
    </>
  );
}
