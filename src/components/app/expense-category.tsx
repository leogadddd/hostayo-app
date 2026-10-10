import type { ComponentType } from "react";
import {
  Building2,
  Ellipsis,
  Hammer,
  Package,
  Percent,
  Sparkles,
  Tv,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import type { ExpenseCategory } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const EXPENSE_CATEGORY_ICONS: Record<
  ExpenseCategory,
  ComponentType<{ className?: string }>
> = {
  cleaning: Sparkles,
  utilities: Zap,
  supplies: Package,
  maintenance: Wrench,
  internet: Wifi,
  subscriptions: Tv,
  condo_dues: Building2,
  platform_fees: Percent,
  renovation: Hammer,
  other: Ellipsis,
};

/**
 * Each category's chart color, as theme variables so they follow dark mode.
 * Kept here, not in the client-only chart kit, so server pages can read it.
 */
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  cleaning: "var(--color-chart-primary)",
  utilities: "var(--color-moss)",
  supplies: "var(--color-sage-deep)",
  maintenance: "var(--color-sand-deep)",
  internet: "var(--color-pine-soft)",
  subscriptions: "#7b6fa8",
  condo_dues: "#4f8a9b",
  platform_fees: "var(--color-clay)",
  renovation: "var(--color-chart-renovation)",
  other: "var(--color-chart-other)",
};

/** What usually goes in each category, shown under the picker. */
export const EXPENSE_CATEGORY_HINTS: Record<ExpenseCategory, string> = {
  cleaning: "Cleaners, laundry and linen service.",
  utilities: "Electricity, water and LPG.",
  supplies: "Toiletries, coffee, cleaning products, small items.",
  maintenance: "Repairs and upkeep: aircon cleaning, plumbing, pest control.",
  internet: "Fiber, prepaid data and Wi-Fi.",
  subscriptions: "Streaming, software and other monthly services.",
  condo_dues: "Association dues, parking and building fees.",
  platform_fees: "Airbnb, Booking.com and payment processor fees.",
  renovation:
    "Improvements that last: furniture, appliances, repainting. Usually capital.",
  other: "Anything that doesn’t fit the rest.",
};

/** Categories that are normally capital spending. */
export const CAPITAL_CATEGORIES: ReadonlySet<string> = new Set(["renovation"]);

/** The category's icon in a soft round chip, for lists. */
export function ExpenseCategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon =
    EXPENSE_CATEGORY_ICONS[category as ExpenseCategory] ??
    EXPENSE_CATEGORY_ICONS.other;
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/60 text-pine",
        className,
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
