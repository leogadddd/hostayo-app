import { cn } from "@/lib/utils";
import { EmptyArt, type EmptyArtName } from "@/components/ui/empty-art";

export function EmptyState({
  title,
  description,
  action,
  art,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  /** An illustration shown above the title. */
  art?: EmptyArtName;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      {art ? <EmptyArt name={art} /> : null}
      <h3 className="font-display text-xl text-pine">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
