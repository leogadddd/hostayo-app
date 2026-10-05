"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { ExtensionStatus } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  cancelExtensionRequestAction,
  removeExtensionAction,
} from "./extension-actions";

export interface ExtensionRow {
  id: string;
  status: ExtensionStatus;
  hours: number;
  hourlyRateCents: number;
  note: string | null;
  requestedBy: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decisionNote: string | null;
  /** Departure this request asks for, or (approved) the one it set (ISO). */
  untilAt: string;
}

const STATUS: Record<
  ExtensionStatus,
  { label: string; tone: "clay" | "sage" | "neutral"; icon: typeof Clock }
> = {
  requested: { label: "Waiting for approval", tone: "clay", icon: Hourglass },
  approved: { label: "Approved", tone: "sage", icon: CircleCheck },
  declined: { label: "Declined", tone: "neutral", icon: CircleX },
};

/** Late check-out on this stay: the open request, approved hours and declined requests. */
export function ExtensionsCard({
  reservationId,
  rows,
  departureAt,
  timeZone,
  canRequest,
  requestBlockedReason,
  canReview,
  canRemove,
  showMoney,
}: {
  reservationId: string;
  rows: ExtensionRow[];
  /** Departure with approved hours (ISO). */
  departureAt: string;
  timeZone: string;
  canRequest: boolean;
  /** Why no request can be made now, when the member could otherwise make one. */
  requestBlockedReason: string | null;
  canReview: boolean;
  canRemove: boolean;
  showMoney: boolean;
}) {
  const router = useRouter();
  const time = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const stamp = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const approved = rows
    .filter((row) => row.status === "approved")
    .reduce((sum, row) => sum + row.hours, 0);
  const href = `/reservations/${reservationId}`;

  return (
    <section className="rounded-2xl border border-pine/10 bg-surface p-5 shadow-[0_1px_2px_rgba(32,58,53,0.06)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-pine">Late check-out</h2>
          <p className="text-sm text-ink/60">
            {approved > 0
              ? `+${approved}h approved · guest leaves by ${time.format(new Date(departureAt))}`
              : `Check-out at ${time.format(new Date(departureAt))}.`}
          </p>
        </div>
        {canRequest && !requestBlockedReason ? (
          <Link
            href={`${href}/extend`}
            className={buttonClassName("outline", "sm")}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Request late check-out
          </Link>
        ) : null}
      </div>
      {canRequest && requestBlockedReason ? (
        <p className="mt-2 text-xs text-ink/55">{requestBlockedReason}</p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => {
            const status = STATUS[row.status];
            const Icon = status.icon;
            return (
              <li
                key={row.id}
                className={cn(
                  "rounded-xl border p-3 sm:p-4",
                  row.status === "requested"
                    ? "border-clay/20 border-l-4 border-l-clay bg-clay-mist/30"
                    : "border-pine/10",
                  row.status === "declined" && "opacity-75",
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      row.status === "requested" ? "text-clay" : "text-pine/60",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-pine">
                        +{row.hours}h · until{" "}
                        {time.format(new Date(row.untilAt))}
                      </p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/55">
                      Requested {stamp.format(new Date(row.requestedAt))}
                      {row.requestedBy ? ` by ${row.requestedBy}` : ""}
                      {row.decidedBy
                        ? ` · ${row.status === "approved" ? "approved" : "declined"} by ${row.decidedBy}`
                        : ""}
                    </p>
                    {row.note ? (
                      <p className="mt-1 text-xs text-ink/70">“{row.note}”</p>
                    ) : null}
                    {row.decisionNote ? (
                      <p className="mt-1 text-xs text-ink/70">
                        {row.status === "declined" ? "Reason: " : "Note: "}
                        {row.decisionNote}
                      </p>
                    ) : null}
                  </div>
                  {showMoney && row.status !== "declined" ? (
                    <p className="text-right text-sm tabular-nums text-ink/70">
                      {row.hours} × {formatPHP(row.hourlyRateCents)} ={" "}
                      <span className="font-medium text-pine">
                        {formatPHP(row.hours * row.hourlyRateCents)}
                      </span>
                      {row.status === "requested" ? (
                        <span className="block text-xs text-ink/45">
                          quoted
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>

                {row.status === "requested" && (canReview || canRequest) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canReview ? (
                      <Link
                        href={`${href}/extend/review`}
                        className={buttonClassName("clay", "sm")}
                      >
                        Review request
                      </Link>
                    ) : null}
                    {canRequest ? (
                      <ConfirmationDialog
                        trigger={
                          <>
                            <X className="h-4 w-4" aria-hidden />
                            Cancel request
                          </>
                        }
                        triggerVariant="ghost"
                        triggerSize="sm"
                        title="Cancel this request?"
                        description="Use this when the guest no longer needs the extra hours. Nothing was charged."
                        confirmLabel="Cancel request"
                        cancelLabel="Keep it"
                        successMessage="Request cancelled."
                        onConfirm={async () => {
                          const result = await cancelExtensionRequestAction(
                            reservationId,
                            row.id,
                          );
                          if (result.error) throw new Error(result.error);
                          router.refresh();
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
                {row.status === "approved" && canRemove ? (
                  <div className="mt-3">
                    <ConfirmationDialog
                      trigger={
                        <>
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Remove
                        </>
                      }
                      triggerVariant="ghost"
                      triggerSize="sm"
                      title="Remove this late check-out?"
                      description={`The stay goes back ${row.hours} hour${row.hours === 1 ? "" : "s"} earlier and its late check-out charge is removed from the booking.`}
                      confirmLabel="Remove late check-out"
                      successMessage="Late check-out removed."
                      onConfirm={async () => {
                        const result = await removeExtensionAction(
                          reservationId,
                          row.id,
                        );
                        if (result.error) throw new Error(result.error);
                        router.refresh();
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
