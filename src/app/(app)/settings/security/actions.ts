"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userSecurityPreferences } from "@/lib/db/schema";

export type SecurityAlert = "newSignInAlerts" | "twoFactorChangeAlerts";
const ALERTS: readonly SecurityAlert[] = [
  "newSignInAlerts",
  "twoFactorChangeAlerts",
];

/** Saves one alert switch as soon as it's flipped. */
export async function setSecurityAlertAction(
  alert: SecurityAlert,
  enabled: boolean,
): Promise<{ error?: string; success?: boolean }> {
  const currentUser = await requireUser();
  if (!ALERTS.includes(alert)) return { error: "Unknown security alert." };
  const values = { [alert]: enabled, updatedAt: new Date() };
  await db
    .insert(userSecurityPreferences)
    .values({ userId: currentUser.id, ...values })
    .onConflictDoUpdate({
      target: userSecurityPreferences.userId,
      set: values,
    });
  revalidatePath("/settings/security");
  return { success: true };
}
