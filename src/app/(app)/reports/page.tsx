import { DateInput } from "@/components/ui/date-input";
import {
  UnderConstruction,
  UNDER_CONSTRUCTION,
} from "@/components/app/under-construction";
import type { Metadata } from "next";
import { ChevronDown, Download } from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { addDaysLocal, monthNightRange, todayInTimeZone } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import type { ReportSummary } from "@/lib/reporting";
import { getDashboardSeries } from "@/server/reports/dashboard";
import { getReport, ReportError } from "@/server/reports/service";
import { ReportCharts, type ReportChartsData } from "./report-charts";
import { listProperties } from "@/server/inventory/service";

export const metadata: Metadata = { title: "Reports" };

const DATE_LABEL = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatPercent(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function Metric({
  label,
  basis,
  value,
  tone = "default",
}: {
  label: string;
  basis: string;
  value: string;
  tone?: "default" | "accent" | "danger";
}) {
  const valueClass =
    tone === "accent"
      ? "text-pine"
      : tone === "danger"
        ? "text-clay-deep"
        : "text-ink";
  return (
    <div className="rounded-xl bg-paper px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-ink/50">{basis}</p>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (UNDER_CONSTRUCTION.reports)
    return (
      <UnderConstruction
        title="Reports"
        description="We’re reworking reports. Occupancy, revenue and balance summaries will be back here soon."
      />
    );
  const membership = await requirePermission("reports.view");
  if (!membership) {
    return (
      <PermissionDenied description="Reports are limited to the organization owner. Other team members can use the calendar, reservations, guests and tasks pages." />
    );
  }

  const params = await searchParams;
  const readParam = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const timezone = "Asia/Manila";
  const defaultRange = monthNightRange(todayInTimeZone(timezone).slice(0, 7));
  const from = readParam("from") || defaultRange.start;
  const to = readParam("to") || defaultRange.end;
  const propertyFilter = readParam("property");

  const properties = await listProperties(membership.organizationId);

  let result: Awaited<ReturnType<typeof getReport>> | null = null;
  let error: string | null = null;
  try {
    result = await getReport(membership.organizationId, {
      propertyId: propertyFilter || undefined,
      from,
      to,
    });
  } catch (err) {
    error =
      err instanceof ReportError
        ? err.message
        : "The report could not be generated.";
  }

  const series = result
    ? await getDashboardSeries(
        membership.organizationId,
        { from, to },
        propertyFilter || undefined,
      ).catch(() => null)
    : null;
  const exportQuery = new URLSearchParams({
    from,
    to,
    ...(propertyFilter ? { property: propertyFilter } : {}),
  }).toString();

  const hasFilters = Boolean(
    readParam("from") || readParam("to") || propertyFilter,
  );
  const periodLabel = (() => {
    if (!result) return "";
    const lastNight = addDaysLocal(result.summary.to, -1);
    return `${DATE_LABEL.format(new Date(`${result.summary.from}T00:00:00Z`))} – ${DATE_LABEL.format(new Date(`${lastNight}T00:00:00Z`))}`;
  })();

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Reports"
        description="Cash, bookings and occupancy — each metric labeled with its basis."
      >
        {result ? (
          <p className="text-sm text-ink/60">
            {periodLabel} · {result.timezone} cash basis ·{" "}
            {result.summary.activeUnitCount}{" "}
            {result.summary.activeUnitCount === 1 ? "unit" : "units"} active
          </p>
        ) : null}
      </PageHeading>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="min-w-44">
          <Label htmlFor="filter-property">Property</Label>
          <Select
            id="filter-property"
            name="property"
            defaultValue={propertyFilter}
          >
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-from">From</Label>
          <DateInput
            id="filter-from"
            name="from"
            defaultValue={from}
            className="w-56"
          />
        </div>
        <div>
          <Label htmlFor="filter-to">To (exclusive)</Label>
          <DateInput
            id="filter-to"
            name="to"
            defaultValue={to}
            className="w-56"
          />
        </div>
        <button
          type="submit"
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-soft"
        >
          Run report
        </button>
        {result ? (
          <details className="group relative ml-auto">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-pine/25 px-4 text-sm font-medium text-pine hover:border-pine/50 hover:bg-pine-mist/60 [&::-webkit-details-marker]:hidden">
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
              <ChevronDown
                className="h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-pine/12 bg-surface p-1.5 shadow-[0_12px_32px_rgba(22,41,37,0.14)]">
              {[
                ["bookings", "Bookings", "One row per stay checking in"],
                ["payments", "Payments & refunds", "Cash ledger by date"],
                ["expenses", "Expenses", "By category, property and unit"],
              ].map(([type, label, hint]) => (
                <a
                  key={type}
                  href={`/api/reports/export?type=${type}&${exportQuery}`}
                  download
                  className="block rounded-lg px-3 py-2 hover:bg-pine-mist/60"
                >
                  <span className="block text-sm font-medium text-pine">
                    {label}
                  </span>
                  <span className="block text-xs text-ink/55">{hint}</span>
                </a>
              ))}
            </div>
          </details>
        ) : null}
        {hasFilters ? (
          <a
            href="/reports"
            className="h-10 inline-flex items-center rounded-lg px-3 text-sm text-pine hover:bg-pine-mist/70"
          >
            Clear
          </a>
        ) : null}
      </form>

      {error ? (
        <div className="mt-6">
          <EmptyState title="Report unavailable" description={error} />
        </div>
      ) : result ? (
        <ReportBody
          summary={result.summary}
          propertyNames={result.propertyNames}
          unitNames={result.unitNames}
          platformNames={result.platformNames}
          chartData={{
            days: series?.days ?? [],
            categories: series?.categories ?? [],
            units: result.summary.unitBreakdown.map((row) => ({
              name: result!.unitNames.get(row.unitId) ?? "Unknown unit",
              accommodationCents: row.accommodationBookedCents,
            })),
            channels: result.summary.channelBreakdown.map((row) => ({
              name: row.platformId
                ? (result!.platformNames.get(row.platformId) ?? "Unknown")
                : "Direct / unspecified",
              accommodationCents: row.accommodationBookedCents,
              bookings: row.bookings,
            })),
          }}
        />
      ) : null}
    </div>
  );
}

function ReportBody({
  summary,
  propertyNames,
  unitNames,
  platformNames,
  chartData,
}: {
  summary: ReportSummary;
  propertyNames: Map<string, string>;
  unitNames: Map<string, string>;
  platformNames: Map<string, string>;
  chartData: ReportChartsData;
}) {
  const cashBasis = "payments received in period";
  const stayBasis = "stays overlapping the period";
  return (
    <div className="mt-6 space-y-6">
      <ReportCharts data={chartData} />

      <section aria-labelledby="cash-heading">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="cash-heading" className="font-display text-lg text-pine">
              Cash view
            </h2>
            <Badge tone="neutral">{cashBasis}</Badge>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric
                label="Booking payments collected"
                basis={cashBasis}
                value={formatPHP(summary.bookingCollectedCents)}
              />
              <Metric
                label="Booking refunds paid"
                basis="refunds sent in period"
                value={formatPHP(summary.bookingRefundedCents)}
              />
              <Metric
                label="Security deposits collected"
                basis={cashBasis}
                value={formatPHP(summary.depositCollectedCents)}
              />
              <Metric
                label="Security deposits refunded"
                basis="refunds sent in period"
                value={formatPHP(summary.depositRefundedCents)}
              />
              <Metric
                label="Deposits kept via deductions"
                basis="deductions recorded in period"
                value={formatPHP(summary.depositsRetainedCents)}
              />
              <Metric
                label="Deposits held"
                basis="all time: collected − refunded − kept"
                value={formatPHP(summary.depositsHeldCents)}
              />
            </div>
            <div className="mt-4 rounded-xl border border-pine/15 bg-pine-mist/40 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
                Net operating cash
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-pine">
                {formatPHP(summary.netOperatingCashCents)}
              </p>
              <p className="mt-1 text-xs text-ink/55">
                Booking payments collected − booking refunds − operating
                expenses. It excludes refundable deposits and capital spending,
                and it is not taxable income, ROI, or accrual profit.
              </p>
            </div>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="booked-heading">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="booked-heading" className="font-display text-lg text-pine">
              Bookings &amp; occupancy
            </h2>
            <Badge tone="neutral">{stayBasis}</Badge>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric
                label="Booked value"
                basis={stayBasis}
                value={formatPHP(summary.bookedValueCents)}
                tone="accent"
              />
              <Metric
                label="Accommodation booked"
                basis="agreed total spread across actual stay nights"
                value={formatPHP(summary.accommodationBookedCents)}
              />
              <Metric
                label="Fees & discounts booked"
                basis="counted once on the stay's first night"
                value={formatPHP(summary.oneTimeBookedCents)}
              />
              <Metric
                label="Occupied nights"
                basis={stayBasis}
                value={String(summary.occupiedNights)}
              />
              <Metric
                label="Bookable nights"
                basis="active units, minus blocked nights"
                value={String(summary.bookableNights)}
              />
              <Metric
                label="Occupancy"
                basis="occupied ÷ bookable nights"
                value={formatPercent(summary.occupancyRate)}
              />
              <Metric
                label="Average accommodation rate"
                basis="accommodation booked ÷ all booked stay nights"
                value={
                  summary.avgAccommodationRateCents === null
                    ? "—"
                    : formatPHP(summary.avgAccommodationRateCents)
                }
              />
              <Metric
                label="RevPAR"
                basis="accommodation booked ÷ bookable nights"
                value={
                  summary.revparCents === null
                    ? "—"
                    : formatPHP(summary.revparCents)
                }
              />
              <Metric
                label="Average length of stay"
                basis="nights per stay checking in this period"
                value={
                  summary.avgLengthOfStayNights === null
                    ? "—"
                    : `${summary.avgLengthOfStayNights.toFixed(1)} nights`
                }
              />
              <Metric
                label="Bookings"
                basis="stays checking in this period, excluding cancelled"
                value={String(summary.bookingCount)}
              />
              <Metric
                label="Cancellation rate"
                basis={`${summary.cancelledStayCount} cancelled ÷ all bookings by check-in date`}
                value={formatPercent(summary.cancellationRate)}
                tone={
                  summary.cancellationRate !== null &&
                  summary.cancellationRate > 0.2
                    ? "danger"
                    : "default"
                }
              />
            </div>
            <p className="mt-4 text-xs text-ink/55">
              Occupancy = occupied nights ÷ bookable nights for the period. Both
              counts use units currently marked Active and exclude blocked
              nights. Historical unit status changes are not reconstructed.
              Holds, cancelled and expired stays never count as occupied. Booked
              value and average accommodation rate include all booked stay
              nights, even for units now inactive, but never refundable
              deposits.
            </p>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="expenses-heading">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="expenses-heading"
              className="font-display text-lg text-pine"
            >
              Spending
            </h2>
            <Badge tone="neutral">expenses paid in period</Badge>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric
                label="Operating expenses"
                basis="classification: operating"
                value={formatPHP(summary.operatingExpensesCents)}
              />
              <Metric
                label="Capital spending"
                basis="classification: capital — excluded from net operating cash"
                value={formatPHP(summary.capitalSpendingCents)}
              />
            </div>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="breakdown-heading">
        <Card>
          <CardHeader>
            <h2
              id="breakdown-heading"
              className="font-display text-lg text-pine"
            >
              Occupancy by property
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {summary.propertyBreakdown.length === 0 ? (
              <p className="px-6 py-5 text-sm text-ink/60">
                No properties in scope for this report.
              </p>
            ) : (
              <Table aria-labelledby="breakdown-heading">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Property</TableHead>
                    <TableHead scope="col" className="text-right">
                      Occupied nights
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Bookable nights
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Occupancy
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Avg rate / night
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.propertyBreakdown.map((row) => (
                    <TableRow key={row.propertyId}>
                      <TableCell className="text-pine">
                        {propertyNames.get(row.propertyId) ??
                          "Unknown property"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.occupiedNights}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.bookableNights}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-pine">
                        {formatPercent(row.occupancyRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.avgAccommodationRateCents === null
                          ? "—"
                          : formatPHP(row.avgAccommodationRateCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="channel-heading">
        <Card>
          <CardHeader>
            <h2 id="channel-heading" className="font-display text-lg text-pine">
              Bookings by channel
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {summary.channelBreakdown.length === 0 ? (
              <p className="px-6 py-5 text-sm text-ink/60">
                No stays in this period.
              </p>
            ) : (
              <Table aria-labelledby="channel-heading">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Channel</TableHead>
                    <TableHead scope="col" className="text-right">
                      Bookings
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Nights
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Accommodation booked
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Share
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.channelBreakdown.map((row) => (
                    <TableRow key={row.platformId ?? "direct"}>
                      <TableCell className="text-pine">
                        {row.platformId
                          ? (platformNames.get(row.platformId) ?? "Unknown")
                          : "Direct / unspecified"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.bookings}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.nights}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {formatPHP(row.accommodationBookedCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-pine">
                        {formatPercent(row.revenueShare)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="unit-heading">
        <Card>
          <CardHeader>
            <h2 id="unit-heading" className="font-display text-lg text-pine">
              Performance by unit
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {summary.unitBreakdown.length === 0 ? (
              <p className="px-6 py-5 text-sm text-ink/60">
                No units in scope for this report.
              </p>
            ) : (
              <Table aria-labelledby="unit-heading">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Unit</TableHead>
                    <TableHead scope="col" className="text-right">
                      Occupancy
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Nights
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Avg rate / night
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      RevPAR
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Accommodation booked
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.unitBreakdown.map((row) => (
                    <TableRow key={row.unitId}>
                      <TableCell className="text-pine">
                        {unitNames.get(row.unitId) ?? "Unknown unit"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-pine">
                        {formatPercent(row.occupancyRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.occupiedNights} / {row.bookableNights}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.avgAccommodationRateCents === null
                          ? "—"
                          : formatPHP(row.avgAccommodationRateCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {row.revparCents === null
                          ? "—"
                          : formatPHP(row.revparCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink/70">
                        {formatPHP(row.accommodationBookedCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
