"use client";

import Link from "next/link";
import {
  APP_STATUS_LABEL,
  appStatus,
  appStatusHint,
  type AppStatus,
} from "@/lib/app-status";
import { useConnection } from "@/lib/offline/connectivity";
import { cn } from "@/lib/utils";

const STYLE: Record<AppStatus, { pill: string; dot: string }> = {
  live: {
    pill: "border-moss/40 bg-sage/40 text-pine",
    dot: "bg-moss",
  },
  paused: {
    pill: "border-pine/20 bg-pine-mist text-ink/65",
    dot: "bg-ink/35",
  },
  offline: {
    pill: "border-clay/40 bg-clay-mist text-clay-deep",
    dot: "bg-clay",
  },
  syncing: {
    pill: "border-pine/25 bg-sage/30 text-pine",
    dot: "bg-pine animate-pulse",
  },
};

/**
 * The app's one status: Live, Paused, Offline or Syncing. A paused page links
 * to the switch for people who can change it; the other states only explain
 * themselves.
 */
export function AppStatusPill({
  publicPageLive,
  canManageGoLive,
  className,
}: {
  publicPageLive: boolean;
  canManageGoLive: boolean;
  className?: string;
}) {
  const connection = useConnection();
  const status = appStatus(publicPageLive, connection);
  const hint = appStatusHint(status, connection);
  const style = STYLE[status];
  const body = (
    <>
      <span aria-hidden className={cn("h-2 w-2 rounded-full", style.dot)} />
      {APP_STATUS_LABEL[status]}
      {status === "syncing" && connection.pending > 0 ? (
        <span className="tabular-nums text-pine/60">{connection.pending}</span>
      ) : null}
    </>
  );
  const classes = cn(
    "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
    style.pill,
    className,
  );
  const manage = canManageGoLive && (status === "paused" || status === "live");
  return manage ? (
    <Link
      href="/settings/general"
      title={`${hint} Open settings.`}
      className={cn(classes, "hover:border-pine/40")}
    >
      {body}
    </Link>
  ) : (
    <span
      role="status"
      title={hint}
      className={classes}
      aria-label={`${APP_STATUS_LABEL[status]}. ${hint}`}
    >
      {body}
    </span>
  );
}
