import "server-only";

import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditEvents,
  properties,
  recurringExpenses,
  units,
  type PaymentMethod,
} from "@/lib/db/schema";
import { addDaysLocal, todayInTimeZone } from "@/lib/dates";
import { nextDueAfter, type Cadence } from "@/lib/recurrence";
import {
  confirmRecurringSchema,
  createExpenseSchema,
  recurringExpenseSchema,
} from "../payments/validation";
import {
  assertPropertyAndUnit,
  ExpenseError,
  insertExpense,
  parseAmount,
} from "./service";

const TIMEZONE = "Asia/Manila";
/** How far ahead a bill shows up as "coming up". */
const UPCOMING_DAYS = 7;
/** Stop counting missed periods; a bill this far behind needs a look anyway. */
const MAX_MISSED = 24;

export interface RecurringItem {
  id: string;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
  description: string;
  category: string;
  classification: "operating" | "capital";
  payee: string | null;
  paymentMethod: PaymentMethod | null;
  amountCents: number;
  cadence: Cadence;
  anchorDate: string;
  nextDueDate: string;
  endDate: string | null;
  isActive: boolean;
}

const columns = {
  id: recurringExpenses.id,
  propertyId: recurringExpenses.propertyId,
  propertyName: properties.name,
  unitId: recurringExpenses.unitId,
  unitName: units.name,
  description: recurringExpenses.description,
  category: recurringExpenses.category,
  classification: recurringExpenses.classification,
  payee: recurringExpenses.payee,
  paymentMethod: recurringExpenses.paymentMethod,
  amountCents: recurringExpenses.amountCents,
  cadence: recurringExpenses.cadence,
  anchorDate: recurringExpenses.anchorDate,
  nextDueDate: recurringExpenses.nextDueDate,
  endDate: recurringExpenses.endDate,
  isActive: recurringExpenses.isActive,
};

function selectItems(organizationId: string, extra: (SQL | undefined)[] = []) {
  return db
    .select(columns)
    .from(recurringExpenses)
    .leftJoin(
      properties,
      and(
        eq(recurringExpenses.propertyId, properties.id),
        eq(recurringExpenses.organizationId, properties.organizationId),
      ),
    )
    .leftJoin(
      units,
      and(
        eq(recurringExpenses.unitId, units.id),
        eq(recurringExpenses.organizationId, units.organizationId),
      ),
    )
    .where(
      and(
        eq(recurringExpenses.organizationId, organizationId),
        // Bills with no property have none to be deleted.
        isNull(properties.deletedAt),
        ...extra,
      ),
    );
}

/** Every recurring bill, paused ones last, soonest due first. */
export async function listRecurring(
  organizationId: string,
): Promise<RecurringItem[]> {
  return selectItems(organizationId).orderBy(
    desc(recurringExpenses.isActive),
    asc(recurringExpenses.nextDueDate),
  );
}

export async function getRecurring(
  organizationId: string,
  id: string,
): Promise<RecurringItem | null> {
  const [row] = await selectItems(organizationId, [
    eq(recurringExpenses.id, id),
  ]).limit(1);
  return row ?? null;
}

export interface DueRecurring extends RecurringItem {
  /** Earlier-than-today periods still waiting, this one included. */
  missedPeriods: number;
  status: "overdue" | "today" | "upcoming";
}

/**
 * Bills to act on: active, and due today, overdue, or within the next week.
 * Only the next period of each shows; confirming or skipping it brings up the
 * following one if it's also due.
 */
export async function listDueRecurring(
  organizationId: string,
  today = todayInTimeZone(TIMEZONE),
): Promise<DueRecurring[]> {
  const horizon = addDaysLocal(today, UPCOMING_DAYS);
  const rows = await selectItems(organizationId, [
    eq(recurringExpenses.isActive, true),
    lte(recurringExpenses.nextDueDate, horizon),
    or(
      isNull(recurringExpenses.endDate),
      sql`${recurringExpenses.nextDueDate} <= ${recurringExpenses.endDate}`,
    ),
  ]).orderBy(asc(recurringExpenses.nextDueDate));
  return rows.map((row) => {
    let missedPeriods = 0;
    for (let n = 0; n < MAX_MISSED; n += 1) {
      const due = nextDueAfterCount(
        row.anchorDate,
        row.cadence,
        row.nextDueDate,
        n,
      );
      if (due > today || (row.endDate && due > row.endDate)) break;
      missedPeriods += 1;
    }
    return {
      ...row,
      missedPeriods,
      status:
        row.nextDueDate < today
          ? "overdue"
          : row.nextDueDate === today
            ? "today"
            : "upcoming",
    };
  });
}

/** The due date `n` periods after `from` (n = 0 is `from`). */
function nextDueAfterCount(
  anchor: string,
  cadence: Cadence,
  from: string,
  n: number,
): string {
  let due = from;
  for (let i = 0; i < n; i += 1) due = nextDueAfter(anchor, cadence, due);
  return due;
}

function templateValues(data: ReturnType<typeof recurringExpenseSchema.parse>) {
  const amountCents = parseAmount(data.amountPesos);
  if (data.endDate && data.endDate < data.dueDate) {
    throw new ExpenseError(
      "The end date can’t be before the due date.",
      "endDate",
    );
  }
  return {
    propertyId: data.propertyId,
    unitId: data.unitId ?? null,
    description: data.description,
    category: data.category,
    classification: data.classification,
    payee: data.payee || null,
    paymentMethod: data.paymentMethod ?? null,
    amountCents,
    cadence: data.cadence,
    endDate: data.endDate ?? null,
  };
}

