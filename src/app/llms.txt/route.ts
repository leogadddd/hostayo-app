import { APP_URL, PUBLIC_PAGES, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** https://llmstxt.org: this host is the product itself; the marketing site is the place to learn about it. */
export function GET() {
  const body = [
    "# Hostayo app",
    "",
    "> This is the signed-in workspace of Hostayo, booking and operations software for short-stay hosts in the Philippines. Almost everything here is private. To learn what Hostayo does, read the marketing site.",
    "",
    "## Start here",
    "",
    `- [Hostayo marketing site](${SITE_URL}): What Hostayo is, features, FAQ and early access.`,
    `- [Marketing site llms.txt](${SITE_URL}/llms.txt): Full page map for language models.`,
    `- [Comparisons](${SITE_URL}/compare): Hostayo against Hostaway, Guesty, Lodgify and spreadsheets.`,
    "",
    "## Public pages on this host",
    "",
    ...PUBLIC_PAGES.map((p) => `- [${p.title}](${APP_URL}${p.path}): ${p.description}`),
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
