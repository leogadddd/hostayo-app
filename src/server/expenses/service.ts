import "server-only";

import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents, expenses, properties, units } from "@/lib/db/schema";
import { isValidMonth, monthNightRange } from "@/lib/dates";
import { MoneyParseError, pesosToCentavos } from "@/lib/money";
import type { PaymentMethod } from "@/lib/db/schema";
import {
  createExpenseSchema,
  voidExpenseSchema,
  type CreateExpenseInput,
} from "../payments/validation";

export class ExpenseError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ExpenseError";
  }
}

export interface ExpenseListItem {
  id: string;
  propertyId: string | null;
  propertyName: string | null;
  unitId: string | null;
  unitName: string | null;
  amountCents: number;
  category: string;
  description: string;
  classification: "operating" | "capital";
  paidDate: string;
  payee: string | null;
  paymentMethod: PaymentMethod | null;
  receiptKey: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  createdAt: Date;
}

const expenseColumns = {
  id: expenses.id,
  propertyId: expenses.propertyId,
  propertyName: properties.name,
  unitId: expenses.unitId,
  unitName: units.name,
  amountCents: expenses.amountCents,
  category: expenses.category,
  description: expenses.description,
  classification: expenses.classification,
  paidDate: expenses.paidDate,
  payee: expenses.payee,
  paymentMethod: expenses.paymentMethod,
  receiptKey: expenses.receiptKey,
  voidedAt: expenses.voidedAt,
  voidReason: expenses.voidReason,
  createdAt: expenses.createdAt,
};

