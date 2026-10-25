import type { Metadata } from "next";
import { getMobileSearchProps } from "@/components/app/mobile-top-bar";
import { getAppIdentity } from "@/lib/app-identity";
import { requireMembership } from "@/lib/auth/session";
import { getDeviceClass } from "@/lib/device";
import { DesktopDashboard } from "./desktop";
import { MobileDashboard } from "./mobile";
import { getDashboardModel } from "./model";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const membership = await requireMembership();
  const [model, device] = await Promise.all([
    getDashboardModel(membership),
    getDeviceClass(),
  ]);
  if (device === "mobile") {
    const [search, identity] = await Promise.all([
      getMobileSearchProps(),
      getAppIdentity(),
    ]);
    return (
      <MobileDashboard
        model={model}
        search={search}
        workspaces={{
          organizations: identity.organizations,
          activeOrganizationId: identity.organizationId,
          l1: identity.l1,
        }}
      />
    );
  }
  return <DesktopDashboard model={model} />;
}
