"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Permission, RoleKey } from "@/lib/permissions";
import { TAB_BAR, linkActive, linkVisible } from "@/components/app/nav-config";

/**
 * The phone's primary navigation: Home, Reservations, Calendar, Tasks and
 * Profile. It replaces the sidebar below `lg` and sits under the scroll
 * region, so it never covers page content. Tabs follow the same permissions as
 * the sidebar (a cleaner without reservations access just sees fewer tabs).
 */
export function MobileTabBar({
  role,
  permissions,
}: {
  role: RoleKey;
  permissions?: readonly Permission[];
}) {
  const pathname = usePathname();
  const tabs = TAB_BAR.filter((tab) => linkVisible(tab, role, permissions));
  // Pages with no tab of their own (Guests, Settings, Reports…) are reached
  // from Profile, so that tab stays lit while you are inside them.
  const matched = tabs.find(
    (tab) => tab.href !== "/profile" && linkActive(tab, pathname),
  );
  return (
    <nav
      aria-label="Primary"
      data-testid="mobile-tab-bar"
      className="z-20 shrink-0 border-t border-pine/12 bg-chrome pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {tabs.map((tab) => {
          const active = matched ? matched === tab : tab.href === "/profile";
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 px-0.5 text-[10.5px] font-medium tracking-tight transition-colors",
                  active ? "text-clay" : "text-ink/60 active:text-pine",
                )}
              >
                <Icon className="h-6 w-6 shrink-0" aria-hidden />
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