export async function listExpenses(
  organizationId: string,
  filters: {
    propertyId?: string;
    classification?: string;
    month?: string;
    /** Voided rows are hidden unless asked for; they never count in totals. */
    includeVoided?: boolean;
  } = {},
): Promise<ExpenseListItem[]> {
  const conditions = [eq(expenses.organizationId, organizationId)];
  if (!filters.includeVoided) conditions.push(isNull(expenses.voidedAt));
  if (filters.propertyId) {
    conditions.push(eq(expenses.propertyId, filters.propertyId));
  }
  if (
    filters.classification === "operating" ||
    filters.classification === "capital"
  ) {
    conditions.push(eq(expenses.classification, filters.classification));
  }
  if (filters.month && isValidMonth(filters.month)) {
    const range = monthNightRange(filters.month);
    conditions.push(gte(expenses.paidDate, range.start));
    conditions.push(lt(expenses.paidDate, range.end));
  }

  return db
    .select(expenseColumns)
    .from(expenses)
    .leftJoin(
      properties,
      and(
        eq(expenses.propertyId, properties.id),
        eq(expenses.organizationId, properties.organizationId),
      ),
    )
    .leftJoin(
      units,
      and(
        eq(expenses.unitId, units.id),
        eq(expenses.organizationId, units.organizationId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(expenses.paidDate), desc(expenses.createdAt));
}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function parseAmount(amountPesos: string): number {
  try {
    return pesosToCentavos(amountPesos, { allowZero: false });
  } catch (error) {
    if (error instanceof MoneyParseError) {
      throw new ExpenseError(error.message, "amountPesos");
    }
    throw error;
  }
}

export async function assertPropertyAndUnit(
  tx: Tx,
  organizationId: string,
  propertyId: string | undefined,
  unitId: string | undefined,
) {
  if (!propertyId) {
    if (unitId) {
      throw new ExpenseError("Choose the unit’s property too.", "propertyId");
    }
    return;
  }
  const [property] = await tx
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!property) throw new ExpenseError("Property not found.", "propertyId");
  if (!unitId) return;
  const [unit] = await tx
    .select({ id: units.id })
    .from(units)
    .where(
      and(
        eq(units.id, unitId),
        eq(units.organizationId, organizationId),
        eq(units.propertyId, propertyId),
      ),
    )
    .limit(1);
  if (!unit) {
    throw new ExpenseError(
      "That unit does not belong to the chosen property.",
      "unitId",
    );
  }
}

export async function getExpense(
  organizationId: string,
  expenseId: string,
): Promise<ExpenseListItem | null> {
  const [row] = await db
    .select(expenseColumns)
    .from(expenses)
    .leftJoin(
      properties,
      and(
        eq(expenses.propertyId, properties.id),
        eq(expenses.organizationId, properties.organizationId),
      ),
    )
    .leftJoin(
      units,
      and(
        eq(expenses.unitId, units.id),
        eq(expenses.organizationId, units.organizationId),
      ),
    )
    .where(
      and(
        eq(expenses.organizationId, organizationId),
        eq(expenses.id, expenseId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Record an expense inside an open transaction (also used by recurring bills). */
export async function insertExpense(
  tx: Tx,
  input: {
    organizationId: string;
    actorUserId: string;
    data: CreateExpenseInput;
    amountCents: number;
    receiptKey?: string | null;
    recurring?: { id: string; dueDate: string };
  },
) {
  const { data } = input;
  await assertPropertyAndUnit(
    tx,
    input.organizationId,
    data.propertyId,
    data.unitId,
  );
  const [entry] = await tx
    .insert(expenses)
    .values({
      organizationId: input.organizationId,
      propertyId: data.propertyId ?? null,
      unitId: data.unitId ?? null,
      amountCents: input.amountCents,
      category: data.category,
      description: data.description,
      classification: data.classification,
      paidDate: data.paidDate,
      payee: data.payee || null,
      paymentMethod: data.paymentMethod ?? null,
      receiptKey: input.receiptKey ?? null,
      recurringExpenseId: input.recurring?.id ?? null,
      recurringDueDate: input.recurring?.dueDate ?? null,
      createdBy: input.actorUserId,
    })
    .returning();
  if (!entry) throw new ExpenseError("Failed to record the expense.");

  await tx.insert(auditEvents).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entity: "expense",
    entityId: entry.id,
    action: "expense.created",
    metadata: {
      propertyId: data.propertyId ?? null,
      unitId: data.unitId ?? null,
      amountCents: input.amountCents,
      category: data.category,
      classification: data.classification,
      ...(input.recurring
        ? {
            recurringExpenseId: input.recurring.id,
            dueDate: input.recurring.dueDate,
          }
        : {}),
    },
  });
  return entry;
}

export async function createExpense(input: {
  organizationId: string;
  actorUserId: string;
  data: unknown;
  receiptKey?: string | null;
}) {
  const data = createExpenseSchema.parse(input.data);
  const amountCents = parseAmount(data.amountPesos);
  return db.transaction((tx) =>
    insertExpense(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      data,
      amountCents,
      receiptKey: input.receiptKey,
    }),
  );
}

/**
 * Edit an expense that hasn't been voided. `receiptKey`: undefined keeps the
 * current receipt, null removes it, a string replaces it. Returns the entry and
 * the receipt key it replaced so the caller can delete that object.
 */
export async function updateExpense(input: {
  organizationId: string;
  actorUserId: string;
  expenseId: string;
  data: unknown;
  receiptKey?: string | null;
}) {
  const data = createExpenseSchema.parse(input.data);
  const amountCents = parseAmount(data.amountPesos);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.organizationId, input.organizationId),
          eq(expenses.id, input.expenseId),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) throw new ExpenseError("Expense not found.");
    if (current.voidedAt) {
      throw new ExpenseError("A voided expense can’t be edited.");
    }
    await assertPropertyAndUnit(
      tx,
      input.organizationId,
      data.propertyId,
      data.unitId,
    );

    const next = {
      propertyId: data.propertyId ?? null,
      unitId: data.unitId ?? null,
      amountCents,
      category: data.category,
      description: data.description,
      classification: data.classification,
      paidDate: data.paidDate,
      payee: data.payee || null,
      paymentMethod: data.paymentMethod ?? null,
      receiptKey:
        input.receiptKey === undefined ? current.receiptKey : input.receiptKey,
    };
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(next) as (keyof typeof next)[]) {
      if (current[key] !== next[key]) {
        changes[key] = { from: current[key], to: next[key] };
      }
    }
    if (Object.keys(changes).length === 0) {
      return { entry: current, replacedReceiptKey: null };
    }

    const [entry] = await tx
      .update(expenses)
      .set({ ...next, updatedAt: new Date() })
      .where(eq(expenses.id, current.id))
      .returning();
    if (!entry) throw new ExpenseError("Failed to save the expense.");

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "expense",
      entityId: entry.id,
      action: "expense.updated",
      // Receipt keys are storage paths; log only that it changed.
      metadata: {
        changes: Object.fromEntries(
          Object.entries(changes).map(([key, value]) => [
            key,
            key === "receiptKey"
              ? { from: Boolean(value.from), to: Boolean(value.to) }
              : value,
          ]),
        ),
      },
    });
    return {
      entry,
      replacedReceiptKey:
        current.receiptKey && current.receiptKey !== entry.receiptKey
          ? current.receiptKey
          : null,
    };
  });
}

/** Void an expense: it stays on record but leaves every total and export. */
export async function voidExpense(input: {
  organizationId: string;
  actorUserId: string;
  expenseId: string;
  data: unknown;
}) {
  const { reason } = voidExpenseSchema.parse(input.data);
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .update(expenses)
      .set({
        voidedAt: new Date(),
        voidedBy: input.actorUserId,
        voidReason: reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(expenses.organizationId, input.organizationId),
          eq(expenses.id, input.expenseId),
          isNull(expenses.voidedAt),
        ),
      )
      .returning();
    if (!entry) {
      throw new ExpenseError("That expense was not found or is already void.");
    }
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "expense",
      entityId: entry.id,
      action: "expense.voided",
      metadata: { reason, amountCents: entry.amountCents },
    });
    return entry;
  });
}
