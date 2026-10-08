import Link from "next/link";
import { Paperclip, Plus, Repeat } from "lucide-react";
import { todayInTimeZone } from "@/lib/dates";
import { CATEGORY_COLORS } from "../dashboard/chart-kit";
import {
  UnderConstruction,
  UNDER_CONSTRUCTION,
} from "@/components/app/under-construction";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import { formatPHP } from "@/lib/money";
import { listDueRecurring } from "@/server/expenses/recurring";
import { listExpenses } from "@/server/expenses/service";
import { can } from "@/lib/permissions";
import { DueBills } from "./due-bills";
import { listProperties } from "@/server/inventory/service";
import { RouteModal } from "@/components/app/route-modal";
import { expensePanel, newExpensePanel } from "./expense-panels";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Expenses" };

const DATE_LABEL = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const CLASSIFICATION_LABELS = {
  operating: "Operating",
  capital: "Capital",
} as const;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (UNDER_CONSTRUCTION.expenses)
    return (
      <UnderConstruction
        title="Expenses"
        description="We’re reworking expenses. Recording and reviewing costs will be back here soon."
      />
    );
  const membership = await requirePermission("expenses.view");
  if (!membership) {
    return (
      <PermissionDenied description="Expenses are limited to the organization owner. Other team members can use the calendar, reservations, guests and tasks pages." />
    );
  }
  const params = await searchParams;
  const readParam = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const propertyFilter = readParam("property");
  const classificationFilter = readParam("classification");
  const monthFilter = readParam("month");
  const showVoided = readParam("voided") === "1";
  const editId = readParam("edit");
  const openNew = readParam("new") === "1";

  // The list as filtered now. New/edit open as a modal over it via a query
  // parameter, and closing returns here with the same filters.
  const listParams = new URLSearchParams();
  if (propertyFilter) listParams.set("property", propertyFilter);
  if (classificationFilter)
    listParams.set("classification", classificationFilter);
  if (monthFilter) listParams.set("month", monthFilter);
  if (showVoided) listParams.set("voided", "1");
  const listHref = listParams.size ? `/expenses?${listParams}` : "/expenses";
  const modalHref = (key: "new" | "edit", value: string) => {
    const next = new URLSearchParams(listParams);
    next.set(key, value);
    return `/expenses?${next}`;
  };
  const panel = editId
    ? await expensePanel(editId, listHref)
    : openNew
      ? await newExpensePanel(listHref)
      : null;

  const [properties, expenses, dueBills] = await Promise.all([
    listProperties(membership.organizationId),
    listExpenses(membership.organizationId, {
      propertyId: propertyFilter || undefined,
      classification: classificationFilter || undefined,
      month: monthFilter || undefined,
      includeVoided: showVoided,
    }),
    listDueRecurring(membership.organizationId),
  ]);

  const counted = expenses.filter((expense) => !expense.voidedAt);
  const totalCents = counted.reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );
  const capitalCents = counted
    .filter((expense) => expense.classification === "capital")
    .reduce((sum, expense) => sum + expense.amountCents, 0);
  const byCategory = new Map<string, number>();
  for (const expense of counted) {
    byCategory.set(
      expense.category,
      (byCategory.get(expense.category) ?? 0) + expense.amountCents,
    );
  }
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const hasFilters = Boolean(
    propertyFilter || classificationFilter || monthFilter || showVoided,
  );

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Expenses"
        description="Operating and capital spending, by property or for the whole business."
      >
        <Link
          href="/expenses/recurring"
          className={buttonClassName("outline", "md")}
        >
          <Repeat className="h-4 w-4" aria-hidden />
          Recurring bills
        </Link>
        <Link
          href={modalHref("new", "1")}
          replace
          className={buttonClassName("clay", "md")}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Record expense
        </Link>
      </PageHeading>

      <DueBills
        bills={dueBills.map((bill) => ({
          id: bill.id,
          description: bill.description,
          payee: bill.payee,
          propertyName: bill.propertyName,
          unitName: bill.unitName,
          amountCents: bill.amountCents,
          dueDate: bill.nextDueDate,
          status: bill.status,
          missedPeriods: bill.missedPeriods,
        }))}
        today={todayInTimeZone("Asia/Manila")}
        canAct={can(membership, "expenses.create")}
      />

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
        <div className="min-w-40">
          <Label htmlFor="filter-classification">Type</Label>
          <Select
            id="filter-classification"
            name="classification"
            defaultValue={classificationFilter}
          >
            <option value="">All types</option>
            <option value="operating">Operating</option>
            <option value="capital">Capital</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-month">Month</Label>
          <Input
            id="filter-month"
            name="month"
            type="month"
            defaultValue={monthFilter}
            className="w-40"
          />
        </div>
        <label className="flex h-10 items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            name="voided"
            value="1"
            defaultChecked={showVoided}
          />
          Show voided
        </label>
        <button type="submit" className={buttonClassName("outline")}>
          Filter
        </button>
        {hasFilters ? (
          <Link href="/expenses" className={buttonClassName("ghost")}>
            Clear
          </Link>
        ) : null}
      </form>

      <div className="mt-6">
        {expenses.length === 0 ? (
          <EmptyState
            title={
              hasFilters ? "No expenses match those filters" : "No expenses yet"
            }
            description={
              hasFilters
                ? "Try widening the filters, or record a new expense."
                : "Record cleaning, utilities, supplies and other spending so you can reconcile later."
            }
          />
        ) : (
          <>
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <Card className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
                  Total spent
                </p>
                <p className="mt-1 font-display text-3xl text-pine">
                  {formatPHP(totalCents)}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {counted.length} {counted.length === 1 ? "entry" : "entries"}
                </p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink/60">Operating</dt>
                    <dd className="font-medium tabular-nums text-pine">
                      {formatPHP(totalCents - capitalCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink/60">Capital</dt>
                    <dd className="font-medium tabular-nums text-pine">
                      {formatPHP(capitalCents)}
                    </dd>
                  </div>
                </dl>
              </Card>
              <Card className="p-5 lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
                  By category
                </p>
                <ul className="mt-3 space-y-3">
                  {categoryRows.slice(0, 6).map(([category, cents]) => (
                    <li key={category}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="text-ink/70">
                          {EXPENSE_CATEGORY_LABELS[
                            category as keyof typeof EXPENSE_CATEGORY_LABELS
                          ] ?? category}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-pine">
                          {formatPHP(cents)} ·{" "}
                          {Math.round((cents / totalCents) * 100)}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-pine-mist/60">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(2, (cents / totalCents) * 100)}%`,
                            background:
                              CATEGORY_COLORS[category] ??
                              CATEGORY_COLORS.other,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <div className="overflow-hidden rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
              <Table
                aria-label="Expenses"
                className="[&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Description</TableHead>
                    <TableHead scope="col">Property</TableHead>
                    <TableHead scope="col" className="text-right">
                      Amount
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className={expense.voidedAt ? "opacity-55" : undefined}
                    >
                      <TableCell className="whitespace-nowrap text-ink/70">
                        {DATE_LABEL.format(
                          new Date(`${expense.paidDate}T00:00:00Z`),
                        )}
                      </TableCell>
                      <TableCell className="min-w-56">
                        <Link
                          href={modalHref("edit", expense.id)}
                          replace
                          className={`text-pine hover:underline ${expense.voidedAt ? "line-through" : ""}`}
                        >
                          {expense.description}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/50">
                          <span>
                            {EXPENSE_CATEGORY_LABELS[
                              expense.category as keyof typeof EXPENSE_CATEGORY_LABELS
                            ] ?? expense.category}
                          </span>
                          <Badge
                            tone={
                              expense.classification === "capital"
                                ? "clay"
                                : "neutral"
                            }
                          >
                            {CLASSIFICATION_LABELS[expense.classification]}
                          </Badge>
                          {expense.voidedAt ? (
                            <Badge tone="clay">Voided</Badge>
                          ) : null}
                          {expense.payee ? (
                            <span>· {expense.payee}</span>
                          ) : null}
                          {expense.receiptKey ? (
                            <a
                              href={`/api/expenses/${expense.id}/receipt`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-pine hover:underline"
                            >
                              <Paperclip className="h-3 w-3" aria-hidden />
                              Receipt
                            </a>
                          ) : null}
                        </p>
                      </TableCell>
                      <TableCell className="text-ink/70">
                        {expense.propertyName ?? "General"}
                        {expense.unitName ? ` · ${expense.unitName}` : ""}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-pine">
                        {formatPHP(expense.amountCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={modalHref("edit", expense.id)}
                          replace
                          className="text-sm font-medium text-clay-deep hover:underline"
                        >
                          {expense.voidedAt ? "View" : "Edit"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
      {panel ? (
        <RouteModal
          title={panel.title}
          description={panel.description}
          unavailable={panel.unavailable}
          closeHref={listHref}
        >
          {panel.body}
        </RouteModal>
      ) : null}
    </div>
  );
}
