import { getSession, requireMembership } from "@/lib/auth/session";
import { searchOrganization } from "@/server/search/service";

export const runtime = "nodejs";

/**
 * Header search: matches across the active organization, limited to what the
 * member's role may see. Results carry guest names and contact details, so
 * they are never cached.
 */
export async function GET(request: Request) {
  // A signed-out fetch should get a status, not a redirect to the login page.
  if (!(await getSession())) {
    return Response.json({ error: "Sign in to search." }, { status: 401 });
  }
  const membership = await requireMembership();
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const response = await searchOrganization(membership, query);
  return Response.json(response, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
