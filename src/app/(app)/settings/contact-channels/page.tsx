import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { getOrganizationContactChannels } from "@/server/orgs/service";
import { ContactChannelsEditor } from "./contact-channels-editor";

export const metadata: Metadata = { title: "Contact channels" };

export default async function ContactChannelsPage() {
  const membership = await requirePermission("organization.update");
  if (!membership) return <PermissionDenied />;
  const channels = await getOrganizationContactChannels(membership.organizationId);
  return <ContactChannelsEditor organizationName={membership.organizationName} initialChannels={channels} />;
}
