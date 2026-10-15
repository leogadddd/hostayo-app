"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Buildings as Building2,
  CalendarBlank as Calendar,
  ClipboardText as ClipboardList,
  Receipt,
  Tag,
  Wrench,
  ChartBar as BarChart3,
  Gear as Settings,
  Users,
  List as Menu,
  X,
  CaretRight as ChevronRight,
  Layout as LayoutDashboard,
  House,
  Tray as Inbox,
  Calculator,
  CalendarDots as CalendarRange,
  Bank as Landmark,
  ChatText as MessageSquareText,
  Percent,
  Scroll as ScrollText,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { SIDEBAR_GROUPS_COOKIE } from "@/lib/sidebar-groups";
import { APP_VERSION } from "@/lib/app-version";
import { can, type Permission, type RoleKey } from "@/lib/permissions";
import { Logo, LogoMark } from "@/components/logo";
import { AccountMenu } from "@/components/app/account-menu";
import { SharePublicLink } from "@/components/app/share-public-link";
import { LiveClock } from "@/components/app/live-clock";
import { GlobalSearch } from "@/components/app/global-search";
import {
  OrganizationSelector,
  type OrganizationOption,
} from "@/components/app/organization-selector";

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** The item shows when the member holds any of these; without it, it shows to everyone. */
  anyOf?: readonly Permission[];
  /** Active only on this exact path, not on pages beneath it. */
  exact?: boolean;
}

/** A labelled, collapsible section of links. */
interface NavGroup {
  id: string;
  label: string;
  items: readonly NavLink[];
  defaultOpen?: boolean;
  /** Shown to L1 operators only. */
  l1Only?: boolean;
}

type NavEntry = NavLink | NavGroup;

const NAV: readonly NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  {
    id: "bookings",
    label: "Bookings",
    defaultOpen: true,
    items: [
      {
        href: "/calendar",
        label: "Calendar",
        icon: Calendar,
        anyOf: ["reservations.view"],
      },
      {
        href: "/reservations",
        label: "Reservations",
        icon: BookOpen,
        anyOf: ["reservations.view"],
      },
      { href: "/guests", label: "Guests", icon: Users, anyOf: ["guests.view"] },
    ],
  },
  {
    id: "property",
    label: "Property",
    defaultOpen: true,
    items: [
      {
        href: "/properties",
        label: "Properties",
        icon: Building2,
        anyOf: ["properties.view"],
      },
      {
        href: "/tasks",
        label: "Tasks",
        icon: ClipboardList,
        anyOf: ["tasks.view"],
      },
    ],
  },
  {
    id: "money",
    label: "Money",
    defaultOpen: true,
    items: [
      {
        href: "/pricing",
        label: "Pricing",
        icon: Tag,
        anyOf: ["pricing.view"],
      },
      {
        href: "/expenses",
        label: "Expenses",
        icon: Receipt,
        anyOf: ["expenses.view"],
      },
      {
        href: "/reports",
        label: "Reports",
        icon: BarChart3,
        anyOf: ["reports.view"],
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      {
        href: "/tools",
        label: "All tools",
        icon: Wrench,
        anyOf: ["pricing.view"],
        exact: true,
      },
      {
        href: "/tools/pricing-calculator",
        label: "Rate calculator",
        icon: Calculator,
        anyOf: ["pricing.view"],
      },
      {
        href: "/tools/property-breakeven",
        label: "Property break-even",
        icon: Building2,
        anyOf: ["pricing.view"],
      },
      {
        href: "/tools/platform-fees",
        label: "Platform fees",
        icon: Percent,
        anyOf: ["pricing.view"],
      },
      {
        href: "/tools/guest-quote",
        label: "Guest quote",
        icon: MessageSquareText,
        anyOf: ["pricing.view"],
      },
      {
        href: "/tools/seasonal-planner",
        label: "Seasonal planner",
        icon: CalendarRange,
        anyOf: ["pricing.view"],
      },
      {
        href: "/tools/investment-payback",
        label: "Investment payback",
        icon: Landmark,
        anyOf: ["pricing.view"],
      },
    ],
  },
  { href: "/settings/general", label: "Settings", icon: Settings },
  {
    id: "l1",
    label: "L1 operator",
    l1Only: true,
    items: [{ href: "/early-access", label: "Early access", icon: Inbox }],
  },
];

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

function linkVisible(
  item: NavLink,
  role: RoleKey,
  permissions?: readonly Permission[],
) {
  return (
    !item.anyOf ||
    item.anyOf.some((permission) => can({ role, permissions }, permission))
  );
}

