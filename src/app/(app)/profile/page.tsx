import type { Metadata } from "next";
import Link from "next/link";
import { CaretRight as ChevronRight } from "@/components/ui/icons";
import { SignOutButton } from "./sign-out-button";
import { OrganizationSelector } from "@/components/app/organization-selector";
import { SharePublicLink } from "@/components/app/share-public-link";
import {
  NAV,
  TAB_BAR,
  isGroup,
  linkVisible,
  type NavLink,
} from "@/components/app/nav-config";
import { getAppIdentity } from "@/lib/app-identity";
import { roleLabel } from "@/lib/permissions";
import { APP_VERSION } from "@/lib/app-version";

export const metadata: Metadata = { title: "Profile" };

type Section = { id: string; label: string | null; items: NavLink[] };

const TAB_HREFS = new Set(TAB_BAR.map((tab) => tab.href));

/** Tools has its own index page; its individual calculators stay one tap deeper. */
function listed(item: NavLink) {
  return !TAB_HREFS.has(item.href) && !item.href.startsWith("/tools/");
}

function LinkRow({ item }: { item: NavLink }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className="flex min-h-14 items-center gap-3 px-4 text-sm font-medium text-pine active:bg-pine-mist"
      >
        <Icon className="h-5 w-5 shrink-0 text-moss" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {item.href === "/tools" ? "Tools" : item.label}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink/35" aria-hidden />
      </Link>
    </li>
  );
}

export default async function ProfilePage() {
  const identity = await getAppIdentity();
  const { role, permissions, l1 } = identity;
  const sections = NAV.flatMap((entry): Section[] => {
    if (!isGroup(entry)) {
      return listed(entry) && linkVisible(entry, role, permissions)
        ? [{ id: entry.href, label: null, items: [entry] }]
        : [];
    }
    if (entry.l1Only && !l1) return [];
    const items = entry.items.filter(
      (item) => listed(item) && linkVisible(item, role, permissions),
    );
    return items.length ? [{ id: entry.id, label: entry.label, items }] : [];
  });
  const initial = identity.userName.trim().slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-4">
      <Link
        href="/settings/profile"
        className="flex items-center gap-4 rounded-2xl border border-pine/10 bg-surface p-4 shadow-[0_1px_2px_rgba(32,58,53,0.06)] active:bg-pine-mist"
      >
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-clay-mist text-lg font-semibold text-clay"
        >
          {identity.userImage ? (
            <img
              src={identity.userImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-pine">
            {identity.userName}
          </span>
          <span className="block truncate text-sm text-ink/60">
            {identity.userEmail}
          </span>
          <span className="mt-1.5 inline-flex rounded-full bg-sage/45 px-2 py-0.5 text-[11px] font-medium text-pine">
            {identity.viaL1 ? "L1 · Hostayo operator" : roleLabel(role)}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink/35" aria-hidden />
      </Link>

      <section aria-label="Organization" className="space-y-3">
        <OrganizationSelector
          organizations={identity.organizations}
          activeOrganizationId={identity.organizationId}
          imageSrc={identity.organizationImage}
          l1={l1}
          className="w-full"
        />
        <SharePublicLink
          href={`/h/${encodeURIComponent(identity.organizationSlug)}`}
          title={`${identity.organizationName} public page`}
          label="Share public page"
          size="lg"
          className="w-full"
        />
      </section>

      {sections.map((section) => (
        <section key={section.id} aria-label={section.label ?? "More"}>
          {section.label ? (
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-ink/50">
              {section.label}
            </h2>
          ) : null}
          <ul className="divide-y divide-pine/10 overflow-hidden rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
            {section.items.map((item) => (
              <LinkRow key={item.href} item={item} />
            ))}
          </ul>
        </section>
      ))}

      <div className="overflow-hidden rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
        <SignOutButton isDemoAccount={identity.isDemoAccount ?? false} />
      </div>

      <p className="text-center text-xs font-medium text-ink/45">
        Version {APP_VERSION}
      </p>
    </div>
  );
}
