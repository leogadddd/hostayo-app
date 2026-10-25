import Link from "next/link";
import { Play, MagnifyingGlass as Search, X } from "@/components/ui/icons";
import { EndOfPage } from "@/components/app/end-of-page";
import { MOBILE_CARD } from "@/components/app/mobile-ui";
import {
  MobileTopBar,
  type MobileSearchProps,
} from "@/components/app/mobile-top-bar";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type PhoneTask = {
  id: string;
  unitName: string;
  propertyName: string;
  status: "open" | "ready";
  doneItems: number;
  totalItems: number;
  requiredLeft: number;
  /** Already formatted for display, "—" when there is none. */
  checkedOut: string;
  markedReady: string;
};

const DOT = { open: "bg-clay", ready: "bg-moss" } as const;

function StatusChip({
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
        "flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold",
        active
          ? "bg-pine text-white"
          : "bg-surface text-pine ring-1 ring-pine/12",
      )}
    >
      {dot ? (
        <span aria-hidden className={cn("h-2 w-2 rounded-full", dot)} />
      ) : null}
      {label}
      <span
        className={cn(
          "rounded-full px-2 text-xs tabular-nums",
          active ? "bg-white/20" : "bg-pine/[0.07] text-ink/60",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

/** The phone turnover list: one card per unit with a big Start or Resume button. */
export function MobileTasks({
  search,
  tasks,
  counts,
  allCount,
  status,
  query,
  showProperty,
  canWork,
  filtered,
  hrefWith,
}: {
  search: MobileSearchProps;
  tasks: PhoneTask[];
  counts: { open: number; ready: number };
  allCount: number;
  status?: "open" | "ready";
  query: string;
  showProperty: boolean;
  canWork: boolean;
  filtered: boolean;
  hrefWith: (patch: Record<string, string | undefined>) => string;
}) {
  return (
    <div>
      <MobileTopBar title="Tasks" search={search} />

      <form method="get" role="search" className="mt-1">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="m-task-search" className="sr-only">
          Search unit or property
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-pine/60"
            aria-hidden
          />
          <input
            id="m-task-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search unit or property"
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl bg-surface pl-12 pr-11 text-base text-ink shadow-[0_4px_20px_rgba(32,58,53,0.08)] ring-1 ring-pine/8 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-pine/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <Link
              href={hrefWith({ q: undefined })}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-ink/10 text-ink/60"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </form>

      <nav
        aria-label="Filter by status"
        className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        <StatusChip
          href={hrefWith({ status: undefined })}
          active={!status}
          label="All"
          count={allCount}
        />
        {(["open", "ready"] as const).map((value) => (
          <StatusChip
            key={value}
            href={hrefWith({ status: value })}
            active={status === value}
            label={TASK_STATUS_LABELS[value]}
            count={counts[value]}
            dot={DOT[value]}
          />
        ))}
      </nav>

      {tasks.length === 0 ? (
        <EmptyState
          className="mt-8"
          art="tasks"
          title={filtered ? "No tasks match" : "No turnover tasks yet"}
          description={
            filtered
              ? "Nothing matches these filters. Try widening the search."
              : "Check a guest out and the turnover checklist for that unit opens here."
          }
        />
      ) : (
        <>
          <ul className="mt-2 space-y-3" aria-label="Turnover tasks">
            {tasks.map((task) => {
              const open = task.status === "open";
              const percent = task.totalItems
                ? Math.round((task.doneItems / task.totalItems) * 100)
                : 0;
              return (
                <li key={task.id}>
                  <div className={cn(MOBILE_CARD, "p-4")}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-lg font-semibold text-pine">
                          {task.unitName}
                        </span>
                        {showProperty ? (
                          <span className="block truncate text-sm text-ink/60">
                            {task.propertyName}
                          </span>
                        ) : null}
                      </span>
                      <Badge tone={open ? "clay" : "sage"}>
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                    </Link>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="h-2 flex-1 overflow-hidden rounded-full bg-pine/10"
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
                      <span className="text-sm tabular-nums text-ink/65">
                        {task.doneItems} of {task.totalItems}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink/55">
                      {open
                        ? `${task.requiredLeft} required left · out ${task.checkedOut}`
                        : `Ready ${task.markedReady} · out ${task.checkedOut}`}
                    </p>
                    {open && canWork ? (
                      <Link
                        href={`/tasks/${task.id}`}
                        aria-label={`${task.doneItems > 0 ? "Resume" : "Start"} turnover for ${task.unitName}`}
                        className={buttonClassName("clay", "md", "mt-4 w-full")}
                      >
                        <Play className="h-4 w-4" aria-hidden />
                        {task.doneItems > 0 ? "Resume" : "Start turnover"}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <EndOfPage />
        </>
      )}
    </div>
  );
}
