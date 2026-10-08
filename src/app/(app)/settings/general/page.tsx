import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/session";
import { Card, CardBody } from "@/components/ui/card";
import { parseThemePreference, THEME_COOKIE } from "@/lib/theme";
import { ContactChannelsSection } from "../contact-channels/contact-channels-section";
import { PlatformsSection } from "../platforms/platforms-section";
import { ThemeSelector } from "./theme-selector";

export const metadata: Metadata = { title: "General settings" };

/** Personal preferences, plus organization-wide settings that do not fit another category. */
export default async function GeneralSettingsPage() {
  const theme = parseThemePreference(
    (await cookies()).get(THEME_COOKIE)?.value,
  );
  const [channelsAccess, platformsAccess] = await Promise.all([
    requirePermission("organization.update"),
    requirePermission("platforms.view"),
  ]);
  return (
    <div className="min-w-0 space-y-6">
      <Card className="min-w-0 bg-card">
        <CardBody>
          <ThemeSelector defaultValue={theme} />
        </CardBody>
      </Card>
      {channelsAccess ? (
        <ContactChannelsSection membership={channelsAccess} />
      ) : null}
      {platformsAccess ? (
        <PlatformsSection membership={platformsAccess} />
      ) : null}
    </div>
  );
}
