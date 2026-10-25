/**
 * The four states the app can be in, shown as one pill in the header.
 *
 * - `offline`: no connection. The app keeps working from what it has saved.
 * - `syncing`: back online and sending the changes made while offline.
 * - `paused`: connected, but the public page is switched off, so guests can't
 *   find or book the host. The team can still work as usual.
 * - `live`: connected and the public page is up. The default.
 *
 * A broken connection outranks everything else because it limits what the
 * person can do right now; unsent changes come next, since they say whether
 * the screen can be trusted; the public page comes last.
 */
export type AppStatus = "live" | "paused" | "offline" | "syncing";

export interface ConnectionState {
  /** The browser can reach the server. */
  online: boolean;
  /** Changes made offline that haven't reached the server yet. */
  pending: number;
  /** Those changes are being sent right now. */
  syncing: boolean;
}

export function appStatus(
  publicPageLive: boolean,
  connection: ConnectionState,
): AppStatus {
  if (!connection.online) return "offline";
  if (connection.syncing || connection.pending > 0) return "syncing";
  return publicPageLive ? "live" : "paused";
}

/** Short label for the pill. */
export const APP_STATUS_LABEL: Record<AppStatus, string> = {
  live: "Live",
  paused: "Paused",
  offline: "Offline",
  syncing: "Syncing",
};

/** One sentence for the pill's tooltip. */
export function appStatusHint(
  status: AppStatus,
  connection: ConnectionState,
): string {
  switch (status) {
    case "live":
      return "Your public page is live and you're connected.";
    case "paused":
      return "Your public page is paused. Guests can't find or book you until you go live.";
    case "offline":
      return connection.pending > 0
        ? `You're offline. ${connection.pending} ${connection.pending === 1 ? "change" : "changes"} will sync when you're back online.`
        : "You're offline. Changes you make will sync when you're back online.";
    case "syncing":
      return connection.pending > 0
        ? `Sending ${connection.pending} ${connection.pending === 1 ? "change" : "changes"} made while offline.`
        : "Catching up with the server.";
  }
}
