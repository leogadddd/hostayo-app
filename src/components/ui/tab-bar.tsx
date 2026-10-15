import Link from "next/link";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface TabBarItem {
  key: string;
  label: string;
  /** A link to another page. Give this or `onSelect`. */
  href?: string;
  /** For tabs that switch a view in place, like the steps of a form. */
  onSelect?: () => void;
  disabled?: boolean;
  /** A small check, for steps already completed. */
  done?: boolean;
}

/**
 * Underlined tabs across the top of a page or form: the one look for moving
 * between the parts of a record (a property's Details and Photos, a
 * reservation's steps). Tabs are links, or buttons when they switch in place.
 */
export function TabBar({
  items,
  current,
  label = "Sections",
  className,
}: {
  items: TabBarItem[];
  current: string;
  label?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "-mx-1 mb-6 overflow-x-auto border-b border-pine/12 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ul className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = item.key === current;
          const classes = cn(
            "-mb-px inline-flex h-11 items-center gap-1.5 border-b-2 px-4 text-sm font-medium transition-colors",
            active
              ? "border-clay text-pine"
              : "border-transparent text-ink/55 hover:border-pine/25 hover:text-pine",
            item.disabled &&
              "pointer-events-none cursor-not-allowed text-ink/30 hover:border-transparent hover:text-ink/30",
          );
          const content = (
            <>
              {item.done && !active ? (
                <Check className="h-3.5 w-3.5 text-moss" aria-hidden />
              ) : null}
              {item.label}
            </>
          );
          return (
            <li key={item.key}>
              {item.href ? (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={classes}
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.onSelect}
                  disabled={item.disabled}
                  aria-current={active ? "step" : undefined}
                  className={classes}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
