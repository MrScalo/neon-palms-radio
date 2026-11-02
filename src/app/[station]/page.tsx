import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RadioPage } from "@/components/radio/RadioPage";
import { getStationBySlug, STATION_PAGES } from "@/config/stations";
import { stationMetadata } from "@/lib/seo/metadata";

type StationPageProps = { params: Promise<{ station: string }> };

// Every station page is prerendered, so waiting for the station costs nothing; reading it at the
// top keeps a real 404 status for unknown addresses instead of streaming a "not found" into a 200.
export const instant = false;

export function generateStaticParams() {
  return STATION_PAGES.map((station) => ({ station: station.slug }));
}

export async function generateMetadata({ params }: StationPageProps): Promise<Metadata> {
  const station = getStationBySlug((await params).station);
  return station ? stationMetadata(station) : {};
}

/** /rearview, /neon-palms, …: the radio opened on that station. The default station lives at /. */
export default async function StationPage({ params }: StationPageProps) {
  const station = getStationBySlug((await params).station);
  if (station === undefined) notFound();
  return <RadioPage station={station} />;
}
