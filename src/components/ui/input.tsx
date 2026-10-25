import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-pine/20 bg-surface px-3 text-sm",
        // 48px and 16px text on phones: easy to tap, and iPhones do not zoom in.
        "max-lg:h-12 max-lg:rounded-xl max-lg:text-base",
        "placeholder:text-ink/35",
        "focus:border-pine focus:outline-none focus:ring-2 focus:ring-sage",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  info,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  /** Helper text, shown in a tooltip behind an info badge. */
  info?: React.ReactNode;
}) {
  const label = (
    <label
      className={cn(
        "block text-sm font-medium text-ink max-lg:font-semibold max-lg:text-pine",
        info ? "" : "mb-1.5",
        className,
      )}
      {...props}
    />
  );
  if (!info) return label;
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      {label}
      <InfoTip>{info}</InfoTip>
    </div>
  );
}

const selectClassName =
  "h-10 w-full rounded-lg border border-pine/20 bg-surface px-3 text-sm max-lg:h-12 max-lg:rounded-xl max-lg:text-base " +
  "focus:border-pine focus:outline-none focus:ring-2 focus:ring-sage " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(selectClassName, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-pine/20 bg-surface px-3 py-2 text-sm",
        "max-lg:rounded-xl max-lg:px-4 max-lg:py-3 max-lg:text-base",
        "placeholder:text-ink/35",
        "focus:border-pine focus:outline-none focus:ring-2 focus:ring-sage",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-sm text-clay-deep" role="alert">
      {message}
    </p>
  );
}
