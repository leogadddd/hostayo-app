import { requireMembership } from "@/lib/auth/session";
import { getPhotoStorageKey } from "@/server/inventory/gallery";
import { photoResponse } from "@/server/inventory/photo-response";

export const runtime = "nodejs";

/** Serve one gallery photo to members of the organization that owns it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const membership = await requireMembership();
  const { photoId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(photoId)) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }
  const key = await getPhotoStorageKey(membership.organizationId, photoId);
  return photoResponse(membership.organizationId, key);
}
