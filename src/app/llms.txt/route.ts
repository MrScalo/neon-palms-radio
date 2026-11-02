import { llmsText } from "@/lib/seo/facts";

/** https://llmstxt.org: a short Markdown summary of the site for AI assistants. */
export function GET() {
  return new Response(llmsText(false), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
