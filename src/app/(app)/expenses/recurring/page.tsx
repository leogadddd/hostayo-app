import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  UnderConstruction,
  UNDER_CONSTRUCTION,
} from "@/components/app/under-construction";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { RouteModal } from "@/components/app/route-modal";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { readableDate, todayInTimeZone } from "@/lib/dates";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import { formatPHP } from "@/lib/money";
import { CADENCE_LABELS, monthlyEquivalentCents } from "@/lib/recurrence";
import { listRecurring } from "@/server/expenses/recurring";
import { PauseButton } from "./pause-button";
import { newRecurringPanel, recurringPanel } from "./recurring-panels";

export const metadata: Metadata = { title: "Recurring bills" };

export default async function RecurringExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (UNDER_CONSTRUCTION.expenses)
    return (
      <UnderConstruction
        title="Recurring bills"
        description="We’re reworking expenses. Recurring bills will be back here soon."
      />
    );
  const membership = await requirePermission("expenses.view");
  if (!membership) {
    return (
      <PermissionDenied description="Expenses are limited to the organization owner." />
    );
  }
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const editId = read("edit");
  const openNew = read("new") === "1";
  const listHref = "/expenses/recurring";
  const panel = editId
    ? await recurringPanel(editId, listHref)
    : openNew
      ? await newRecurringPanel(listHref)
      : null;

  const bills = await listRecurring(membership.organizationId);
  const today = todayInTimeZone("Asia/Manila");
  const canCreate = can(membership, "expenses.create");
  const canUpdate = can(membership, "expenses.update");
  const monthlyCents = bills
    .filter((bill) => bill.isActive)
    .reduce(
      (sum, bill) =>
        sum + monthlyEquivalentCents(bill.amountCents, bill.cadence),
      0,
    );

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Recurring bills"
        description="Subscriptions, dues and other bills that come back on a schedule. Nothing posts until you confirm it."
        backHref="/expenses"
        backLabel="Back to expenses"
      >
        {canCreate ? (
          <Link
            href="/expenses/recurring?new=1"
            replace
            className={buttonClassName("clay", "md")}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add recurring bill
          </Link>
        ) : null}
      </PageHeading>

      {bills.length === 0 ? (
        <EmptyState
          title="No recurring bills yet"
          description="Add Netflix, condo dues, internet or any bill you pay regularly. You’ll get a reminder to confirm each one when it’s due."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/60">
            Active bills cost about{" "}
            <span className="font-semibold text-pine">
              {formatPHP(monthlyCents)}
            </span>{" "}
            a month ({formatPHP(monthlyCents * 12)} a year).
          </p>
          <div className="overflow-hidden rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
            <Table
              aria-label="Recurring bills"
              className="[&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4"
            >
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Bill</TableHead>
                  <TableHead scope="col">Repeats</TableHead>
                  <TableHead scope="col">Next due</TableHead>
                  <TableHead scope="col">Property</TableHead>
                  <TableHead scope="col" className="text-right">
                    Usual amount
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className={bill.isActive ? undefined : "opacity-55"}
                  >
                    <TableCell className="min-w-48">
                      <p className="text-pine">{bill.description}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/50">
                        <span>
                          {EXPENSE_CATEGORY_LABELS[
                            bill.category as keyof typeof EXPENSE_CATEGORY_LABELS
                          ] ?? bill.category}
                        </span>
                        {bill.payee ? <span>· {bill.payee}</span> : null}
                        {!bill.isActive ? <Badge>Paused</Badge> : null}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink/70">
                      {CADENCE_LABELS[bill.cadence]}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink/70">
                      {bill.isActive
                        ? readableDate(bill.nextDueDate, today)
                        : "—"}
                      {bill.endDate ? (
                        <span className="block text-xs text-ink/45">
                          Ends {readableDate(bill.endDate)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-ink/70">
                      {bill.propertyName ?? "General"}
                      {bill.unitName ? ` · ${bill.unitName}` : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-pine">
                      {formatPHP(bill.amountCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canUpdate ? (
                        <span className="inline-flex items-center gap-3">
                          <Link
                            href={`/expenses/recurring?edit=${bill.id}`}
                            replace
                            className="text-sm font-medium text-clay-deep hover:underline"
                          >
                            Edit
                          </Link>
                          <PauseButton
                            recurringId={bill.id}
                            active={bill.isActive}
                          />
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

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
