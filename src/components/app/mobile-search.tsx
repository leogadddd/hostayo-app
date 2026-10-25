"use client";

import { useMemo } from "react";
import { GlobalSearch } from "@/components/app/global-search";
import { searchablePages } from "@/components/app/sidebar";
import type { Permission, RoleKey } from "@/lib/permissions";

/**
 * Search for the phone layout, which has no header to hold it. It builds the
 * page list in the browser (the pages carry icon components, which a server
 * component can't hand to a client one).
 */
export function MobileSearch({
  organizationId,
  userEmail,
  role,
  permissions,
  l1,
  variant = "header",
}: {
  organizationId: string;
  userEmail: string;
  role: RoleKey;
  permissions?: readonly Permission[];
  l1: boolean;
  variant?: "header" | "pill";
}) {
  const pages = useMemo(
    () => searchablePages(role, permissions, l1),
    [role, permissions, l1],
  );
  return (
    <GlobalSearch
      organizationId={organizationId}
      userEmail={userEmail}
      pages={pages}
      variant={variant}
    />
  );
}
