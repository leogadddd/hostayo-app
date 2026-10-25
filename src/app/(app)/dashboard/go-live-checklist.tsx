import Link from "next/link";
import { ArrowRight, CheckCircle as CircleCheck } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { GoLiveChecklist } from "@/server/orgs/checklist";
import { cn } from "@/lib/utils";

/**
 * Setup progress toward going live. Hidden once the page is live and nothing
 * is left, so it only takes space while it has something to say.
 */
export function GoLiveChecklistCard({
  checklist,
}: {
  checklist: GoLiveChecklist;
}) {
  const { items, doneCount, total, live, completed } = checklist;
  if (completed) return null;
  const percent = Math.round((doneCount / total) * 100);
  const next = items.find((item) => !item.done && !item.blocked);

  return (
    <Card className="mb-8 bg-card" aria-labelledby="go-live-heading">
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="go-live-heading" className="font-display text-xl text-pine">
              {live ? "A few things left" : "Get ready to go live"}
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              {doneCount} of {total} done
              {next ? `. Next: ${next.title.toLowerCase()}.` : "."}
            </p>
          </div>
          <span className="font-display text-2xl tabular-nums text-pine">
            {percent}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-label="Go-live progress"
          className="mt-3 h-2 overflow-hidden rounded-full bg-pine/10"
        >
          <div
            className="h-full rounded-full bg-moss transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <ul className="divide-y divide-pine/8">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 py-3",
                item.blocked && "opacity-50",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  item.done
                    ? "border-moss bg-moss text-white"
                    : "border-pine/25",
                )}
              >
                {item.done ? <CircleCheck className="h-4 w-4" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium text-pine",
                    item.done && "text-ink/50 line-through",
                  )}
                >
                  {item.done ? <span className="sr-only">Done: </span> : null}
                  {item.title}
                </p>
                {!item.done ? (
                  <p className="text-xs text-ink/55">{item.description}</p>
                ) : null}
              </div>
              {!item.done && !item.blocked ? (
                <Link
                  href={item.href}
                  className={buttonClassName(
                    item.id === next?.id ? "clay" : "ghost",
                    "sm",
                  )}
                >
                  {item.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
