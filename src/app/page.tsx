import type { Metadata } from "next";
import { RadioPage } from "@/components/radio/RadioPage";
import { DEFAULT_STATION_ID, getStation } from "@/config/stations";
import { stationMetadata } from "@/lib/seo/metadata";

const STATION = getStation(DEFAULT_STATION_ID);

export const metadata: Metadata = stationMetadata(STATION);

export default function Home() {
  return <RadioPage station={STATION} />;
}
