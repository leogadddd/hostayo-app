import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { photoResponse } from "@/server/inventory/photo-response";

export const runtime = "nodejs";

/** Serve a host's logo on their public page. No sign-in. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const organization = await db.query.organizations.findFirst({
    columns: { id: true, logoUrl: true },
    where: eq(organizations.slug, slug),
  });
  if (!organization?.logoUrl) {
    return Response.json({ error: "Logo not found." }, { status: 404 });
  }
  return photoResponse(organization.id, organization.logoUrl, {
    cache: "public",
  });
}
