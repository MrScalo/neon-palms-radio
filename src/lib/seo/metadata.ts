import type { Metadata } from "next";
import { STATION_SEO, type PageSeo } from "@/config/seo";
import { site } from "@/config/site";
import { DEFAULT_STATION_ID } from "@/config/stations";
import { stationPath } from "@/components/radio/stationUrl";
import type { Station } from "@/lib/radio/types";

/** The network's preview image (src/app/opengraph-image.tsx). */
const NETWORK_IMAGE = "/opengraph-image";

/**
 * Title, description, canonical address and social preview of one page. Next replaces (not merges)
 * openGraph and twitter between layout and page, and a page's own openGraph hides the inherited
 * opengraph-image file, so every page states them in full, preview image included.
 */
export function pageMetadata({ title, description }: PageSeo, path: string, image = NETWORK_IMAGE): Metadata {
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
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** A station's page: the default station's is the home page, the others have their own preview image. */
export function stationMetadata(station: Station): Metadata {
  const path = stationPath(station, DEFAULT_STATION_ID);
  return pageMetadata(STATION_SEO[station.id], path, path === "/" ? NETWORK_IMAGE : `${path}/opengraph-image`);
}
