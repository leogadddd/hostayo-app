import Link from "next/link";
import {
  ArrowLineDown as ArrowDownToLine,
  ArrowRight,
  ArrowLineUp as ArrowUpFromLine,
  CalendarCheck,
  CheckCircle as CircleCheck,
  Plus,
  type PhosphorIcon,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "./mini-calendar";
import { NotesCard } from "./notes-card";
import { PerformanceSection } from "./performance";
import { PlatformBreakdown } from "./platform-breakdown";
import { ExpenseBreakdown } from "./expense-breakdown";
import { InfoTip } from "@/components/ui/info-tip";
import { MONTH_LABEL, greeting, localTimeLabel, plural } from "./model";
import type { DashboardModel, ScheduleStatus } from "./model";
import { ATTENTION_ICON, STATUS_STYLE } from "./shared";
import { DamageCard } from "./damage-card";
import { GoLiveChecklistCard } from "./go-live-checklist";

export function DesktopDashboard({ model }: { model: DashboardModel }) {
  const {
    membership,
    units,
    properties,
    timezone,
    today,
    month,
    monthGrid,
    tiles,
    summary,
    arrivals,
    departures,
    arrivalsDone,
    departuresDone,
    damage,
    openDamage,
    damageEstimate,
    attentionCount,
    attentionItems,
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
    goLive,
  } = model;
  return (
    <div className="mx-auto max-w-[1600px] overflow-hidden pb-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="mt-2 font-display text-3xl tracking-tight text-pine sm:text-[2.6rem] sm:leading-tight">
            {greeting(timezone)}, {membership.organizationName}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink/60">
            {summary.length
              ? `${summary.join(", ")}.`
              : "A calm day. Nothing needs your attention right now."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calendar/availability"
            className={buttonClassName("ghost", "md")}
          >
            <CalendarCheck className="h-4 w-4" aria-hidden />
            Check availability
          </Link>
          {canCreateReservation ? (
            <Link
              href="/reservations/new"
              className={buttonClassName("clay", "md")}
            >
              <Plus className="h-4 w-4" aria-hidden />
              New reservation
            </Link>
          ) : null}
        </div>
      </header>

      {goLive ? <GoLiveChecklistCard checklist={goLive} /> : null}

      {units.length === 0 ? (
        // The checklist already says what to add first.
        goLive ? null : (
          <EmptyState
            art="dashboard"
            title="Your operations dashboard is ready"
            description={
              canCreateProperty
                ? "Add your first property and unit to start tracking arrivals, cleaning work, occupancy and cash movement."
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
        )
      ) : (
        <>
          {/* 1 · At a glance */}
          <section
            aria-label="At a glance"
            className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6"
          >
            {tiles.map(({ label, value, helper, icon: Icon, tone, href }) => (
              <Link
                key={label}
                href={href}
                className="group flex flex-col rounded-xl border border-pine/12 bg-linen p-4 shadow-[0_2px_8px_rgba(32,58,53,0.035)] transition hover:-translate-y-0.5 hover:border-pine/25 hover:shadow-[0_10px_24px_rgba(32,58,53,0.08)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      tone,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-ink/20 transition group-hover:translate-x-0.5 group-hover:text-clay"
                    aria-hidden
                  />
                </div>
                <p className="mt-3 font-display text-3xl leading-none tabular-nums text-pine">
                  {value}
                </p>
                <p className="mt-1.5 text-xs font-medium text-ink/65">
                  {label}
                </p>
                <p className="mt-auto truncate pt-2 text-[11px] text-ink/45">
                  {helper}
                </p>
              </Link>
            ))}
          </section>

          {/* 2 · Today: who comes, who leaves, what's waiting */}
          <section className="mt-5 grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
            <Card className="flex flex-col">
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-xl text-pine">
                      Today&apos;s schedule
                    </h2>
                    <InfoTip>
                      Who&apos;s leaving and who&apos;s coming, in the order it
                      happens.
                    </InfoTip>
                  </div>
                </div>
                <Badge tone="neutral">
                  {plural(arrivals.length + departures.length, "movement")}
                </Badge>
              </CardHeader>
              {arrivals.length + departures.length === 0 ? (
                <CardBody className="flex flex-col items-center justify-center py-12 text-center">
                  <CircleCheck className="h-7 w-7 text-sage-deep" aria-hidden />
                  <p className="mt-2 text-sm text-ink/60">
                    No arrivals or departures today.
                  </p>
                </CardBody>
              ) : (
                <div className="grid divide-y divide-pine/10 md:grid-cols-2 md:divide-x md:divide-y-0">
                  <ScheduleColumn
                    title="Checking out"
                    icon={ArrowUpFromLine}
                    iconTone="bg-clay-mist text-clay-deep"
                    empty="No check-outs scheduled"
                    progress={
                      departures.length
                        ? `${departuresDone}/${departures.length} done`
                        : null
                    }
                    rows={model.departureRows}
                  />
                  <ScheduleColumn
                    title="Arriving"
                    icon={ArrowDownToLine}
                    iconTone="bg-sage/60 text-pine"
                    empty="No arrivals scheduled"
                    progress={
                      arrivals.length
                        ? `${arrivalsDone}/${arrivals.length} done`
                        : null
                    }
                    rows={model.arrivalRows}
                  />
                </div>
              )}
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-xl text-pine">
                      Needs attention
                    </h2>
                    <InfoTip>
                      What&apos;s waiting on you, most urgent first.
                    </InfoTip>
                  </div>
                </div>
                {attentionCount ? (
                  <Badge tone="clay">{attentionCount}</Badge>
                ) : (
                  <Badge tone="sage">All clear</Badge>
                )}
              </CardHeader>
              {attentionCount === 0 ? (
                <CardBody className="flex flex-col items-center justify-center py-10 text-center">
                  <CircleCheck className="h-7 w-7 text-sage-deep" aria-hidden />
                  <p className="mt-2 text-sm text-ink/60">
                    Nothing is waiting on you.
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    Every unit is ready and no holds, damage or payments need a
                    look.
                  </p>
                </CardBody>
              ) : (
                <ul className="divide-y divide-pine/8">
                  {attentionItems.map((item) => (
                    <AttentionRow
                      key={item.key}
                      href={item.href}
                      icon={ATTENTION_ICON[item.kind]}
                      tone={item.tone}
                      title={item.title}
                      detail={item.detail}
                      progress={item.progress}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {/* 3 · This month, plus a scratchpad */}
          <section className="mt-5 grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
            <MiniCalendar
              month={month}
              today={today}
              monthLabel={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
              gridStart={monthGrid.start}
              gridEnd={monthGrid.end}
              events={miniCalendarEvents}
            />
            <NotesCard
              organizationId={membership.organizationId}
              userId={membership.userId}
              className="flex flex-col"
            />
          </section>

          {/* 4 · Where bookings come from, and what's broken */}
          <section className="mt-5 grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
            <PlatformBreakdown
              className="flex flex-col"
              monthLabel={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
              platforms={platformBreakdown}
            />
            <DamageCard
              reports={damage}
              available={openDamage !== null}
              multipleProperties={properties.length > 1}
              showMoney={showMoney}
              estimateCents={damageEstimate}
              canSeeReservations={canSeeReservations}
              canSeeProperties={canSeeProperties}
            />
          </section>

          {/* 5 · Where the money went */}
          {showExpenses ? (
            <ExpenseBreakdown
              className="mt-5"
              month={month}
              monthLabel={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
              categories={expenseCategories}
            />
          ) : null}

          {/* 6 · Money and trends */}
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
              <Card className="mt-10">
                <CardBody>
                  <p className="text-sm text-ink/60">
                    Performance charts are temporarily unavailable. Your
                    operations overview above is still current.
                  </p>
                </CardBody>
              </Card>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

function ScheduleColumn({
  title,
  icon: Icon,
  iconTone,
  empty,
  progress,
  rows,
}: {
  title: string;
  icon: PhosphorIcon;
  iconTone: string;
  empty: string;
  progress: string | null;
  rows: {
    id: string;
    time: string | null;
    guestName: string;
    detail: string;
    status: ScheduleStatus;
    href: string;
  }[];
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-pine">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              iconTone,
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          {title}
        </p>
        {progress ? (
          <span className="text-xs tabular-nums text-ink/50">{progress}</span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-ink/45">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-pine-mist/45",
                  row.status.tone === "done" && "opacity-70",
                )}
              >
                <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-pine">
                  {row.time ? localTimeLabel(row.time) : "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium text-pine",
                      row.status.tone === "done" &&
                        "line-through decoration-pine/30",
                    )}
                  >
                    {row.guestName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink/55">
                    {row.detail}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_STYLE[row.status.tone],
                  )}
                >
                  {row.status.tone === "done" ? (
                    <CircleCheck className="h-3 w-3" aria-hidden />
                  ) : null}
                  {row.status.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttentionRow({
  href,
  icon: Icon,
  tone,
  title,
  detail,
  progress,
}: {
  href: string;
  icon: PhosphorIcon;
  tone: "urgent" | "normal";
  title: string;
  detail: string;
  progress?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-6 py-3 transition hover:bg-pine-mist/40"
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            tone === "urgent" ? "bg-clay text-white" : "bg-pine-mist text-pine",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-pine">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink/55">
            {detail}
          </span>
          {progress !== undefined ? (
            <span
              className="mt-1.5 block h-1 overflow-hidden rounded-full bg-pine-mist"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-clay"
                style={{ width: `${progress * 100}%` }}
              />
            </span>
          ) : null}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink/25" aria-hidden />
      </Link>
    </li>
  );
}
