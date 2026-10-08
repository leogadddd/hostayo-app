import type { MembershipContext } from "@/lib/auth/session";
import { getOrganizationContactChannels } from "@/server/orgs/service";
import { ContactChannelsEditor } from "./contact-channels-editor";

/** Caller must have checked `organization.update`. */
export async function ContactChannelsSection({
  membership,
}: {
  membership: MembershipContext;
}) {
  const channels = await getOrganizationContactChannels(
    membership.organizationId,
  );
  return (
    <ContactChannelsEditor
      organizationName={membership.organizationName}
      initialChannels={channels}
    />
  );
}
