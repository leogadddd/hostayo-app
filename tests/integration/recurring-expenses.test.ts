import { describe, expect, it } from "vitest";
import { createExpense, listExpenses } from "@/server/expenses/service";
import {
  confirmRecurring,
  createRecurring,
  listDueRecurring,
  setRecurringActive,
  skipRecurring,
} from "@/server/expenses/recurring";
import { createTestOrg, createTestProperty } from "./helpers";

const NETFLIX = {
  amountPesos: "549",
  category: "subscriptions",
  description: "Netflix",
  classification: "operating",
  payee: "Netflix",
  paymentMethod: "gcash",
  cadence: "monthly",
};

describe("recurring expenses", () => {
  it("records an expense with no property or unit", async () => {
    const { org, owner } = await createTestOrg("rec-no-property");
    const expense = await createExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      data: {
        amountPesos: "549",
        category: "subscriptions",
        description: "Netflix",
        classification: "operating",
        paidDate: "2026-10-05",
      },
    });
    expect(expense.propertyId).toBeNull();
    const [row] = await listExpenses(org.id);
    expect(row?.propertyName).toBeNull();
  });

  it("rejects a unit without its property", async () => {
    const { org, owner } = await createTestOrg("rec-unit-only");
    await expect(
      createExpense({
        organizationId: org.id,
        actorUserId: owner.id,
        data: {
          unitId: "11111111-1111-1111-1111-111111111111",
          amountPesos: "10",
          category: "other",
          description: "Stray",
          classification: "operating",
          paidDate: "2026-10-05",
        },
      }),
    ).rejects.toThrow(/property/);
  });

  it("surfaces a due bill, confirms it once, and moves to the next month", async () => {
    const { org, owner } = await createTestOrg("rec-confirm");
    const bill = await createRecurring({
      organizationId: org.id,
      actorUserId: owner.id,
      data: { ...NETFLIX, dueDate: "2026-10-05" },
    });
    const due = await listDueRecurring(org.id, "2026-10-06");
    expect(due.map((d) => d.id)).toEqual([bill.id]);
    expect(due[0]?.status).toBe("overdue");

    const expense = await confirmRecurring({
      organizationId: org.id,
      actorUserId: owner.id,
      recurringId: bill.id,
      data: { dueDate: "2026-10-05", amountPesos: "599" },
    });
    expect(expense.amountCents).toBe(59_900);
    expect(expense.recurringExpenseId).toBe(bill.id);
    expect(expense.recurringDueDate).toBe("2026-10-05");

    // A second tap on the same due date does nothing.
    await expect(
      confirmRecurring({
        organizationId: org.id,
        actorUserId: owner.id,
        recurringId: bill.id,
        data: { dueDate: "2026-10-05" },
      }),
    ).rejects.toThrow(/already handled/);
    expect(await listExpenses(org.id)).toHaveLength(1);
    expect(await listDueRecurring(org.id, "2026-10-06")).toEqual([]);
    const upcoming = await listDueRecurring(org.id, "2026-11-01");
    expect(upcoming[0]?.nextDueDate).toBe("2026-11-05");
    expect(upcoming[0]?.status).toBe("upcoming");
  });

  it("skips a month without recording anything, and pausing hides the bill", async () => {
    const { org, owner } = await createTestOrg("rec-skip");
    const property = await createTestProperty(org.id, owner.id);
    const bill = await createRecurring({
      organizationId: org.id,
      actorUserId: owner.id,
      data: {
        ...NETFLIX,
        propertyId: property.id,
        dueDate: "2026-10-05",
      },
    });
    await skipRecurring({
      organizationId: org.id,
      actorUserId: owner.id,
      recurringId: bill.id,
      dueDate: "2026-10-05",
    });
    expect(await listExpenses(org.id)).toHaveLength(0);
    expect((await listDueRecurring(org.id, "2026-11-05"))[0]?.nextDueDate).toBe(
      "2026-11-05",
    );

    await setRecurringActive({
      organizationId: org.id,
      actorUserId: owner.id,
      recurringId: bill.id,
      active: false,
    });
    expect(await listDueRecurring(org.id, "2026-11-05")).toEqual([]);
    await expect(
      confirmRecurring({
        organizationId: org.id,
        actorUserId: owner.id,
        recurringId: bill.id,
        data: { dueDate: "2026-11-05" },
      }),
    ).rejects.toThrow(/paused/);
  });

  it("stops listing a bill after its end date and isolates organizations", async () => {
    const { org, owner } = await createTestOrg("rec-end");
    const other = await createTestOrg("rec-end-other");
    const bill = await createRecurring({
      organizationId: org.id,
      actorUserId: owner.id,
      data: { ...NETFLIX, dueDate: "2026-10-05", endDate: "2026-10-31" },
    });
    await confirmRecurring({
      organizationId: org.id,
      actorUserId: owner.id,
      recurringId: bill.id,
      data: { dueDate: "2026-10-05" },
    });
    // The next one (Nov 5) is past the end date.
    expect(await listDueRecurring(org.id, "2026-11-05")).toEqual([]);
    expect(await listDueRecurring(other.org.id, "2026-10-05")).toEqual([]);
    await expect(
      confirmRecurring({
        organizationId: other.org.id,
        actorUserId: other.owner.id,
        recurringId: bill.id,
        data: { dueDate: "2026-11-05" },
      }),
    ).rejects.toThrow();
  });
});
