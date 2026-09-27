"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user, userProfiles } from "@/lib/db/schema";
import { unexpectedErrorMessage } from "@/lib/errors";
import { imageUploadFromDataUrl } from "@/server/inventory/image-upload";
import { createObjectStorageFromEnvironment, StorageError } from "@/server/storage/service";

export type ProfileFormState = { error?: string; success?: boolean };

export async function saveProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const currentUser = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { error: "Your name must be between 2 and 80 characters." };
  }
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  const phone = read("phone");
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) return { error: "Use an international phone number, like +639171234567." };
  const gender = read("gender");
  const genderDescription = read("genderDescription");
  if (gender && !["woman", "man", "non_binary", "prefer_not_to_say", "self_describe"].includes(gender)) return { error: "Choose a valid gender option." };
  if (gender === "self_describe" && !genderDescription) return { error: "Describe your gender, or choose another option." };
  const birthday = read("birthday");
  if (birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || new Date(`${birthday}T00:00:00Z`).getTime() >= Date.now())) return { error: "Enter a valid birthday in the past." };
  try {
    const removeImage = formData.get("removeProfileImage") === "true";
    const uploadedImage = removeImage
      ? null
      : await imageUploadFromDataUrl(String(formData.get("profileImageDataUrl") ?? ""));
    const imageKey = `user/${currentUser.id}/profile.webp`;
    if (uploadedImage) {
      await createObjectStorageFromEnvironment().put({ key: imageKey, ...uploadedImage });
    }
    await db
      .update(user)
      .set({
        name,
        ...(removeImage ? { image: null } : uploadedImage ? { image: imageKey } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, currentUser.id));
    await db.insert(userProfiles).values({
      userId: currentUser.id,
      preferredName: read("preferredName") || null,
      phone: phone || null,
      gender: gender ? gender as "woman" | "man" | "non_binary" | "prefer_not_to_say" | "self_describe" : null,
      genderDescription: gender === "self_describe" ? genderDescription : null,
      birthday: birthday || null,
      addressLine1: read("addressLine1") || null,
      addressLine2: read("addressLine2") || null,
      barangay: read("barangay") || null,
      cityMunicipality: read("cityMunicipality") || null,
      province: read("province") || null,
      region: read("region") || null,
      postalCode: read("postalCode") || null,
      country: read("country") || null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        preferredName: read("preferredName") || null, phone: phone || null,
        gender: gender ? gender as "woman" | "man" | "non_binary" | "prefer_not_to_say" | "self_describe" : null,
        genderDescription: gender === "self_describe" ? genderDescription : null, birthday: birthday || null,
        addressLine1: read("addressLine1") || null, addressLine2: read("addressLine2") || null,
        barangay: read("barangay") || null, cityMunicipality: read("cityMunicipality") || null,
        province: read("province") || null, region: read("region") || null,
        postalCode: read("postalCode") || null, country: read("country") || null, updatedAt: new Date(),
      },
    });
    if (removeImage && currentUser.image?.startsWith(`user/${currentUser.id}/`)) {
      await createObjectStorageFromEnvironment().delete(currentUser.image);
    }
    revalidatePath("/settings/profile");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof StorageError) return { error: error.message };
    return { error: unexpectedErrorMessage(error, "profile") };
  }
}
