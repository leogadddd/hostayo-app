import { describe, expect, it } from "vitest";
import {
  createExpense,
  getExpense,
  listExpenses,
  updateExpense,
  voidExpense,
} from "@/server/expenses/service";
import { getDashboardSeries } from "@/server/reports/dashboard";
import { getReport } from "@/server/reports/service";
import { exportExpenses } from "@/server/reports/exports";
import { createTestOrg, createTestProperty, stayDates } from "./helpers";

async function setup(label: string) {
  const { org, owner } = await createTestOrg(label);
  const property = await createTestProperty(org.id, owner.id);
  const { checkIn, checkOut } = stayDates(50);
  const base = {
    propertyId: property.id,
    category: "subscriptions",
    amountPesos: "549",
    description: "Netflix",
    classification: "operating",
    paidDate: checkIn,
    payee: "Netflix",
    paymentMethod: "gcash",
  };
  return { org, owner, property, checkIn, checkOut, base };
}

describe("expenses", () => {
  it("records payee and method, and edits with an audit trail", async () => {
    const { org, owner, base } = await setup("exp-edit");
    const created = await createExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      data: base,
    });
    expect(created.payee).toBe("Netflix");
    expect(created.paymentMethod).toBe("gcash");

    const { entry } = await updateExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      expenseId: created.id,
      data: { ...base, amountPesos: "599", payee: "Netflix PH" },
    });
    expect(entry.amountCents).toBe(59_900);
    expect(entry.payee).toBe("Netflix PH");
  });

  it("keeps the old receipt unless told otherwise, and returns a replaced one", async () => {
    const { org, owner, base } = await setup("exp-receipt");
    const created = await createExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      data: base,
      receiptKey: `org/${org.id}/photos/one`,
    });
    const kept = await updateExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      expenseId: created.id,
      data: { ...base, description: "Netflix monthly" },
    });
    expect(kept.entry.receiptKey).toBe(`org/${org.id}/photos/one`);
    expect(kept.replacedReceiptKey).toBeNull();

    const replaced = await updateExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      expenseId: created.id,
      data: { ...base, description: "Netflix monthly" },
      receiptKey: `org/${org.id}/photos/two`,
    });
    expect(replaced.replacedReceiptKey).toBe(`org/${org.id}/photos/one`);
  });

  it("voids an expense out of lists, reports, charts and exports", async () => {
    const { org, owner, base, checkIn, checkOut } = await setup("exp-void");
    const keep = await createExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      data: { ...base, description: "Internet", amountPesos: "1500" },
    });
    const mistake = await createExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      data: { ...base, description: "Duplicate", amountPesos: "2000" },
    });
    await voidExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      expenseId: mistake.id,
      data: { reason: "Entered twice" },
    });

    expect((await listExpenses(org.id)).map((e) => e.id)).toEqual([keep.id]);
    const all = await listExpenses(org.id, { includeVoided: true });
    expect(all).toHaveLength(2);
    expect(all.find((e) => e.id === mistake.id)?.voidReason).toBe(
      "Entered twice",
    );

    const range = { from: checkIn, to: checkOut };
    const [report, series, csv] = await Promise.all([
      getReport(org.id, range),
      getDashboardSeries(org.id, range),
      exportExpenses(org.id, range),
    ]);
    expect(report.summary.operatingExpensesCents).toBe(150_000);
    expect(series.days.reduce((n, d) => n + d.expensesCents, 0)).toBe(150_000);
    expect(csv.csv).toContain("Internet");
    expect(csv.csv).not.toContain("Duplicate");
  });

  it("refuses to edit or re-void a voided expense, and isolates organizations", async () => {
    const { org, owner, base } = await setup("exp-guard");
    const other = await createTestOrg("exp-guard-other");
    const created = await createExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      data: base,
    });
    await voidExpense({
      organizationId: org.id,
      actorUserId: owner.id,
      expenseId: created.id,
      data: { reason: "Wrong property" },
    });
    await expect(
      updateExpense({
        organizationId: org.id,
        actorUserId: owner.id,
        expenseId: created.id,
        data: base,
      }),
    ).rejects.toThrow(/voided/);
    await expect(
      voidExpense({
        organizationId: org.id,
        actorUserId: owner.id,
        expenseId: created.id,
        data: { reason: "Again" },
      }),
    ).rejects.toThrow(/already void/);
    expect(await getExpense(other.org.id, created.id)).toBeNull();
    await expect(
      voidExpense({
        organizationId: other.org.id,
        actorUserId: other.owner.id,
        expenseId: created.id,
        data: { reason: "Not mine" },
      }),
    ).rejects.toThrow();
  });
});
