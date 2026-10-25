import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/session";
import { Card, CardBody } from "@/components/ui/card";
import { parseThemePreference, THEME_COOKIE } from "@/lib/theme";
import { ContactChannelsSection } from "../contact-channels/contact-channels-section";
import { PlatformsSection } from "../platforms/platforms-section";
import { getGoLiveChecklist } from "@/server/orgs/checklist";
import { getPublicPageStatus } from "@/server/orgs/service";
import { GoLiveCard } from "./go-live-card";
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
  const [publicPage, checklist] = channelsAccess
    ? await Promise.all([
        getPublicPageStatus(channelsAccess.organizationId),
        getGoLiveChecklist(channelsAccess.organizationId),
      ])
    : [null, null];
  const goLiveCard =
    publicPage && checklist ? (
      <GoLiveCard
        slug={publicPage.slug}
        initialLive={publicPage.live}
        remaining={
          checklist.items.filter((item) => item.id !== "live" && !item.done)
            .length
        }
      />
    ) : null;
  // Setup isn't finished: going live is the thing to do here, so it leads.
  // Depends on the checklist only, so flipping the switch never moves the card.
  const goLiveFirst = Boolean(checklist && !checklist.ready);
  return (
    <div className="min-w-0 space-y-6">
      {goLiveFirst ? goLiveCard : null}
      <Card className="min-w-0 bg-card">
        <CardBody>
          <ThemeSelector defaultValue={theme} />
        </CardBody>
      </Card>
      {goLiveFirst ? null : goLiveCard}
      {channelsAccess ? (
        <ContactChannelsSection membership={channelsAccess} />
      ) : null}
      {platformsAccess ? (
        <PlatformsSection membership={platformsAccess} />
      ) : null}
    </div>
  );
}
