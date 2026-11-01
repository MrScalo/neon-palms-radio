import { SiteFooter } from "@/components/legal/SiteFooter";
import { RadioApp } from "@/components/radio/RadioApp";
import { StationTicker } from "@/components/radio/StationTicker";
import { SceneBackdrop, ScenePalms } from "@/components/radio/scene/SceneBackdrop";
import { SunWindow } from "@/components/radio/scene/SunWindow";

export default function Home() {
  return (
    <>
      <div className="np-stage relative isolate flex flex-1 flex-col overflow-x-clip">
        <SceneBackdrop />
        <ScenePalms />
        <RadioApp scenery={<SunWindow />} />
        <StationTicker />
      </div>
      <SiteFooter />
    </>
  );
}
