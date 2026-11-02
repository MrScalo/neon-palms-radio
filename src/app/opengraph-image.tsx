import { site } from "@/config/site";
import { SOCIAL_IMAGE_SIZE, socialImage } from "@/lib/seo/socialImage";

export const alt = `${site.name}: unofficial GTA 6 fan radio with three live stations`;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

/** The network's preview image, for the home page and every page without its own. */
export default function Image() {
  return socialImage({
    eyebrow: "3 stations · Live 24/7",
    line: "GTA VI trailer songs, classic GTA radio and pure 80s",
    accent: "#22e6ff",
  });
}
