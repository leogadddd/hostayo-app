import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Plus,
  ShieldMinus,
} from "lucide-react";
import type { damageReports, depositDeductions } from "@/lib/db/schema";
import { formatPHP } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";

type DamageReport = typeof damageReports.$inferSelect;
type Deduction = typeof depositDeductions.$inferSelect;

/**
 * Damage reported against this stay, with what can be done about each report:
 * resolve it, keep its cost from the deposit, or open the turnover task.
 */
export function DamageCard({
  href,
  reports,
  deductions,
  timeFormat,
  canReport,
  canResolve,
  canDeduct,
  taskId,
}: {
  href: string;
  reports: DamageReport[];
  deductions: Deduction[];
  timeFormat: Intl.DateTimeFormat;
  canReport: boolean;
  canResolve: boolean;
  /** Recording money is allowed and a deposit is held. */
  canDeduct: boolean;
  taskId: string | null;
}) {
  const open = reports.filter((report) => report.status === "open").length;
  return (
    <section className="rounded-2xl border border-pine/10 bg-surface p-5 shadow-[0_1px_2px_rgba(32,58,53,0.06)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg text-pine">Damage reported</h2>
          {open > 0 ? (
            <Badge tone="clay">{open} open</Badge>
          ) : reports.length > 0 ? (
            <Badge tone="sage">All resolved</Badge>
          ) : null}
        </div>
        {canReport ? (
          <Link
            href={`${href}/damage/new`}
            className={buttonClassName("outline", "sm")}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Report damage
          </Link>
        ) : null}
      </div>

      {reports.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">
          No damage reported for this stay.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reports.map((report) => {
            const kept = deductions
              .filter((deduction) => deduction.damageReportId === report.id)
              .reduce((sum, deduction) => sum + deduction.amountCents, 0);
            const cost =
              report.actualAmountCents ?? report.estimatedAmountCents;
            const isOpen = report.status === "open";
            return (
              <li
                key={report.id}
                className={
                  isOpen
                    ? "rounded-xl border border-l-4 border-clay/20 border-l-clay bg-clay-mist/30 p-4"
                    : "rounded-xl border border-pine/10 p-4"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {isOpen ? (
                      <FileWarning
                        className="mt-0.5 h-4 w-4 shrink-0 text-clay"
                        aria-hidden
                      />
                    ) : (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-pine"
                        aria-hidden
                      />
                    )}
                    <p className="min-w-0 whitespace-pre-line break-words text-sm text-ink/85">
                      {report.description}
                    </p>
                  </div>
                  <Badge tone={isOpen ? "clay" : "sage"}>
                    {isOpen ? "Open" : "Resolved"}
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-ink/50">Reported</dt>
                    <dd className="text-ink/80">
                      {timeFormat.format(report.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink/50">
                      {report.actualAmountCents !== null
                        ? "Actual cost"
                        : "Estimated cost"}
                    </dt>
                    <dd className="tabular-nums text-ink/80">
                      {cost !== null ? formatPHP(cost) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink/50">Kept from deposit</dt>
                    <dd className="tabular-nums text-ink/80">
                      {kept > 0 ? formatPHP(kept) : "—"}
                    </dd>
                  </div>
                  {report.resolvedAt ? (
                    <div>
                      <dt className="text-ink/50">Resolved</dt>
                      <dd className="text-ink/80">
                        {timeFormat.format(report.resolvedAt)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {report.resolutionNote ? (
                  <p className="mt-2 rounded-lg bg-linen px-3 py-2 text-xs text-ink/70">
                    {report.resolutionNote}
                  </p>
                ) : null}

                {(isOpen && canResolve) ||
                (canDeduct && kept === 0) ||
                taskId ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isOpen && canResolve ? (
                      <Link
                        href={`${href}/damage/${report.id}/resolve`}
                        className={buttonClassName("clay", "sm")}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Resolve
                      </Link>
                    ) : null}
                    {canDeduct && kept === 0 ? (
                      <Link
                        href={`${href}/deductions/new?damage=${report.id}`}
                        className={buttonClassName("outline", "sm")}
                      >
                        <ShieldMinus className="h-4 w-4" aria-hidden />
                        Charge to deposit
                      </Link>
                    ) : null}
                    {taskId ? (
                      <Link
                        href={`/tasks/${taskId}`}
                        className={buttonClassName("ghost", "sm")}
                      >
                        <ClipboardList className="h-4 w-4" aria-hidden />
                        Turnover task
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
