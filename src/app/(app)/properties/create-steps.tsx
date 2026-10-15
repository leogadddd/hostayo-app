import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const PROPERTY_STEPS = ["Details", "Photos"] as const;
export const UNIT_STEPS = [
  "Details",
  "Pricing",
  "Guest guide",
  "Photos",
] as const;

/** "Details → Photos": where someone is when adding a property or unit. */
export function CreateSteps({
  current,
  steps = PROPERTY_STEPS,
}: {
  current: number;
  steps?: readonly string[];
}) {
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex items-center gap-3 text-sm">
        {steps.map((label, index) => {
          const step = index + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                aria-current={active ? "step" : undefined}
                className="flex items-center gap-2"
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                    done && "bg-moss text-white",
                    active && "bg-clay text-white",
                    !done && !active && "bg-pine/10 text-pine/60",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : step}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    active ? "text-pine" : "text-ink/55",
                  )}
                >
                  {label}
                </span>
              </span>
              {index < steps.length - 1 ? (
                <span aria-hidden className="h-px w-8 bg-pine/20 sm:w-12" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
