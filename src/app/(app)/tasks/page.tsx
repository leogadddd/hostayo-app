import Link from "next/link";
import type { Metadata } from "next";
import { Play, ReceiptText, Search, X } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { PermissionDenied } from "@/components/app/permission-denied";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { listTasks } from "@/server/operations/service";
import { PageHeading } from "@/components/app/page-heading";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";

export const metadata: Metadata = { title: "Turnover tasks" };

// Tasks are stamped in UTC; show them in the operators' local time.
const STAMP = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});
const STAMP_WITH_YEAR = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});
const YEAR = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  timeZone: "Asia/Manila",
});

const STATUSES = ["open", "ready"] as const;
type TaskStatus = (typeof STATUSES)[number];
const STATUS_TONE: Record<TaskStatus, "sage" | "clay"> = {
  open: "clay",
  ready: "sage",
};
const STATUS_DOT: Record<TaskStatus, string> = {
  open: "bg-clay",
  ready: "bg-moss",
};

/** "Oct 20, 3:15 PM" this year; "Oct 20, 2027" otherwise, so the column stays narrow. */
function stampLabel(date: Date | null, thisYear: string) {
  if (!date) return "—";
  return YEAR.format(date) === thisYear
    ? STAMP.format(date)
    : STAMP_WITH_YEAR.format(date);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const membership = await requirePermission("tasks.view");
  if (!membership) return <PermissionDenied />;
  const params = await searchParams;
  const canWork = can(membership, "tasks.update");
  const canSeeReservations = can(membership, "reservations.view");
  const status = STATUSES.includes(params.status as TaskStatus)
    ? (params.status as TaskStatus)
    : undefined;
  const query = params.q?.trim().toLowerCase() ?? "";

  // Loaded without the status filter so the status pills can show counts.
  const allTasks = (await listTasks(membership.organizationId)).filter(
    (task) =>
      !query ||
      task.unitName.toLowerCase().includes(query) ||
      task.propertyName.toLowerCase().includes(query),
  );
  const tasks = status
    ? allTasks.filter((task) => task.status === status)
    : allTasks;
  const counts = new Map<TaskStatus, number>();
  for (const task of allTasks)
    counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
  const showProperty =
    new Set(allTasks.map((task) => task.propertyName)).size > 1;
  const thisYear = YEAR.format(new Date());

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const next = { q: params.q, status, ...patch };
    for (const [key, value] of Object.entries(next))
      if (value) search.set(key, value);
    const text = search.toString();
    return text ? `/tasks?${text}` : "/tasks";
  };
  const filtered = Boolean(query || status);

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Turnover tasks"
        description="Check and prepare each unit for the next guest. Turnover checklists open automatically at check-out."
      />

      <nav
        aria-label="Filter by status"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        <StatusPill
          href={hrefWith({ status: undefined })}
          active={!status}
          label="All"
          count={allTasks.length}
        />
        {STATUSES.map((value) => (
          <StatusPill
            key={value}
            href={hrefWith({ status: value })}
            active={status === value}
            label={TASK_STATUS_LABELS[value]}
            count={counts.get(value) ?? 0}
            dot={STATUS_DOT[value]}
          />
        ))}
      </nav>

      <form method="get" role="search" className="mt-4 sm:max-w-md">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="task-search" className="sr-only">
          Search unit or property
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine/45"
            aria-hidden
          />
          <Input
            id="task-search"
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search unit or property"
            className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {params.q ? (
            <Link
              href={hrefWith({ q: undefined })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink/45 hover:bg-pine-mist hover:text-pine"
            >
              <X className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </form>

      {tasks.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={filtered ? "No tasks match" : "No turnover tasks yet"}
          description={
            filtered
              ? "Nothing matches these filters. Try widening the search."
              : "Check a guest out from their reservation and the turnover checklist for that unit opens here automatically."
          }
        />
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
          <Table
            aria-label="Turnover tasks"
            className="[&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4"
          >
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                {showProperty ? <TableHead>Property</TableHead> : null}
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Required left</TableHead>
                <TableHead>Checked out</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Marked ready</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const href = `/tasks/${task.id}`;
                const open = task.status === "open";
                const percent = task.totalItems
                  ? Math.round((task.doneItems / task.totalItems) * 100)
                  : 0;
                return (
                  <TableRow
                    key={task.id}
                    className={cn(!open && "text-ink/60")}
                  >
                    <TableCell className="max-w-48 truncate">
                      <Link
                        href={href}
                        className="font-medium text-pine underline-offset-4 hover:underline"
                      >
                        {task.unitName}
                      </Link>
                    </TableCell>
                    {showProperty ? (
                      <TableCell className="max-w-40 truncate text-ink/70">
                        {task.propertyName}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <Badge tone={STATUS_TONE[task.status]}>
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-36 items-center gap-2.5">
                        <div
                          className="h-1.5 w-20 overflow-hidden rounded-full bg-pine/10"
                          aria-hidden
                        >
                          <div
                            className={cn(
                              "h-full rounded-full",
                              open ? "bg-clay" : "bg-moss",
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-xs tabular-nums text-ink/65">
                          {task.doneItems} of {task.totalItems}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-ink/75">
                      {open ? (
                        task.requiredLeft
                      ) : (
                        <span className="text-ink/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink/70">
                      {stampLabel(task.createdAt, thisYear)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink/65">
                      {stampLabel(task.lastActivityAt, thisYear)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink/65">
                      {stampLabel(task.markedReadyAt, thisYear)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {open && canWork ? (
                          <Link
                            href={href}
                            className={buttonClassName(
                              "clay",
                              "sm",
                              "whitespace-nowrap",
                            )}
                            aria-label={`Start turnover for ${task.unitName}`}
                          >
                            <Play className="h-3.5 w-3.5" aria-hidden />
                            {task.doneItems > 0 ? "Resume" : "Start"}
                          </Link>
                        ) : null}
                        <TableActionsMenu
                          label={`turnover for ${task.unitName}`}
                          viewHref={href}
                          links={
                            canSeeReservations && task.reservationId
                              ? [
                                  {
                                    href: `/reservations/${task.reservationId}`,
                                    label: "Reservation",
                                    icon: (
                                      <ReceiptText
                                        className="h-4 w-4"
                                        aria-hidden
                                      />
                                    ),
                                  },
                                ]
                              : []
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="border-t border-pine/10 bg-linen/60 px-4 py-2.5 text-xs text-ink/55">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            {status ? ` · ${TASK_STATUS_LABELS[status].toLowerCase()}` : ""} ·
            open tasks first, newest check-out on top
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  href,
  active,
  label,
  count,
  dot,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-pine/15 bg-surface text-pine hover:border-pine/35",
      )}
    >
      {dot ? (
        <span aria-hidden className={cn("h-2 w-2 rounded-full", dot)} />
      ) : null}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-white/20 text-white" : "bg-pine/[0.07] text-ink/60",
        )}
      >
        {count}
      </span>
    </Link>
  );
}
