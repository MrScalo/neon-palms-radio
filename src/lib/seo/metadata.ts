import type { Metadata } from "next";
import { STATION_SEO, type PageSeo } from "@/config/seo";
import { site } from "@/config/site";
import { DEFAULT_STATION_ID } from "@/config/stations";
import { stationPath } from "@/components/radio/stationUrl";
import type { Station } from "@/lib/radio/types";

/**
 * Title, description, canonical address and social preview text of one page. Next replaces (not
 * merges) openGraph and twitter between layout and page, so every page states them in full; the
 * preview image itself comes from the nearest opengraph-image file.
 */
export function pageMetadata({ title, description }: PageSeo, path: string): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en_US",
      url: path,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** A station's page: the default station's is the home page. */
export function stationMetadata(station: Station): Metadata {
  return pageMetadata(STATION_SEO[station.id], stationPath(station, DEFAULT_STATION_ID));
}
