import { llmsText } from "@/lib/seo/facts";

/** The long version of /llms.txt: every track and the FAQ. */
export function GET() {
  return new Response(llmsText(true), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
