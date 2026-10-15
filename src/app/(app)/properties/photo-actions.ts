"use server";

import { revalidatePath } from "next/cache";
import {
  assertCan,
  PermissionError,
  requireMembership,
} from "@/lib/auth/session";
import { unexpectedErrorMessage } from "@/lib/errors";
import type { GalleryPhoto } from "@/lib/photo-sections";
import {
  addGalleryPhoto,
  clearGalleryCover,
  deleteGalleryPhotos,
  moveGalleryPhoto,
  setGalleryCover,
  updateGalleryPhotoCaption,
  type GalleryOwner,
} from "@/server/inventory/gallery";
import { imageUploadFromForm } from "@/server/inventory/image-upload";
import { InventoryError } from "@/server/inventory/validation";
import { StorageError } from "@/server/storage/service";

/** The record a gallery belongs to, as the client names it. */
export interface GalleryTarget {
  propertyId: string;
  unitId?: string | null;
}

export type PhotoActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (
    error instanceof InventoryError ||
    error instanceof StorageError ||
    error instanceof PermissionError
  ) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: unexpectedErrorMessage(error, "photos") };
}

async function authorize(target: GalleryTarget) {
  const membership = await requireMembership();
  assertCan(membership, "properties.update");
  const owner: GalleryOwner & { actorUserId: string } = {
    organizationId: membership.organizationId,
    propertyId: target.propertyId,
    unitId: target.unitId ?? null,
    actorUserId: membership.userId,
  };
  return owner;
}

function refresh(target: GalleryTarget) {
  revalidatePath(`/properties/${target.propertyId}`);
  if (target.unitId) {
    revalidatePath(`/properties/${target.propertyId}/units/${target.unitId}`);
  }
  revalidatePath("/properties");
  revalidatePath("/calendar");
}

/** Upload one photo (form field `image`) into a section. */
export async function uploadGalleryPhotoAction(
  target: GalleryTarget,
  section: string,
  formData: FormData,
): Promise<PhotoActionResult<{ photo: GalleryPhoto }>> {
  try {
    const owner = await authorize(target);
    const upload = await imageUploadFromForm(formData, "image");
    if (!upload) throw new InventoryError("Choose an image to upload.", "image");
    const file = formData.get("image");
    const photo = await addGalleryPhoto({
      ...owner,
      section,
      upload,
      originalFilename: file instanceof File ? file.name : null,
      originalByteSize: file instanceof File ? file.size : null,
    });
    refresh(target);
    return { ok: true, photo };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteGalleryPhotosAction(
  target: GalleryTarget,
  photoIds: string[],
): Promise<PhotoActionResult> {
  try {
    await deleteGalleryPhotos(await authorize(target), photoIds);
    refresh(target);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function setGalleryCoverAction(
  target: GalleryTarget,
  photoId: string,
): Promise<PhotoActionResult> {
  try {
    await setGalleryCover(await authorize(target), photoId);
    refresh(target);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function clearGalleryCoverAction(
  target: GalleryTarget,
): Promise<PhotoActionResult> {
  try {
    await clearGalleryCover(await authorize(target));
    refresh(target);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateGalleryCaptionAction(
  target: GalleryTarget,
  photoId: string,
  caption: string,
): Promise<PhotoActionResult> {
  try {
    await updateGalleryPhotoCaption(await authorize(target), photoId, caption);
    refresh(target);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function moveGalleryPhotoAction(
  target: GalleryTarget,
  photoId: string,
  direction: "earlier" | "later",
): Promise<PhotoActionResult> {
  try {
    await moveGalleryPhoto(await authorize(target), photoId, direction);
    refresh(target);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
