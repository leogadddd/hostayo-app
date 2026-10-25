import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLineDown as ArrowDownToLine,
  ArrowLineUp as ArrowUpFromLine,
  ArrowRight,
  CaretRight as ChevronRight,
  CheckCircle as CircleCheck,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EndOfPage } from "@/components/app/end-of-page";
import { MobileFab, type FabAction } from "@/components/app/mobile-fab";
import { MobileWorkspaceSwitcher } from "@/components/app/mobile-workspace-switcher";
import { MobileSearch } from "@/components/app/mobile-search";
import type { MobileSearchProps } from "@/components/app/mobile-top-bar";
import { cn } from "@/lib/utils";
import { DamageCard } from "./damage-card";
import { GoLiveChecklistCard } from "./go-live-checklist";
import { DashboardSky } from "./dashboard-sky";
import { ExpenseBreakdown } from "./expense-breakdown";
import { MiniCalendar } from "./mini-calendar";
import { MobileMoney } from "./mobile-money";
import {
  MONTH_LABEL,
  dayPeriod,
  greeting,
  localTimeLabel,
  plural,
  type DashboardModel,
  type ScheduleRow,
} from "./model";
import { NotesCard } from "./notes-card";
import { PerformanceSection } from "./performance";
import { PlatformBreakdown } from "./platform-breakdown";
import { ATTENTION_ICON, CARD, STATUS_STYLE } from "./shared";

const LONG_DATE = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

type Movement = ScheduleRow & { direction: "in" | "out" };

const SHORT_LABEL = {
  arrivals: "Arriving",
  departures: "Leaving",
  inHouse: "In house",
} as const;

