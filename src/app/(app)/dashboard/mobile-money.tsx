"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Money as Banknote,
  Receipt,
  ShieldCheck,
  TrendUp as TrendingUp,
  type PhosphorIcon,
} from "@/components/ui/icons";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  bucketize,
  inWindow,
  RANGE_KEYS,
  RANGE_LABELS,
  rangeWindows,
  sumDays,
  type DashboardSeries,
  type RangeKey,
} from "@/lib/dashboard-series";
import { cn } from "@/lib/utils";
import { CHART, dayLabel, peso, Segmented } from "./chart-kit";
import { moneyDelta, running, type MonthBalances } from "./performance";
import { CARD } from "./shared";

type Delta = ReturnType<typeof moneyDelta>;

function DeltaChip({ delta }: { delta: Delta }) {
  if (!delta)
    return <span className="text-[11px] text-ink/40">No prior data</span>;
  const down = delta.text.startsWith("-");
  const Arrow = down ? ArrowDownRight : ArrowUpRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        delta.good ? "bg-sage/60 text-pine" : "bg-clay-mist text-clay-deep",
      )}
    >
      <Arrow className="h-3 w-3" aria-hidden />
      {delta.text.replace(/^[-+]/, "")}
      <span className="sr-only"> vs previous period</span>
    </span>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
  delta,
  note,
}: {
  label: string;
  value: string;
  icon: PhosphorIcon;
  tone: string;
  delta?: Delta;
  note?: string;
}) {
  return (
    <div className={cn(CARD, "flex flex-col p-4")}>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            tone,
          )}
        >
          <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
        </span>
        {delta !== undefined ? <DeltaChip delta={delta} /> : null}
      </div>
      <p className="mt-3 text-xs font-medium text-ink/60">{label}</p>
      <p className="mt-0.5 font-display text-[1.45rem] leading-tight tabular-nums text-pine">
        {value}
      </p>
      {note ? <p className="mt-1 text-[11px] text-ink/45">{note}</p> : null}
    </div>
  );
}

/**
 * The money summary of the phone dashboard: cash collected with its trend
 * and a period switch, then net cash, spending, deposits held and booked value.
 * The full charts follow in the performance section below.
 */
export function MobileMoney({
  series,
  today,
  balances,
  monthName,
}: {
  series: DashboardSeries;
  today: string;
  balances: MonthBalances | null;
  monthName: string;
}) {
  const [range, setRange] = useState<RangeKey>("30d");
  const windows = rangeWindows(range, today);
  const current = sumDays(series.days.filter(inWindow(windows.current)));
  const previous = sumDays(series.days.filter(inWindow(windows.previous)));
  const buckets = bucketize(series.days, range, today);
  const spark = running(buckets.map((bucket) => bucket.collectedCents)).map(
    (v, i) => ({ i, v }),
  );
  const periodNote = `${dayLabel(windows.current.from)} – ${dayLabel(today)}`;

  return (
    <section aria-label="Money" className="mt-9">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="font-display text-xl text-pine">Money</h2>
        <Segmented
          label="Period"
          size="sm"
          options={RANGE_KEYS.map((key) => ({
            value: key,
            label: RANGE_LABELS[key].short,
          }))}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className={cn(CARD, "overflow-hidden")}>
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-ink/60">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine-mist text-pine">
                  <Banknote className="h-4 w-4" aria-hidden />
                </span>
                Cash collected
              </p>
              <p className="mt-3 font-display text-[2.4rem] leading-none tabular-nums text-pine">
                {peso(current.collectedCents)}
              </p>
            </div>
            <DeltaChip
              delta={moneyDelta(
                current.collectedCents,
                previous.collectedCents,
                true,
              )}
            />
          </div>
          <p className="mt-2 text-[11px] text-ink/45">
            {RANGE_LABELS[range].long} · {periodNote}
          </p>
        </div>
        <div className="h-24" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={spark}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="money-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.moss} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CHART.moss} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={CHART.pine}
                strokeWidth={2}
                fill="url(#money-spark)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniStat
          label="Net operating cash"
          value={peso(current.netCents)}
          icon={TrendingUp}
          tone="bg-sage/55 text-pine"
          delta={moneyDelta(current.netCents, previous.netCents, true)}
        />
        <MiniStat
          label="Operating expenses"
          value={peso(current.expensesCents)}
          icon={Receipt}
          tone="bg-sand text-bark"
          delta={moneyDelta(
            current.expensesCents,
            previous.expensesCents,
            false,
          )}
        />
        {balances ? (
          <>
            <MiniStat
              label="Deposits held"
              value={peso(balances.depositsHeldCents)}
              icon={ShieldCheck}
              tone="bg-pine-mist text-pine"
              note="Right now"
            />
            <MiniStat
              label={`Booked in ${monthName}`}
              value={peso(balances.bookedValueCents)}
              icon={Banknote}
              tone="bg-clay-mist text-clay-deep"
              note="Total value of stays"
            />
          </>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between px-1 text-sm font-semibold">
        <Link
          href="#performance-heading"
          className="text-ink/60 active:text-pine"
        >
          See the charts
        </Link>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-clay-deep"
        >
          Full reports
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
