import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MOBILE_CARD } from "@/components/app/mobile-ui";

export interface DataListGroup {
  key: string;
  label: string;
}

/**
 * The phone's replacement for a table: soft cards of tappable rows, optionally
 * grouped under headings (a month, a day). The caller decides how one row
 * looks, so each screen can show the few facts that matter instead of every
 * column.
 */
export function DataList<T>({
  items,
  getKey,
  renderItem,
  groupBy,
  label,
  className,
}: {
  items: readonly T[];
  getKey: (item: T) => string;
  /** One list item; return an `<li>` (or a fragment of them). */
  renderItem: (item: T) => ReactNode;
  /** Consecutive items with the same key share a heading. */
  groupBy?: (item: T) => DataListGroup;
  /** Accessible name of the list. */
  label: string;
  className?: string;
}) {
  const groups: { group: DataListGroup | null; items: T[] }[] = [];
  for (const item of items) {
    const group = groupBy ? groupBy(item) : null;
    const last = groups[groups.length - 1];
    if (last && last.group?.key === group?.key) last.items.push(item);
    else groups.push({ group, items: [item] });
  }

  return (
    <div className={className} aria-label={label} role="group">
      {groups.map(({ group, items: rows }, index) => (
        <section
          key={`${group?.key ?? "all"}-${index}`}
          className={index > 0 ? "mt-6" : undefined}
        >
          {group ? (
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-ink/50">
              {group.label}
            </h2>
          ) : null}
          <ul
            className={cn(
              MOBILE_CARD,
              "divide-y divide-pine/8 overflow-hidden",
            )}
          >
            {rows.map((item) => (
              <DataListRow key={getKey(item)}>{renderItem(item)}</DataListRow>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Wraps a row's content in its `<li>`. */
function DataListRow({ children }: { children: ReactNode }) {
  return <li className="relative">{children}</li>;
}
