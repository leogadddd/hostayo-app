"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { CategoryPoint, DailyPoint } from "@/lib/dashboard-series";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import type { ExpenseCategory } from "@/lib/db/schema";
import {
  axisTick,
  CATEGORY_COLORS,
  CHART,
  dayLabel,
  peso,
  pesoCompact,
  TooltipCard,
} from "../dashboard/chart-kit";

export interface ReportChartsData {
  days: DailyPoint[];
  categories: CategoryPoint[];
  units: { name: string; accommodationCents: number }[];
  channels: { name: string; accommodationCents: number; bookings: number }[];
}

/** Fixed order, so a slice keeps its color between runs. */
const SLICE_COLORS = [
  CHART.pine,
  CHART.clay,
  CHART.sageDeep,
  CHART.sand,
  CHART.moss,
  CHART.pineSoft,
];

function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <h2 className="font-display text-lg text-pine">{title}</h2>
        <p className="mt-0.5 text-xs text-ink/50">{subtitle}</p>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-56 items-center justify-center text-sm text-ink/55">
      {children}
    </p>
  );
}

interface TrendPoint {
  start: string;
  end: string;
  collected: number;
  expenses: number;
}

/** Daily points for up to a month, weekly sums beyond that. */
function trend(days: DailyPoint[]): { points: TrendPoint[]; weekly: boolean } {
  const weekly = days.length > 31;
  const size = weekly ? 7 : 1;
  const points: TrendPoint[] = [];
  for (let i = 0; i < days.length; i += size) {
    const slice = days.slice(i, i + size);
    points.push({
      start: slice[0]!.date,
      end: slice[slice.length - 1]!.date,
      collected: slice.reduce(
        (sum, d) => sum + d.collectedCents - d.refundedCents,
        0,
      ),
      expenses: slice.reduce((sum, d) => sum + d.expensesCents, 0),
    });
  }
  return { points, weekly };
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/65">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Donut({
  data,
  total,
  centerLabel,
  formatValue,
}: {
  data: { name: string; value: number; color: string }[];
  total: string;
  centerLabel: string;
  formatValue: (value: number) => string;
}) {
  const sum = data.reduce((acc, row) => acc + row.value, 0);
  return (
    <div>
      <div className="relative mx-auto h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const row = active
                  ? (payload?.[0]?.payload as (typeof data)[number] | undefined)
                  : undefined;
                return row ? (
                  <TooltipCard
                    title={row.name}
                    rows={[
                      {
                        label: "Amount",
                        value: formatValue(row.value),
                        color: row.color,
                      },
                      {
                        label: "Share",
                        value: `${Math.round((row.value / sum) * 100)}%`,
                      },
                    ]}
                  />
                ) : null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-xl leading-none text-pine">
            {total}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-ink/50">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5">
        {data.map((row) => (
          <li key={row.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: row.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-ink/70">
              {row.name}
            </span>
            <span className="shrink-0 tabular-nums text-xs text-ink/55">
              {formatValue(row.value)} · {Math.round((row.value / sum) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportCharts({ data }: { data: ReportChartsData }) {
  const { points, weekly } = trend(data.days);
  const hasCash = points.some((p) => p.collected !== 0 || p.expenses !== 0);
  const pointLabel = (p: TrendPoint) =>
    weekly ? `${dayLabel(p.start)} – ${dayLabel(p.end)}` : dayLabel(p.start);

  const byCategory = new Map<string, number>();
  for (const row of data.categories) {
    byCategory.set(
      row.category,
      (byCategory.get(row.category) ?? 0) + row.amountCents,
    );
  }
  const expenseSlices = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, value]) => ({
      name: EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] ?? category,
      value,
      color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other!,
    }));
  const expenseTotal = expenseSlices.reduce((sum, row) => sum + row.value, 0);

  const channelSlices = data.channels
    .filter((row) => row.accommodationCents > 0)
    .map((row, index) => ({
      name: row.name,
      value: row.accommodationCents,
      color: SLICE_COLORS[index % SLICE_COLORS.length]!,
    }));
  const channelTotal = channelSlices.reduce((sum, row) => sum + row.value, 0);

  const unitBars = data.units
    .filter((row) => row.accommodationCents > 0)
    .slice(0, 10);

  return (
    <section aria-label="Report charts" className="grid gap-6 lg:grid-cols-3">
      <ChartCard
        className="lg:col-span-2"
        title="Cash in vs. spending"
        subtitle={`Booking payments net of refunds, and operating expenses, ${weekly ? "per week" : "per day"}.`}
      >
        {hasCash ? (
          <>
            <Legend
              items={[
                { label: "Collected (net of refunds)", color: CHART.pine },
                { label: "Operating expenses", color: CHART.clay },
              ]}
            />
            <div
              className="mt-3 h-64"
              role="img"
              aria-label="Line chart of cash collected and operating expenses over the period"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={points}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="start"
                    tickFormatter={dayLabel}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={pesoCompact}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      const p = active
                        ? (payload?.[0]?.payload as TrendPoint | undefined)
                        : undefined;
                      return p ? (
                        <TooltipCard
                          title={pointLabel(p)}
                          rows={[
                            {
                              label: "Collected",
                              value: peso(p.collected),
                              color: CHART.pine,
                            },
                            {
                              label: "Expenses",
                              value: peso(p.expenses),
                              color: CHART.clay,
                            },
                          ]}
                        />
                      ) : null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    stroke={CHART.pine}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke={CHART.clay}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <Empty>No payments or expenses in this period.</Empty>
        )}
      </ChartCard>

      <ChartCard
        title="Revenue by channel"
        subtitle="Accommodation booked, by booking source."
      >
        {channelSlices.length ? (
          <Donut
            data={channelSlices}
            total={pesoCompact(channelTotal)}
            centerLabel="Booked"
            formatValue={peso}
          />
        ) : (
          <Empty>No bookings in this period.</Empty>
        )}
      </ChartCard>

      <ChartCard
        className="lg:col-span-2"
        title="Revenue by unit"
        subtitle="Accommodation booked in the period, top 10 units."
      >
        {unitBars.length ? (
          <div
            style={{ height: Math.max(180, unitBars.length * 38 + 24) }}
            role="img"
            aria-label="Bar chart of accommodation booked per unit"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={unitBars}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                barCategoryGap={8}
              >
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={pesoCompact}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: CHART.mist, opacity: 0.4 }}
                  content={({ active, payload }) => {
                    const row = active
                      ? (payload?.[0]?.payload as
                          (typeof unitBars)[number] | undefined)
                      : undefined;
                    return row ? (
                      <TooltipCard
                        title={row.name}
                        rows={[
                          {
                            label: "Accommodation booked",
                            value: peso(row.accommodationCents),
                            color: CHART.pine,
                          },
                        ]}
                      />
                    ) : null;
                  }}
                />
                <Bar
                  dataKey="accommodationCents"
                  fill={CHART.pine}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty>No unit revenue in this period.</Empty>
        )}
      </ChartCard>

      <ChartCard
        title="Expenses by category"
        subtitle="Operating and capital spending, by category."
      >
        {expenseSlices.length ? (
          <Donut
            data={expenseSlices}
            total={pesoCompact(expenseTotal)}
            centerLabel="Spent"
            formatValue={peso}
          />
        ) : (
          <Empty>No expenses in this period.</Empty>
        )}
      </ChartCard>
    </section>
  );
}
