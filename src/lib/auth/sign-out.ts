"use client";

import { authClient } from "@/lib/auth/client";
import { setToastAfterNavigation } from "@/components/ui/sonner";
import { clearL1Recents } from "@/lib/l1-recents";
import { clearOfflineData } from "@/lib/offline/clear";
import { SITE_URL } from "@/lib/site";

export async function signOutAndRedirect(
  redirect: (path: string) => void = (path) => window.location.replace(path),
  isDemoAccount = false,
) {
  const { error } = await authClient.signOut();
  if (error) {
    throw new Error(error.message || "Could not sign out. Please try again.");
  }
  clearL1Recents();
  // Saved pages and unsent changes belong to this person; don't leave them behind.
  await clearOfflineData();
  setToastAfterNavigation("success", "Signed out successfully.");
  redirect(isDemoAccount ? SITE_URL : "/login");
}
