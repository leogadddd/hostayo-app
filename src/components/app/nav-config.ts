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
  House,
  Tray as Inbox,
  Calculator,
  CalendarDots as CalendarRange,
  Bank as Landmark,
  ChatText as MessageSquareText,
  Percent,
  Star,
  UserCircle,
} from "@/components/ui/icons";
import { can, type Permission, type RoleKey } from "@/lib/permissions";

export interface NavLink {
  href: string;
  label: string;
  icon: typeof House;
  /** The item shows when the member holds any of these; without it, it shows to everyone. */
  anyOf?: readonly Permission[];
  /** Active only on this exact path, not on pages beneath it. */
  exact?: boolean;
}

/** A labelled, collapsible section of links. */
export interface NavGroup {
  id: string;
  label: string;
  items: readonly NavLink[];
  defaultOpen?: boolean;
  /** Shown to L1 operators only. */
  l1Only?: boolean;
}

export type NavEntry = NavLink | NavGroup;

export const NAV: readonly NavEntry[] = [
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
      {
        href: "/reviews",
        label: "Reviews",
        icon: Star,
        anyOf: ["reviews.view"],
      },
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
    items: [
      { href: "/early-access", label: "Early access", icon: Inbox },
      { href: "/accounts", label: "Accounts", icon: Users },
      { href: "/workspaces", label: "Workspaces", icon: Building2 },
    ],
  },
];

/**
 * The phone's bottom tab bar. Each tab is one of the sidebar's own destinations
 * (so permissions and active-state rules stay the same) except Profile, which
 * opens the hub for everything that has no tab.
 */
export const TAB_BAR: readonly NavLink[] = [
  { href: "/dashboard", label: "Home", icon: House, exact: true },
  {
    href: "/reservations",
    label: "Reservations",
    icon: BookOpen,
    anyOf: ["reservations.view"],
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: Calendar,
    anyOf: ["reservations.view"],
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: ClipboardList,
    anyOf: ["tasks.view"],
  },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export function linkVisible(
  item: NavLink,
  role: RoleKey,
  permissions?: readonly Permission[],
) {
  return (
    !item.anyOf ||
    item.anyOf.some((permission) => can({ role, permissions }, permission))
  );
}

export function linkActive(item: NavLink, pathname: string) {
  if (item.href === "/settings/general")
    return pathname.startsWith("/settings");
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
