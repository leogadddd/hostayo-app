import type { ReactNode } from "react";
import { UNDER_CONSTRUCTION } from "@/components/app/under-construction";
import { requirePermission } from "@/lib/auth/session";
import { todayInTimeZone } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { CADENCE_LABELS } from "@/lib/recurrence";
import { getRecurring } from "@/server/expenses/recurring";
import { listOrgUnits, listProperties } from "@/server/inventory/service";
import { RecurringForm } from "./recurring-form";

export interface RecurringPanel {
  title: string;
  description: string;
  unavailable?: string;
  body?: ReactNode;
}

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

export async function newRecurringPanel(
  doneHref = "/expenses/recurring",
): Promise<RecurringPanel> {
  const title = "Add recurring bill";
  const description =
    "A bill that comes back on a schedule, like a subscription or condo dues.";
  if (UNDER_CONSTRUCTION.expenses)
    return { title, description, unavailable: "Expenses are being reworked." };
  const membership = await requirePermission("expenses.create");
  if (!membership)
    return {
      title,
      description,
      unavailable: "Only the organization owner can add recurring bills.",
    };
  const { properties, unitsByProperty } = await formOptions(
    membership.organizationId,
  );
  return {
    title,
    description,
    body: (
      <RecurringForm
        properties={properties}
        unitsByProperty={unitsByProperty}
        defaultDueDate={todayInTimeZone("Asia/Manila")}
        doneHref={doneHref}
      />
    ),
  };
}

export async function recurringPanel(
  recurringId: string,
  doneHref = "/expenses/recurring",
): Promise<RecurringPanel & { missing?: boolean }> {
  const title = "Edit recurring bill";
  if (UNDER_CONSTRUCTION.expenses)
    return {
      title,
      description: "",
      unavailable: "Expenses are being reworked.",
    };
  const membership = await requirePermission("expenses.update");
  if (!membership)
    return {
      title,
      description: "",
      unavailable: "Only the organization owner can edit recurring bills.",
    };
  const bill = /^[0-9a-f-]{36}$/i.test(recurringId)
    ? await getRecurring(membership.organizationId, recurringId)
    : null;
  if (!bill)
    return {
      title,
      description: "",
      unavailable: "That recurring bill doesn’t exist.",
      missing: true,
    };
  const { properties, unitsByProperty } = await formOptions(
    membership.organizationId,
  );
  return {
    title,
    description: `${formatPHP(bill.amountCents)} · ${CADENCE_LABELS[bill.cadence].toLowerCase()}. Changes apply from the next due date; recorded expenses stay as they are.`,
    body: (
      <RecurringForm
        properties={properties}
        unitsByProperty={unitsByProperty}
        defaultDueDate={todayInTimeZone("Asia/Manila")}
        doneHref={doneHref}
        recurring={bill}
      />
    ),
  };
}
