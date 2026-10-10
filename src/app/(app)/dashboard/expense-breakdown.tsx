import Link from "next/link";
import {
  EXPENSE_CATEGORY_COLORS,
  ExpenseCategoryIcon,
} from "@/components/app/expense-category";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import { formatPHP } from "@/lib/money";

export type ExpenseCategoryRow = { category: string; amountCents: number };

export function ExpenseBreakdown({
  month,
  monthLabel,
  categories,
  className,
}: {
  month: string;
  monthLabel: string;
  categories: ExpenseCategoryRow[] | null;
  className?: string;
}) {
  const rows = categories ?? [];
  const totalCents = rows.reduce((sum, row) => sum + row.amountCents, 0);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-pine">
            Spending by category
          </h2>
          <p className="mt-1 text-xs text-ink/50">
            Expenses recorded for {monthLabel}
            {rows.length ? ` · ${formatPHP(totalCents)} total` : ""}.
          </p>
        </div>
        <Link
          href={`/expenses?month=${month}`}
          className="text-xs font-medium text-clay-deep hover:underline"
        >
          View expenses
        </Link>
      </CardHeader>
      <CardBody>
        {categories === null ? (
          <p className="text-sm text-ink/55">
            Expenses are temporarily unavailable.
          </p>
        ) : rows.length ? (
          <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {rows.slice(0, 8).map(({ category, amountCents }) => (
              <li key={category} className="flex items-center gap-3">
                <ExpenseCategoryIcon category={category} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="truncate text-ink/70">
                      {EXPENSE_CATEGORY_LABELS[
                        category as keyof typeof EXPENSE_CATEGORY_LABELS
                      ] ?? category}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-pine">
                      {formatPHP(amountCents)} ·{" "}
                      {Math.round((amountCents / totalCents) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-pine-mist/60">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (amountCents / totalCents) * 100)}%`,
                        background:
                          EXPENSE_CATEGORY_COLORS[category] ??
                          EXPENSE_CATEGORY_COLORS.other,
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/55">
            No expenses recorded this month yet.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
