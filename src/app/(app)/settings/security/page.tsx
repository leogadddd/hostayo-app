import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userSecurityPreferences } from "@/lib/db/schema";
import { SecuritySettings } from "./security-settings";

export const metadata: Metadata = { title: "Security settings" };

export default async function SecuritySettingsPage() {
  const currentUser = await requireUser();
  const [preferences] = await db
    .select()
    .from(userSecurityPreferences)
    .where(eq(userSecurityPreferences.userId, currentUser.id))
    .limit(1);
  return (
    <SecuritySettings
      email={currentUser.email}
      twoFactorEnabled={Boolean(currentUser.twoFactorEnabled)}
      preferences={{
        newSignInAlerts: preferences?.newSignInAlerts ?? true,
        twoFactorChangeAlerts: preferences?.twoFactorChangeAlerts ?? true,
      }}
    />
  );
}