export async function createRecurring(input: {
  organizationId: string;
  actorUserId: string;
  data: unknown;
}) {
  const data = recurringExpenseSchema.parse(input.data);
  const values = templateValues(data);
  return db.transaction(async (tx) => {
    await assertPropertyAndUnit(
      tx,
      input.organizationId,
      data.propertyId,
      data.unitId,
    );
    const [entry] = await tx
      .insert(recurringExpenses)
      .values({
        ...values,
        organizationId: input.organizationId,
        anchorDate: data.dueDate,
        nextDueDate: data.dueDate,
        createdBy: input.actorUserId,
      })
      .returning();
    if (!entry) throw new ExpenseError("Failed to save the recurring bill.");
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "recurring_expense",
      entityId: entry.id,
      action: "recurring_expense.created",
      metadata: {
        amountCents: values.amountCents,
        category: values.category,
        cadence: values.cadence,
        firstDueDate: data.dueDate,
      },
    });
    return entry;
  });
}

/**
 * Change a bill going forward. Past expenses keep what they recorded. Setting
 * a different next due date restarts the schedule from that date.
 */
export async function updateRecurring(input: {
  organizationId: string;
  actorUserId: string;
  recurringId: string;
  data: unknown;
}) {
  const data = recurringExpenseSchema.parse(input.data);
  const values = templateValues(data);
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.organizationId, input.organizationId),
          eq(recurringExpenses.id, input.recurringId),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) throw new ExpenseError("Recurring bill not found.");
    await assertPropertyAndUnit(
      tx,
      input.organizationId,
      data.propertyId,
      data.unitId,
    );
    const restart = data.dueDate !== current.nextDueDate;
    const [entry] = await tx
      .update(recurringExpenses)
      .set({
        ...values,
        ...(restart
          ? { anchorDate: data.dueDate, nextDueDate: data.dueDate }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(recurringExpenses.id, current.id))
      .returning();
    if (!entry) throw new ExpenseError("Failed to save the recurring bill.");
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "recurring_expense",
      entityId: entry.id,
      action: "recurring_expense.updated",
      metadata: {
        amountCents: values.amountCents,
        cadence: values.cadence,
        nextDueDate: entry.nextDueDate,
      },
    });
    return entry;
  });
}

export async function setRecurringActive(input: {
  organizationId: string;
  actorUserId: string;
  recurringId: string;
  active: boolean;
}) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .update(recurringExpenses)
      .set({ isActive: input.active, updatedAt: new Date() })
      .where(
        and(
          eq(recurringExpenses.organizationId, input.organizationId),
          eq(recurringExpenses.id, input.recurringId),
        ),
      )
      .returning();
    if (!entry) throw new ExpenseError("Recurring bill not found.");
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "recurring_expense",
      entityId: entry.id,
      action: input.active
        ? "recurring_expense.resumed"
        : "recurring_expense.paused",
      metadata: { description: entry.description },
    });
    return entry;
  });
}

/** Lock the bill and make sure the caller is acting on its current due date. */
async function lockDue(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  organizationId: string,
  recurringId: string,
  dueDate: string,
) {
  const [bill] = await tx
    .select()
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.organizationId, organizationId),
        eq(recurringExpenses.id, recurringId),
      ),
    )
    .for("update")
    .limit(1);
  if (!bill) throw new ExpenseError("Recurring bill not found.");
  if (!bill.isActive) throw new ExpenseError("This bill is paused.");
  // A second tap, or another tab, already handled this due date.
  if (bill.nextDueDate !== dueDate) {
    throw new ExpenseError("That due date was already handled. Refresh.");
  }
  return bill;
}

/** Record this period's bill as a real expense and move to the next period. */
export async function confirmRecurring(input: {
  organizationId: string;
  actorUserId: string;
  recurringId: string;
  data: unknown;
}) {
  const data = confirmRecurringSchema.parse(input.data);
  return db.transaction(async (tx) => {
    const bill = await lockDue(
      tx,
      input.organizationId,
      input.recurringId,
      data.dueDate,
    );
    const amountCents = data.amountPesos
      ? parseAmount(data.amountPesos)
      : bill.amountCents;
    const expense = createExpenseSchema.parse({
      propertyId: bill.propertyId ?? undefined,
      unitId: bill.unitId ?? undefined,
      amountPesos: String(amountCents / 100),
      category: bill.category,
      description: bill.description,
      classification: bill.classification,
      paidDate: data.paidDate ?? todayInTimeZone(TIMEZONE),
      payee: bill.payee ?? undefined,
      paymentMethod: bill.paymentMethod ?? undefined,
    });
    const entry = await insertExpense(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      data: expense,
      amountCents,
      recurring: { id: bill.id, dueDate: data.dueDate },
    });
    await tx
      .update(recurringExpenses)
      .set({
        nextDueDate: nextDueAfter(bill.anchorDate, bill.cadence, data.dueDate),
        updatedAt: new Date(),
      })
      .where(eq(recurringExpenses.id, bill.id));
    return entry;
  });
}

/** Pass on this period without recording anything, and move to the next. */
export async function skipRecurring(input: {
  organizationId: string;
  actorUserId: string;
  recurringId: string;
  dueDate: string;
}) {
  return db.transaction(async (tx) => {
    const bill = await lockDue(
      tx,
      input.organizationId,
      input.recurringId,
      input.dueDate,
    );
    await tx
      .update(recurringExpenses)
      .set({
        nextDueDate: nextDueAfter(bill.anchorDate, bill.cadence, input.dueDate),
        updatedAt: new Date(),
      })
      .where(eq(recurringExpenses.id, bill.id));
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "recurring_expense",
      entityId: bill.id,
      action: "recurring_expense.skipped",
      metadata: { dueDate: input.dueDate, description: bill.description },
    });
  });
}
