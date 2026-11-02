import type { MetadataRoute } from "next";
import { STATION_SEO } from "@/config/seo";
import { site } from "@/config/site";
import { DEFAULT_STATION_ID } from "@/config/stations";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.wordmark,
    description: STATION_SEO[DEFAULT_STATION_ID].description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0618",
    theme_color: "#0b0618",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
