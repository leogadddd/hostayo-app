import type { CreateExpenseInput } from "@/server/payments/validation";
import { addDaysLocal } from "@/lib/dates";
import { unitHash } from "./sample-data";

/**
 * A believable spread of expenses for a small short-stay business: monthly
 * bills, turnover cleans, restocks, platform fees and a few one-offs, over
 * the current month and the `months` before it. Amounts vary a little month
 * to month but are repeatable, and descriptions are unique so reruns can
 * skip what already exists. Nothing is dated after `today`.
 */
export function sampleExpenses({
  today,
  properties,
  months = 3,
}: {
  today: string;
  properties: {
    id: string;
    name: string;
    units: { id: string; name: string }[];
  }[];
  months?: number;
}): CreateExpenseInput[] {
  const out: CreateExpenseInput[] = [];
  const several = properties.length > 1;
  /** A repeatable amount between min and max pesos, rounded to `step`. */
  const vary = (seed: string, min: number, max: number, step = 10) =>
    String(Math.round((min + unitHash(seed) * (max - min)) / step) * step);
  const add = (expense: CreateExpenseInput) => {
    if (expense.paidDate <= today) out.push(expense);
  };

  for (let back = months - 1; back >= 0; back--) {
    const month = shiftMonth(today.slice(0, 7), -back);
    const monthName = MONTH_NAMES[Number(month.slice(5, 7)) - 1]!;
    const on = (day: number) => `${month}-${String(day).padStart(2, "0")}`;

    for (const property of properties) {
      const where = several ? ` · ${property.name}` : "";
      const base = { propertyId: property.id };
      add({
        ...base,
        amountPesos: vary(`power-${month}-${property.id}`, 3200, 5800),
        category: "utilities",
        classification: "operating",
        paidDate: on(8),
        payee: "Meralco",
        paymentMethod: "gcash",
        description: `Electricity bill for ${monthName}${where}`,
      });
      add({
        ...base,
        amountPesos: vary(`water-${month}-${property.id}`, 520, 940),
        category: "utilities",
        classification: "operating",
        paidDate: on(12),
        payee: "Manila Water",
        paymentMethod: "gcash",
        description: `Water bill for ${monthName}${where}`,
      });
      add({
        ...base,
        amountPesos: "1699",
        category: "internet",
        classification: "operating",
        paidDate: on(5),
        payee: "PLDT Home",
        paymentMethod: "bank_transfer",
        description: `Fiber internet for ${monthName}${where}`,
      });
      add({
        ...base,
        amountPesos: "4200",
        category: "condo_dues",
        classification: "operating",
        paidDate: on(2),
        payee: "Building admin",
        paymentMethod: "bank_transfer",
        description: `Association dues for ${monthName}${where}`,
      });
      add({
        ...base,
        amountPesos: vary(`supplies-${month}-${property.id}`, 1600, 2900),
        category: "supplies",
        classification: "operating",
        paidDate: on(16),
        payee: "Puregold",
        paymentMethod: "maya",
        description: `Toiletries, coffee and cleaning supplies restock, ${monthName}${where}`,
      });

      property.units.forEach((unit, index) => {
        const unitId = unit.id;
        for (const [visit, day] of [3, 14, 24].entries()) {
          add({
            ...base,
            unitId,
            amountPesos: "650",
            category: "cleaning",
            classification: "operating",
            paidDate: on(Math.min(28, day + index)),
            payee: "Ate Mel",
            paymentMethod: "cash",
            description: `Turnover clean #${visit + 1}, ${monthName} · ${unit.name}${where}`,
          });
        }
        add({
          ...base,
          unitId,
          amountPesos: vary(`laundry-${month}-${unitId}`, 780, 1250),
          category: "cleaning",
          classification: "operating",
          paidDate: on(Math.min(28, 20 + index)),
          payee: "Suds Laundry Hub",
          paymentMethod: "gcash",
          description: `Linen and towel laundry, ${monthName} · ${unit.name}${where}`,
        });
      });
    }

    add({
      amountPesos: "549",
      category: "subscriptions",
      classification: "operating",
      paidDate: on(10),
      payee: "Netflix",
      paymentMethod: "gcash",
      description: `Netflix for guests, ${monthName}`,
    });
    add({
      amountPesos: vary(`platform-${month}`, 1400, 3200),
      category: "platform_fees",
      classification: "operating",
      paidDate: on(25),
      payee: "Airbnb",
      description: `Airbnb host service fees, ${monthName}`,
    });
  }

  // One-offs, placed relative to today so they always land in range.
  const first = properties[0];
  if (first) {
    const where = several ? ` · ${first.name}` : "";
    const unitId = first.units[0]?.id;
    add({
      propertyId: first.id,
      unitId,
      amountPesos: "1800",
      category: "maintenance",
      classification: "operating",
      paidDate: addDaysLocal(today, -9),
      payee: "CoolAir Aircon Services",
      paymentMethod: "gcash",
      description: `Aircon general cleaning${where}`,
    });
    add({
      propertyId: first.id,
      unitId,
      amountPesos: "950",
      category: "maintenance",
      classification: "operating",
      paidDate: addDaysLocal(today, -33),
      payee: "Kuya Ben (plumber)",
      paymentMethod: "cash",
      description: `Fixed leaking bathroom faucet${where}`,
    });
    add({
      propertyId: first.id,
      unitId,
      amountPesos: "18990",
      category: "renovation",
      classification: "capital",
      paidDate: addDaysLocal(today, -47),
      payee: "Abenson",
      paymentMethod: "bank_transfer",
      description: `New 50-inch smart TV for the living area${where}`,
    });
    add({
      propertyId: first.id,
      amountPesos: "7400",
      category: "renovation",
      classification: "capital",
      paidDate: addDaysLocal(today, -21),
      payee: "Wilcon Depot",
      paymentMethod: "maya",
      description: `Blackout curtains and rods for every bedroom${where}`,
    });
  }
  add({
    amountPesos: "1200",
    category: "other",
    classification: "operating",
    paidDate: addDaysLocal(today, -4),
    payee: "Canva",
    paymentMethod: "gcash",
    description: "Printed welcome cards and house manual",
  });

  return out.sort((a, b) => a.paidDate.localeCompare(b.paidDate));
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, m! - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}
