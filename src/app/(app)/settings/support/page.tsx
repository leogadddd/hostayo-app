import type { Metadata } from "next";
import { requireMembership, requireUser } from "@/lib/auth/session";
import { APP_VERSION } from "@/lib/app-version";
import { roleLabel } from "@/lib/permissions";
import { SupportSettings } from "./support-settings";

export const metadata: Metadata = { title: "Support" };

/** Contact details, problem reports and quick answers. Open to every member. */
export default async function SupportSettingsPage() {
  const [currentUser, membership] = await Promise.all([requireUser(), requireMembership()]);
  return (
    <SupportSettings
      context={{
        name: currentUser.name,
        email: currentUser.email,
        organizationName: membership.organizationName,
        organizationId: membership.organizationId,
        role: roleLabel(membership.role),
        version: APP_VERSION,
      }}
    />
  );
}
