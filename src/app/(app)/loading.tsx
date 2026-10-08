"use client";

import { usePathname } from "next/navigation";
import {
  AvailabilitySkeleton,
  CalendarSkeleton,
  CardGridSkeleton,
  DashboardSkeleton,
  DetailSkeleton,
  ExpensesSkeleton,
  GenericPageSkeleton,
  GuestDetailSkeleton,
  GuestsSkeleton,
  NarrowFormSkeleton,
  ReportsSkeleton,
  SettingsSkeleton,
  TasksSkeleton,
  TableListSkeleton,
  WideFormSkeleton,
} from "@/components/app/page-skeletons";

/**
 * Shown immediately during an App Router navigation while dynamic,
 * authenticated page data is being rendered on the server.
 *
 * This is the only loading boundary under (app), so it shows when moving
 * between sections (and on first load). The router has already committed the
 * destination URL when this renders, so the skeleton is picked to match the
 * page being loaded. Nested boundaries are avoided on purpose: they would also
 * fire for the intercepted @modal routes and for search-param changes such as
 * paging the calendar.
 */
export default function AppLoading() {
  const segments = usePathname().split("/").filter(Boolean);
  const [section, id, action] = segments;
  const last = segments.at(-1);

  switch (section) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "calendar":
      if (id !== "availability") return <CalendarSkeleton />;
      return action ? <DetailSkeleton /> : <AvailabilitySkeleton />;
    case "reservations":
      if (!id) return <TableListSkeleton pills filters={3} />;
      if (id === "new" || action === "edit") return <WideFormSkeleton />;
      if (!action || action === "confirmation") return <DetailSkeleton />;
      return <NarrowFormSkeleton />;
    case "properties":
      if (!id) return <CardGridSkeleton />;
      // New/edit property (…/new, /:id/edit) and unit (…/units/new, …/units/:id/edit).
      if (
        (last === "new" && segments.length <= 4) ||
        (last === "edit" && (segments.length === 3 || segments.length === 5))
      ) {
        return <WideFormSkeleton />;
      }
      if (
        segments.length === 2 ||
        (segments.length === 4 && segments[2] === "units")
      )
        return <DetailSkeleton />;
      return <NarrowFormSkeleton />;
    case "guests":
      if (!id) return <GuestsSkeleton />;
      if (id === "new" || action === "edit") return <WideFormSkeleton />;
      return <GuestDetailSkeleton />;
    case "expenses":
      if (!id) return <ExpensesSkeleton />;
      return id === "recurring" ? (
        <TableListSkeleton filters={1} />
      ) : (
        <NarrowFormSkeleton />
      );
    case "tasks":
      if (!id) return <TasksSkeleton />;
      return action ? <NarrowFormSkeleton /> : <GenericPageSkeleton />;
    case "reports":
      return <ReportsSkeleton />;
    case "audit-logs":
      return <TableListSkeleton filters={4} />;
    case "settings":
      return <SettingsSkeleton />;
    default:
      return <GenericPageSkeleton />;
  }
}
