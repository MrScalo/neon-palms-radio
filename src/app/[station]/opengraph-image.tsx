import { STATION_SEO } from "@/config/seo";
import { site } from "@/config/site";
import { getStationBySlug, STATION_PAGES } from "@/config/stations";
import { SOCIAL_IMAGE_SIZE, socialImage } from "@/lib/seo/socialImage";

export const alt = `A station of ${site.name}, the unofficial GTA 6 fan radio`;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return STATION_PAGES.map((station) => ({ station: station.slug }));
}

/** The station's own preview image. */
export default async function Image({ params }: { params: Promise<{ station: string }> }) {
  const station = getStationBySlug((await params).station) ?? STATION_PAGES[0];
  return socialImage({
    eyebrow: `${station.frequency} FM · ${station.name}`,
    line: STATION_SEO[station.id].imageLine,
    accent: station.accent,
  });
}
