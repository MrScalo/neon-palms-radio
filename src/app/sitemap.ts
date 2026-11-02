import type { MetadataRoute } from "next";
import { DEFAULT_STATION_ID, STATION_PAGES } from "@/config/stations";
import { stationPath } from "@/components/radio/stationUrl";
import { absoluteUrl } from "@/lib/seo/structuredData";

/** Every page worth finding. The legal pages stay out (and are noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...STATION_PAGES.map((station) => ({
      url: absoluteUrl(stationPath(station, DEFAULT_STATION_ID)),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    { url: absoluteUrl("/rotation"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.7 },
  ];
}
