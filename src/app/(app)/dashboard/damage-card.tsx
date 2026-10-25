import Link from "next/link";
import {
  Warning as AlertTriangle,
  CheckCircle as CircleCheck,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import { SHORT_DATE } from "./model";
import type { DashboardModel } from "./model";

/** Open damage reports, shared by the desktop and phone dashboards. */
export function DamageCard({
  reports,
  available,
  multipleProperties,
  showMoney,
  estimateCents,
  canSeeReservations,
  canSeeProperties,
  className,
}: {
  reports: DashboardModel["damage"];
  /** False when the query failed, so the card says so instead of "no damage". */
  available: boolean;
  multipleProperties: boolean;
  showMoney: boolean;
  estimateCents: number;
  canSeeReservations: boolean;
  canSeeProperties: boolean;
  className?: string;
}) {
  return (
    <Card id="damage" className={cn("flex scroll-mt-24 flex-col", className)}>
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-display text-xl text-pine">Damage reports</h2>
            <InfoTip>Open reports waiting to be fixed or charged.</InfoTip>
          </div>
        </div>
        {reports.length ? (
          <Badge tone="clay">{reports.length} open</Badge>
        ) : null}
      </CardHeader>
      {!available ? (
        <CardBody>
          <p className="text-sm text-ink/55">
            Damage reports are temporarily unavailable.
          </p>
        </CardBody>
      ) : reports.length === 0 ? (
        <CardBody className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <CircleCheck className="h-7 w-7 text-sage-deep" aria-hidden />
          <p className="mt-2 text-sm text-ink/60">No open damage.</p>
          <p className="mt-1 text-xs text-ink/45">
            Every unit is in one piece.
          </p>
        </CardBody>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-pine/8">
            {reports.slice(0, 5).map((report) => {
              const href =
                report.reservationId && canSeeReservations
                  ? `/reservations/${report.reservationId}`
                  : canSeeProperties
                    ? `/properties/${report.propertyId}/units/${report.unitId}`
                    : null;
              const body = (
                <>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-mist text-clay-deep">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-pine">
                      {report.description}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink/55">
                      {multipleProperties ? `${report.propertyName} · ` : ""}
                      {report.unitName} · {SHORT_DATE.format(report.createdAt)}
                    </span>
                  </span>
                  {showMoney ? (
                    <span className="shrink-0 text-sm tabular-nums text-clay-deep">
                      {report.estimatedAmountCents !== null ? (
                        formatPHP(report.estimatedAmountCents)
                      ) : (
                        <span className="text-xs text-ink/40">No estimate</span>
                      )}
                    </span>
                  ) : null}
                </>
              );
              return (
                <li key={report.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex items-center gap-3 px-6 py-3 transition hover:bg-pine-mist/40"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-6 py-3">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {showMoney || reports.length > 5 ? (
            <div className="flex items-center justify-between border-t border-pine/10 bg-paper/50 px-6 py-3 text-xs text-ink/55">
              <span>
                {reports.length > 5
                  ? `${reports.length - 5} more not shown`
                  : "Estimated total"}
              </span>
              {showMoney ? (
                <span className="font-medium tabular-nums text-pine">
                  {formatPHP(estimateCents)}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
