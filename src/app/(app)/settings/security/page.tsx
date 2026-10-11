import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDemoAccountStatus, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userSecurityPreferences } from "@/lib/db/schema";
import { SecuritySettings } from "./security-settings";

export const metadata: Metadata = { title: "Security settings" };

export default async function SecuritySettingsPage() {
  const currentUser = await requireUser();
  const isDemo = await getDemoAccountStatus(currentUser.id);
  const [preferences] = await db
    .select()
    .from(userSecurityPreferences)
    .where(eq(userSecurityPreferences.userId, currentUser.id))
    .limit(1);
  return (
    <SecuritySettings
      email={currentUser.email}
      showTwoFactor={!isDemo}
      twoFactorEnabled={Boolean(currentUser.twoFactorEnabled)}
      preferences={{
        newSignInAlerts: preferences?.newSignInAlerts ?? true,
        twoFactorChangeAlerts: preferences?.twoFactorChangeAlerts ?? true,
      }}
    />
  );
}