/** A page the header search can jump to. */
export interface SearchPage {
  href: string;
  label: string;
  group?: string;
  keywords?: string;
  icon: typeof LayoutDashboard;
}

/** Pages with no sidebar entry of their own that people still look for. */
const EXTRA_SEARCH_PAGES: readonly (NavLink & { keywords?: string })[] = [
  {
    href: "/settings/profile",
    label: "Profile",
    icon: Settings,
    keywords: "account name photo",
  },
  {
    href: "/settings/security",
    label: "Security",
    icon: Settings,
    keywords: "password two-factor 2fa",
  },
  {
    href: "/settings/organization",
    label: "Organization",
    icon: Settings,
    anyOf: ["organization.update"],
    keywords: "business name logo",
  },
  {
    href: "/settings/team",
    label: "Team",
    icon: Settings,
    anyOf: ["team.view"],
    keywords: "members staff invite",
  },
  {
    href: "/settings/permissions",
    label: "Permissions",
    icon: Settings,
    anyOf: ["team.view"],
    keywords: "roles access",
  },
  {
    href: "/settings/platforms",
    label: "Booking platforms",
    icon: Settings,
    anyOf: ["platforms.view"],
    keywords: "airbnb booking.com direct",
  },
  {
    href: "/settings/support",
    label: "Support",
    icon: Settings,
    keywords: "help contact",
  },
  {
    href: "/audit-logs",
    label: "Audit logs",
    icon: ScrollText,
    anyOf: ["audit_logs.view"],
    keywords: "activity history",
  },
];

/** Every page the member can open, for the header search: the sidebar's links plus a few settings pages. */
export function searchablePages(
  role: RoleKey,
  permissions: readonly Permission[] | undefined,
  l1: boolean,
): SearchPage[] {
  const pages: SearchPage[] = [];
  for (const entry of NAV) {
    if (isGroup(entry)) {
      if (entry.l1Only && !l1) continue;
      for (const item of entry.items) {
        if (linkVisible(item, role, permissions))
          pages.push({ ...item, group: entry.label });
      }
    } else if (linkVisible(entry, role, permissions)) {
      pages.push(entry);
    }
  }
  for (const item of EXTRA_SEARCH_PAGES) {
    if (linkVisible(item, role, permissions))
      pages.push({ ...item, group: "Settings" });
  }
  return pages;
}

