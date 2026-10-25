import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-pine/12 bg-linen shadow-[0_2px_8px_rgba(32,58,53,0.035)]",
        // Softer and rounder on phones, like every other phone card.
        "max-lg:rounded-3xl max-lg:border-0 max-lg:bg-surface max-lg:shadow-[0_4px_24px_rgba(32,58,53,0.07)] max-lg:ring-1 max-lg:ring-pine/[0.06]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-pine/10 px-6 py-4", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}
