import { cache } from "react";
import { cookies } from "next/headers";
import { getDatabaseLabel } from "@/lib/database-label";
import {
  isL1,
  listMemberships,
  requireMembership,
  requireUser,
} from "@/lib/auth/session";
import { can, resolvePermissions } from "@/lib/permissions";
import { parseOpenGroups, SIDEBAR_GROUPS_COOKIE } from "@/lib/sidebar-groups";
import { countUnreadEarlyAccessRequests } from "@/server/early-access/service";
import { getGoLiveChecklist } from "@/server/orgs/checklist";
import {
  getOrganizationLogoUrl,
  getPublicPageStatus,
} from "@/server/orgs/service";

/**
 * Who is signed in and which organization they are in, shaped for the app
 * chrome (sidebar, header, tab bar) and the Profile page. Cached per request so
 * the layout and a page can both ask without repeating the queries.
 */
export const getAppIdentity = cache(async () => {
  // These share the request-scoped auth cache, and running them together keeps
  // the layout from adding a sequential wait before the page can render.
  const [user, membership, memberOf, l1] = await Promise.all([
    requireUser(),
    requireMembership(),
    requireUser().then((user) => listMemberships(user.id)),
    requireUser().then((user) => isL1(user.id)),
  ]);
  // An L1 operator's picker searches the rest; only their own organizations
  // and the one they're in are sent down.
  const organizations = [
    ...memberOf.map((row) => ({ ...row, viaL1: false })),
    ...(membership.viaL1 ? [{ ...membership, viaL1: true }] : []),
  ];
  const organizationLogoUrls = await Promise.all(
    organizations.map((organization) =>
      getOrganizationLogoUrl(organization.organizationId),
    ),
  );
  const organizationLogoUrl =
    organizationLogoUrls[
      organizations.findIndex(
        (organization) =>
          organization.organizationId === membership.organizationId,
      )
    ] ?? null;
  // Setup progress for the sidebar: only for people who can finish the setup,
  // and only while there is something left to do.
  const checklist = can(membership, "organization.update")
    ? await getGoLiveChecklist(membership.organizationId)
    : null;
  const publicPage = await getPublicPageStatus(membership.organizationId);
  const identity = {
    publicPageLive: publicPage.live,
    canManageGoLive: can(membership, "organization.update"),
    goLive:
      checklist && !checklist.completed
        ? { doneCount: checklist.doneCount, total: checklist.total }
        : null,
    organizationId: membership.organizationId,
    organizationSlug: membership.organizationSlug,
    organizationName: membership.organizationName,
    organizationImage: organizationLogoUrl?.startsWith("data:")
      ? organizationLogoUrl
      : organizationLogoUrl
        ? `/api/orgs/${membership.organizationId}/logo`
        : null,
    organizations: organizations.map((organization, index) => ({
      id: organization.organizationId,
      name: organization.organizationName,
      role: organization.role,
      viaL1: organization.viaL1,
      imageSrc: organizationLogoUrls[index]?.startsWith("data:")
        ? organizationLogoUrls[index]
        : organizationLogoUrls[index]
          ? `/api/orgs/${organization.organizationId}/logo`
          : null,
    })),
    userName: user.name,
    userEmail: user.email,
    userImage: user.image?.startsWith(`user/${user.id}/`)
      ? `/api/users/${user.id}/profile-image`
      : (user.image ?? null),
    role: membership.role,
    viaL1: membership.viaL1 ?? false,
    isDemoAccount: membership.isDemoAccount,
    l1,
    permissions: membership.permissions ?? resolvePermissions(membership.role),
    databaseLabel: getDatabaseLabel(),
    openGroups: parseOpenGroups(
      (await cookies()).get(SIDEBAR_GROUPS_COOKIE)?.value,
    ),
    earlyAccessUnread: l1 ? await countUnreadEarlyAccessRequests() : 0,
  };
  return identity;
});
