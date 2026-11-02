import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { absoluteUrl } from "@/lib/seo/structuredData";

/**
 * AI search and assistant crawlers, welcome by name: they answer "where can I listen to …"
 * questions with links. A crawler that matches a group of its own ignores "*", so they get the same rules.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "DuckAssistBot",
  "meta-externalagent",
  "MistralAI-User",
];

// The API is for the radio itself; a crawler running the page would otherwise count as a listener.
const RULES = { allow: "/", disallow: "/api/" };

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", ...RULES },
      { userAgent: AI_CRAWLERS, ...RULES },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  };
}