/** A titled block of the phone dashboard. */
function Section({
  title,
  badge,
  action,
  children,
}: {
  title: string;
  badge?: ReactNode;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="mt-9" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-xl text-pine">{title}</h2>
          {badge}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-0.5 rounded-full bg-clay-mist px-3 py-1.5 text-xs font-semibold text-clay-deep active:opacity-80"
          >
            {action.label}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MovementRow({ row }: { row: Movement }) {
  const arriving = row.direction === "in";
  const Icon = arriving ? ArrowDownToLine : ArrowUpFromLine;
  const done = row.status.tone === "done";
  const [clock, meridiem] = row.time
    ? localTimeLabel(row.time).split(" ")
    : ["—", ""];
  return (
    <li>
      <Link
        href={row.href}
        className={cn(
          "flex gap-3.5 px-4 py-4 active:bg-pine-mist/70",
          done && "opacity-65",
        )}
      >
        <span className="w-11 shrink-0 text-right leading-tight">
          <span className="block text-base font-semibold tabular-nums text-pine">
            {clock}
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/40">
            {meridiem}
          </span>
        </span>
        <span
          aria-hidden
          className={cn(
            "w-1 shrink-0 self-stretch rounded-full",
            arriving ? "bg-moss/70" : "bg-clay/60",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "truncate text-[15px] font-semibold text-pine",
                done && "line-through decoration-pine/30",
              )}
            >
              {row.guestName}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                STATUS_STYLE[row.status.tone],
              )}
            >
              {done ? <CircleCheck className="h-3 w-3" aria-hidden /> : null}
              {row.status.label}
            </span>
          </span>
          <span className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-ink/60">
            <Icon
              className={cn(
                "mt-px h-3.5 w-3.5 shrink-0",
                arriving ? "text-moss" : "text-clay",
              )}
              aria-hidden
            />
            <span className="line-clamp-2">{row.detail}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/** The phone dashboard: what is happening today first, the long reports last. */
export function MobileDashboard({
  model,
  search,
  workspaces,
}: {
  model: DashboardModel;
  search: MobileSearchProps;
  workspaces: React.ComponentProps<typeof MobileWorkspaceSwitcher>;
}) {
  const {
    membership,
    units,
    timezone,
    today,
    month,
    monthName,
    monthGrid,
    tiles,
    summary,
    arrivals,
    departures,
    arrivalsDone,
    departuresDone,
    arrivalRows,
    departureRows,
    attentionCount,
    attentionItems,
    damage,
    openDamage,
    damageEstimate,
    properties,
    miniCalendarEvents,
    platformBreakdown,
    expenseCategories,
    series,
    monthReport,
    showExpenses,
    showPerformance,
    showMoney,
    canSeeReservations,
    canSeeProperties,
    canCreateReservation,
    canCreateProperty,
  } = model;

  const monthLabel = MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`));
  const movements: Movement[] = [
    ...departureRows.map((row) => ({ ...row, direction: "out" as const })),
    ...arrivalRows.map((row) => ({ ...row, direction: "in" as const })),
  ].sort((a, b) => {
    if (a.time === b.time) return 0;
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time.localeCompare(b.time);
  });
  const movementsDone = arrivalsDone + departuresDone;
  const progress = movements.length ? movementsDone / movements.length : 0;
  const hero = tiles.filter((tile) =>
    ["arrivals", "departures", "inHouse"].includes(tile.id),
  );
  const secondary = tiles.filter(
    (tile) => !["arrivals", "departures", "inHouse"].includes(tile.id),
  );
  const fabActions: FabAction[] = [
    ...(canCreateReservation
      ? [
          {
            href: "/reservations/new",
            label: "New booking",
            icon: "plus",
          } satisfies FabAction,
        ]
      : []),
    {
      href: "/calendar/availability",
      label: "Check availability",
      icon: "availability",
    },
  ];

  return (
    <div className="pb-28">
      {/* Greeting on a soft sky that fades into the page */}
      <header className="relative -mx-4 -mt-5 min-h-[12.5rem] overflow-hidden px-5 pb-12 pt-9 sm:-mx-6 sm:-mt-6 sm:px-8">
        <DashboardSky
          period={dayPeriod(timezone)}
          className="absolute inset-0 h-full w-full dark:opacity-30"
        />
        <div className="relative">
          <p className="text-sm font-medium text-pine/65">
            {LONG_DATE.format(new Date(`${today}T00:00:00Z`))}
          </p>
          <h1 className="mt-1 font-display text-[2.1rem] leading-[1.1] tracking-tight text-pine">
            {greeting(timezone)}
          </h1>
          <MobileWorkspaceSwitcher {...workspaces} className="mt-2" />
        </div>
      </header>
      <div className="relative z-10 -mt-7">
        <MobileSearch {...search} variant="pill" />
      </div>

      {model.goLive ? (
        <div className="mt-6">
          <GoLiveChecklistCard checklist={model.goLive} />
        </div>
      ) : null}

      {units.length === 0 ? (
        // The checklist already says what to add first.
        model.goLive ? null : (
          <div className="mt-8">
            <EmptyState
              art="dashboard"
              title="Your dashboard is ready"
              description={
                canCreateProperty
                  ? "Add your first property and unit to start tracking arrivals, cleaning work and occupancy."
                  : "Ask an owner or admin to add the first property and unit."
              }
              action={
                canCreateProperty ? (
                  <Link
                    href="/properties/new"
                    className={buttonClassName("clay", "md")}
                  >
                    Add a property
                  </Link>
                ) : undefined
              }
            />
          </div>
        )
      ) : (
        <>
          {/* Today at a glance */}
          <section
            aria-label="At a glance"
            className="relative mt-6 overflow-hidden rounded-3xl bg-primary p-5 text-white shadow-[0_14px_32px_rgba(32,58,53,0.3)]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/[0.07]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/[0.05]"
            />
            <div className="relative flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                Today
              </p>
              {movements.length ? (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                  {movementsDone} of {movements.length} done
                </span>
              ) : null}
            </div>
            <div className="relative mt-4 grid grid-cols-3 divide-x divide-white/15">
              {hero.map(({ id, value, helper, icon: Icon, href }) => (
                <Link
                  key={id}
                  href={href}
                  className="flex flex-col items-start px-3 first:pl-0 last:pr-0 active:opacity-80"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="mt-3 font-display text-[2.6rem] leading-none tabular-nums">
                    {value}
                  </span>
                  <span className="mt-1.5 text-xs font-semibold text-white/85">
                    {SHORT_LABEL[id as keyof typeof SHORT_LABEL]}
                  </span>
                  <span className="sr-only">{helper}</span>
                </Link>
              ))}
            </div>
            <div className="relative mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-sage"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/65">
                {movements.length
                  ? `${plural(movements.length - movementsDone, "movement")} left today`
                  : "Nothing scheduled today"}
              </p>
            </div>
          </section>

          <section
            aria-label="This month"
            className="mt-3 grid grid-cols-3 gap-2.5"
          >
            {secondary.map(
              ({ id, label, value, helper, icon: Icon, tone, href }) => (
                <Link
                  key={id}
                  href={href}
                  className={cn(
                    CARD,
                    "flex flex-col p-3.5 active:bg-pine-mist",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      tone,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="mt-3 font-display text-[1.7rem] leading-none tabular-nums text-pine">
                    {value}
                  </span>
                  <span className="mt-1.5 text-[11px] font-semibold leading-tight text-ink/70">
                    {label}
                  </span>
                  <span className="sr-only">{helper}</span>
                </Link>
              ),
            )}
          </section>

          {/* Schedule */}
          <Section
            title="Schedule"
            badge={
              movements.length ? (
                <Badge tone="neutral">{movements.length}</Badge>
              ) : null
            }
            action={{ href: "/calendar", label: "Calendar" }}
          >
            {movements.length === 0 ? (
              <div
                className={cn(
                  CARD,
                  "flex flex-col items-center px-4 py-9 text-center",
                )}
              >
                <CircleCheck className="h-8 w-8 text-sage-deep" aria-hidden />
                <p className="mt-2.5 text-sm font-medium text-ink/65">
                  No arrivals or departures today.
                </p>
              </div>
            ) : (
              <ul
                className={cn(CARD, "divide-y divide-pine/8 overflow-hidden")}
              >
                {movements.map((row) => (
                  <MovementRow key={`${row.direction}-${row.id}`} row={row} />
                ))}
              </ul>
            )}
          </Section>

          {/* Needs attention */}
          <Section
            title="Needs attention"
            badge={
              attentionCount ? (
                <Badge tone="clay">{attentionCount}</Badge>
              ) : (
                <Badge tone="sage">All clear</Badge>
              )
            }
          >
            {attentionCount === 0 ? (
              <div
                className={cn(
                  CARD,
                  "flex flex-col items-center px-4 py-9 text-center",
                )}
              >
                <CircleCheck className="h-8 w-8 text-sage-deep" aria-hidden />
                <p className="mt-2.5 text-sm font-medium text-ink/65">
                  Nothing is waiting on you.
                </p>
              </div>
            ) : (
              <ul
                className={cn(CARD, "divide-y divide-pine/8 overflow-hidden")}
              >
                {attentionItems.map((item) => {
                  const Icon = ATTENTION_ICON[item.kind];
                  const urgent = item.tone === "urgent";
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3.5 px-4 py-3.5 active:bg-pine-mist/70",
                          urgent && "bg-clay-mist/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                            urgent
                              ? "bg-clay text-white"
                              : "bg-pine-mist text-pine",
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold leading-snug text-pine">
                            {item.title}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink/60">
                            {item.detail}
                          </span>
                          {item.progress !== undefined ? (
                            <span
                              className="mt-2 block h-1.5 overflow-hidden rounded-full bg-pine/10"
                              aria-hidden
                            >
                              <span
                                className="block h-full rounded-full bg-clay"
                                style={{ width: `${item.progress * 100}%` }}
                              />
                            </span>
                          ) : null}
                        </span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-ink/30"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {showPerformance && series ? (
            <MobileMoney
              series={series}
              today={today}
              monthName={monthName}
              balances={
                monthReport
                  ? {
                      depositsHeldCents: monthReport.summary.depositsHeldCents,
                      bookedValueCents: monthReport.summary.bookedValueCents,
                      month,
                    }
                  : null
              }
            />
          ) : null}

          <MiniCalendar
            className={cn(CARD, "mt-9")}
            month={month}
            today={today}
            monthLabel={monthLabel}
            gridStart={monthGrid.start}
            gridEnd={monthGrid.end}
            events={miniCalendarEvents}
          />

          <DamageCard
            className={cn(CARD, "mt-6")}
            reports={damage}
            available={openDamage !== null}
            multipleProperties={properties.length > 1}
            showMoney={showMoney}
            estimateCents={damageEstimate}
            canSeeReservations={canSeeReservations}
            canSeeProperties={canSeeProperties}
          />

          {showPerformance ? (
            series ? (
              <PerformanceSection
                series={series}
                today={today}
                balances={
                  monthReport
                    ? {
                        depositsHeldCents:
                          monthReport.summary.depositsHeldCents,
                        bookedValueCents: monthReport.summary.bookedValueCents,
                        month,
                      }
                    : null
                }
              />
            ) : (
              <p className={cn(CARD, "mt-8 p-4 text-sm text-ink/60")}>
                Performance charts are temporarily unavailable.
              </p>
            )
          ) : null}

          {showExpenses ? (
            <ExpenseBreakdown
              className={cn(CARD, "mt-6")}
              month={month}
              monthLabel={monthLabel}
              categories={expenseCategories}
            />
          ) : null}

          <PlatformBreakdown
            className={cn(CARD, "mt-6 flex flex-col")}
            monthLabel={monthLabel}
            platforms={platformBreakdown}
          />
          <NotesCard
            organizationId={membership.organizationId}
            userId={membership.userId}
            className={cn(CARD, "mt-6 flex flex-col")}
          />
          <EndOfPage />
        </>
      )}

      <p className="sr-only">
        {summary.length ? `${summary.join(", ")}. ` : ""}
        {plural(arrivals.length, "arrival")} and{" "}
        {plural(departures.length, "departure")} today.
      </p>

      <MobileFab actions={fabActions} />
    </div>
  );
}
