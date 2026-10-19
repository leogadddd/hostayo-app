import { Star } from "@/components/ui/icons";

/** Read-only stars for a rating from 0 to 5; fractions round to the nearest half star fill. */
export function Stars({
  value,
  className = "h-4 w-4",
}: {
  value: number;
  className?: string;
}) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          weight={n <= rounded ? "fill" : "regular"}
          className={className}
        />
      ))}
    </span>
  );
}