function linkActive(item: NavLink, pathname: string) {
  if (item.href === "/settings/general")
    return pathname.startsWith("/settings");
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const GROUPS_CHANGED = "hostayo:sidebar-groups";

/** Set once a group is toggled in this tab, so the desktop sidebar and the mobile drawer agree. */
const NO_GROUPS: Record<string, boolean> = {};

let toggled: Record<string, boolean> | null = null;

function subscribeToGroups(callback: () => void) {
  window.addEventListener(GROUPS_CHANGED, callback);
  return () => window.removeEventListener(GROUPS_CHANGED, callback);
}

function saveGroups(groups: Record<string, boolean>) {
  toggled = groups;
  const value = Object.entries(groups)
    .map(([id, open]) => `${id}:${open ? 1 : 0}`)
    .join(",");
  document.cookie = `${SIDEBAR_GROUPS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(GROUPS_CHANGED));
}

type SidebarProps = {
  /** Dev-only: which database the server is using. Null in production. */
  databaseLabel?: string | null;
  organizationName: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  role: RoleKey;
  /** An L1 operator in an organization they aren't a member of. */
  viaL1?: boolean;
  /** The shared demo user returns to the public site after sign-out. */
  isDemoAccount?: boolean;
  /** The user is an L1 operator: the organization picker searches every organization. */
  l1?: boolean;
  /** Only decides which links to show; every page checks access itself. Defaults to the role's. */
  permissions?: readonly Permission[];
  organizationId?: string;
  organizationImage?: string | null;
  organizations?: OrganizationOption[];
  organizationSlug?: string;
  /** Early-access requests nobody has read yet; shown on the L1 folder. L1 operators only. */
  earlyAccessUnread?: number;
  /** Groups the member opened or closed, from the cookie the server read. */
  openGroups?: Record<string, boolean>;
};

function NavItem({
  item,
  pathname,
  onNavigate,
  badge,
}: {
  item: NavLink;
  pathname: string;
  onNavigate?: () => void;
  badge?: number;
}) {
  const active = linkActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border-l-2 px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "border-[#d58d74] bg-sage/20 text-white dark:border-[#c4674d]"
          : "border-transparent text-paper/80 hover:bg-paper/10 hover:text-white",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 dark:text-moss" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="rounded-full bg-clay px-2 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function Navigation({
  role,
  permissions,
  l1,
  earlyAccessUnread,
  openGroups,
  onNavigate,
}: {
  role: SidebarProps["role"];
  permissions: SidebarProps["permissions"];
  l1?: boolean;
  earlyAccessUnread?: number;
  openGroups: Record<string, boolean>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // Which groups the member opened or closed; the rest use their default.
  const open = useSyncExternalStore(
    subscribeToGroups,
    () => toggled ?? openGroups,
    () => openGroups,
  );
  const toggle = (id: string, next: boolean) =>
    saveGroups({ ...open, [id]: next });

  return (
    <nav
      aria-label="Primary"
      className="min-h-0 flex-1 select-none space-y-1 overflow-y-auto px-3 py-3"
    >
      {NAV.map((entry) => {
        if (!isGroup(entry)) {
          return linkVisible(entry, role, permissions) ? (
            <NavItem
              key={entry.href}
              item={entry}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ) : null;
        }
        if (entry.l1Only && !l1) return null;
        const items = entry.items.filter((item) =>
          linkVisible(item, role, permissions),
        );
        if (items.length === 0) return null;
        const hasActive = items.some((item) => linkActive(item, pathname));
        // The group holding the current page is open unless the member closed it.
        const expanded = open[entry.id] ?? (entry.defaultOpen || hasActive);
        const unread = entry.l1Only ? (earlyAccessUnread ?? 0) : 0;
        const panelId = `nav-group-${entry.id}`;
        return (
          <div
            key={entry.id}
            className={cn(
              "pt-2",
              entry.l1Only && "mt-2 border-t border-paper/10 pt-3",
            )}
          >
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggle(entry.id, !expanded)}
              className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper/50 transition-colors hover:text-paper/80"
            >
              <span className="flex-1 text-left">{entry.label}</span>
              {!expanded && unread > 0 ? (
                <span className="rounded-full bg-clay px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-white">
                  {unread}
                </span>
              ) : null}
              {!expanded && hasActive ? (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-[#d58d74]"
                />
              ) : null}
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  expanded && "rotate-90",
                )}
                aria-hidden
              />
            </button>
            {expanded ? (
              <div id={panelId} className="mt-0.5 space-y-1">
                {items.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    badge={
                      item.href === "/early-access" ? earlyAccessUnread : 0
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function AppSidebar(props: SidebarProps) {
  return (
    <aside
      data-testid="app-sidebar"
      className="theme-keep-light hidden h-full w-60 shrink-0 flex-col bg-pine text-paper lg:flex xl:w-64"
    >
      <Link
        href="/dashboard"
        aria-label="Hostayo dashboard"
        className="block px-6 pb-5 pt-7"
      >
        <Logo className="text-paper" />
        {/* <p className="mt-3 truncate text-xs tracking-wide text-paper/60">
          {props.organizationName}
        </p> */}
      </Link>
      <Navigation
        role={props.role}
        permissions={props.permissions}
        l1={props.l1}
        earlyAccessUnread={props.earlyAccessUnread}
        openGroups={props.openGroups ?? NO_GROUPS}
      />
      <p className="px-6 py-5 text-xs font-medium tracking-wide text-paper/45">
        {props.databaseLabel && (
          <span className="mb-1 block text-paper/70">
            {props.databaseLabel}
          </span>
        )}
        Version {APP_VERSION}
      </p>
    </aside>
  );
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  calendar: "Calendar",
  availability: "Check availability",
  reservations: "Reservations",
  guests: "Guests",
  tasks: "Tasks",
  inventory: "Inventory",
  expenses: "Expenses",
  reports: "Reports",
  "audit-logs": "Audit logs",
  "early-access": "Early access",
  settings: "Settings",
  properties: "Properties",
  units: "Units",
  new: "New",
  edit: "Edit",
  organization: "Organization",
  "payment-instructions": "Payment instructions",
  staff: "Staff",
  payments: "Payments",
  refunds: "Refunds",
  deductions: "Deductions",
  damage: "Damage",
  proofs: "Payment proofs",
  "check-in": "Check in",
  "check-out": "Check out",
  confirm: "Confirm",
  cancel: "Cancel",
  blocks: "Blocks",
  checklist: "Checklist",
  ready: "Mark ready",
  resolve: "Resolve",
  record: "Record payment",
  confirmation: "Saved",
};

export function AppHeader({
  initialNow,
  ...props
}: SidebarProps & { initialNow: string }) {
  const pathname = usePathname();
  const mobileNav = useRef<HTMLDialogElement>(null);
  // const segments = pathname.split("/").filter(Boolean);
  const organizations = props.organizations ?? [
    {
      id: props.organizationId ?? "current",
      name: props.organizationName,
      role: props.role,
    },
  ];
  const activeOrganizationId = props.organizationId ?? organizations[0]!.id;
  const searchPages = useMemo(
    () => searchablePages(props.role, props.permissions, props.l1 ?? false),
    [props.role, props.permissions, props.l1],
  );
  return (
    <header
      data-testid="app-header"
      className="z-20 flex h-20 shrink-0 items-center justify-between gap-3 border-b border-pine/12 bg-chrome px-4 sm:px-6 lg:px-6"
    >
      <div className="flex min-w-0 items-center gap-3 lg:gap-0">
        <button
          type="button"
          aria-label="Open navigation"
          aria-haspopup="dialog"
          onClick={() => mobileNav.current?.showModal()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-pine/15 text-pine lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          href="/dashboard"
          aria-label="Hostayo dashboard"
          className="inline-flex sm:hidden"
        >
          <LogoMark className="h-8 w-7 text-pine" />
        </Link>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
          {/* <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {segments.map((segment, index) => {
              const label = SEGMENT_LABELS[segment] ?? "Details";
              const last = index === segments.length - 1;
              const href = `/${segments.slice(0, index + 1).join("/")}`;
              const linked =
                !last && NAV_ITEMS.some((item) => item.href === href);
              return (
                <li
                  key={href}
                  className={cn(
                    "flex items-center gap-2",
                    last ? "font-semibold text-pine" : "text-ink/55",
                    index < segments.length - 2 ? "hidden sm:flex" : "",
                  )}
                >
                  {index > 0 ? (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-ink/35"
                      aria-hidden
                    />
                  ) : null}
                  {linked ? (
                    <Link href={href} className="hover:text-clay">
                      {label}
                    </Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined}>
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol> */}
        </nav>
        {/* Below lg the selector lives in the navigation drawer instead. */}
        <OrganizationSelector
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
          imageSrc={props.organizationImage ?? null}
          className="hidden lg:block"
          l1={props.l1}
        />
      </div>
      <div className="flex min-w-0 flex-1 justify-end md:justify-center md:px-4">
        <GlobalSearch
          organizationId={activeOrganizationId}
          userEmail={props.userEmail}
          pages={searchPages}
        />
      </div>
      <div className="flex shrink-0 items-center gap-5">
        {props.organizationSlug ? (
          <SharePublicLink
            href={`/h/${encodeURIComponent(props.organizationSlug)}`}
            title={`${props.organizationName} public page`}
            label="Share"
            size="md"
            hideLabelOnMobile
            className="border-transparent px-2 hover:border-transparent sm:border-pine/25 sm:px-4 sm:hover:border-pine/50"
          />
        ) : null}
        <LiveClock initialNow={initialNow} />
        <AccountMenu
          userName={props.userName}
          userEmail={props.userEmail}
          userImage={props.userImage ?? null}
          role={props.role}
          viaL1={props.viaL1}
          isDemoAccount={props.isDemoAccount}
        />
      </div>
      <dialog
        ref={mobileNav}
        aria-label="Navigation"
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none theme-keep-light w-72 max-w-[85vw] border-0 bg-pine p-0 text-paper backdrop:bg-scrim/50"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-6">
            <Logo className="w-40 text-paper" />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => mobileNav.current?.close()}
              className="rounded-lg p-2 hover:bg-paper/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <OrganizationSelector
            organizations={organizations}
            activeOrganizationId={activeOrganizationId}
            imageSrc={props.organizationImage ?? null}
            tone="dark"
            l1={props.l1}
            className="mx-3.5 mb-2 border-b border-paper/10 pb-3"
            onSwitched={() => mobileNav.current?.close()}
          />
          <Navigation
            role={props.role}
            permissions={props.permissions}
            l1={props.l1}
            earlyAccessUnread={props.earlyAccessUnread}
            openGroups={props.openGroups ?? NO_GROUPS}
            onNavigate={() => mobileNav.current?.close()}
          />
          <p className="px-6 py-5 text-xs font-medium tracking-wide text-paper/45">
            {props.databaseLabel && (
              <span className="mb-1 block text-paper/70">
                {props.databaseLabel}
              </span>
            )}
            Version {APP_VERSION}
          </p>
        </div>
      </dialog>
    </header>
  );
}
