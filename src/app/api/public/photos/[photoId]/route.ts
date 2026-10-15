import { photoResponse } from "@/server/inventory/photo-response";
import { getPublicPhotoKey } from "@/server/inventory/public-photos";

export const runtime = "nodejs";

/** Serve a photo shown on a public stay page. No sign-in; only photos of active units. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(photoId)) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }
  const photo = await getPublicPhotoKey(photoId);
  if (!photo) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }
  return photoResponse(photo.organizationId, photo.storageKey, {
    cache: "public",
  });
}
