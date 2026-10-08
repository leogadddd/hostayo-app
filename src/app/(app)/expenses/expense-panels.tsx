import type { ReactNode } from "react";
import { UNDER_CONSTRUCTION } from "@/components/app/under-construction";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/session";
import { todayInTimeZone } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { getExpense } from "@/server/expenses/service";
import { listOrgUnits, listProperties } from "@/server/inventory/service";
import { ExpenseForm } from "./expense-form";
import { VoidExpenseForm } from "./[expenseId]/void-expense-form";

/**
 * What the expense pages show, shared by the modal (opened from the list) and
 * the full page (direct visit or reload). `unavailable` replaces the body.
 */
export interface ExpensePanel {
  title: string;
  description: string;
  unavailable?: string;
  /** The expense doesn't exist (or isn't this organization's). */
  missing?: boolean;
  body?: ReactNode;
}

const REWORKING = "We’re reworking expenses. They’ll be back here soon.";

async function formOptions(organizationId: string) {
  const [properties, units] = await Promise.all([
    listProperties(organizationId),
    listOrgUnits(organizationId),
  ]);
  const unitsByProperty: Record<string, { id: string; name: string }[]> = {};
  for (const unit of units) {
    (unitsByProperty[unit.propertyId] ??= []).push({
      id: unit.id,
      name: unit.name,
    });
  }
  return {
    properties: properties.map(({ id, name }) => ({ id, name })),
    unitsByProperty,
  };
}

export async function newExpensePanel(
  doneHref = "/expenses",
): Promise<ExpensePanel> {
  const title = "Record expense";
  const description =
    "Keep operating costs and capital spending organized by property.";
  if (UNDER_CONSTRUCTION.expenses)
    return { title, description, unavailable: REWORKING };
  const membership = await requirePermission("expenses.create");
  if (!membership)
    return {
      title,
      description,
      unavailable: "Only the organization owner can record expenses.",
    };
  const { properties, unitsByProperty } = await formOptions(
    membership.organizationId,
  );
  return {
    title,
    description,
    body: (
      <ExpenseForm
        properties={properties}
        unitsByProperty={unitsByProperty}
        defaultPaidDate={todayInTimeZone("Asia/Manila")}
        doneHref={doneHref}
      />
    ),
  };
}

export async function expensePanel(
  expenseId: string,
  doneHref = "/expenses",
): Promise<ExpensePanel> {
  if (UNDER_CONSTRUCTION.expenses)
    return {
      title: "Expense",
      description: "",
      unavailable: REWORKING,
    };
  const membership = await requirePermission("expenses.view");
  if (!membership)
    return {
      title: "Expense",
      description: "",
      unavailable: "Expenses are limited to the organization owner.",
    };
  const expense = /^[0-9a-f-]{36}$/i.test(expenseId)
    ? await getExpense(membership.organizationId, expenseId)
    : null;
  if (!expense)
    return {
      title: "Expense",
      description: "",
      unavailable: "That expense doesn’t exist.",
      missing: true,
    };

  const title = expense.voidedAt ? "Voided expense" : "Edit expense";
  const description = `${formatPHP(expense.amountCents)} · ${expense.propertyName ?? "No specific property"}${expense.unitName ? ` · ${expense.unitName}` : ""}`;

  if (expense.voidedAt) {
    return {
      title,
      description,
      body: (
        <div className="space-y-2">
          <Badge tone="clay">Voided</Badge>
          <p className="text-sm text-ink/70">
            {expense.voidReason ?? "No reason recorded."}
          </p>
          <p className="text-xs text-ink/50">
            Voided expenses stay on record but are left out of totals, reports
            and exports.
          </p>
          {expense.receiptKey ? (
            <a
              href={`/api/expenses/${expense.id}/receipt`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-pine underline"
            >
              View receipt
            </a>
          ) : null}
        </div>
      ),
    };
  }

  if (!(await requirePermission("expenses.update")))
    return {
      title,
      description,
      unavailable: "Only the organization owner can edit expenses.",
    };

  const { properties, unitsByProperty } = await formOptions(
    membership.organizationId,
  );
  return {
    title,
    description,
    body: (
      <div className="space-y-6">
        <ExpenseForm
          properties={properties}
          unitsByProperty={unitsByProperty}
          defaultPaidDate={todayInTimeZone("Asia/Manila")}
          doneHref={doneHref}
          expense={{
            id: expense.id,
            propertyId: expense.propertyId,
            unitId: expense.unitId,
            amountCents: expense.amountCents,
            paidDate: expense.paidDate,
            category: expense.category,
            classification: expense.classification,
            payee: expense.payee,
            paymentMethod: expense.paymentMethod,
            description: expense.description,
            hasReceipt: Boolean(expense.receiptKey),
          }}
        />
        <section className="border-t border-pine/10 pt-5">
          <h3 className="font-display text-lg text-pine">Void this expense</h3>
          <p className="mb-3 mt-0.5 text-xs text-ink/50">
            For entries made by mistake. It stays on record, marked void, and no
            longer counts in totals.
          </p>
          <VoidExpenseForm expenseId={expense.id} doneHref={doneHref} />
        </section>
      </div>
    ),
  };
}
