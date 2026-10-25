import { cn } from "@/lib/utils";

export interface StepProgressItem {
  key: string;
  label: string;
  done?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/**
 * The phone's version of the step tabs: "Step 2 of 4" with the step's name,
 * and a segmented bar you can tap to go back to a finished step. Hidden on
 * wide screens, which show the tab bar instead.
 */
export function StepProgress({
  items,
  current,
  label = "Steps",
}: {
  items: StepProgressItem[];
  current: string;
  label?: string;
}) {
  const index = Math.max(
    0,
    items.findIndex((item) => item.key === current),
  );
  return (
    <nav aria-label={label} className="lg:hidden">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
          Step {index + 1} of {items.length}
        </p>
        <p className="text-sm font-semibold text-pine">{items[index]?.label}</p>
      </div>
      <ol className="mt-1 flex gap-1.5">
        {items.map((item, position) => {
          const active = item.key === current;
          return (
            <li key={item.key} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={item.disabled}
                aria-current={active ? "step" : undefined}
                aria-label={`${item.label}${item.done ? ", done" : ""}`}
                onClick={item.onSelect}
                className="group block w-full py-2.5 disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-colors",
                    active
                      ? "bg-clay"
                      : item.done || position < index
                        ? "bg-moss"
                        : "bg-pine/12",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
