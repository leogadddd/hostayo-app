"use client";

import { useSyncExternalStore } from "react";
import type { ConnectionState } from "@/lib/app-status";
import { drainOutbox, outboxCount, type OutboxEntry } from "./outbox";

/**
 * One shared view of the connection for the whole page: whether the server is
 * reachable, how many offline changes are waiting, and whether they're being
 * sent. `navigator.onLine` only knows about the network card, so a periodic
 * request to /api/health confirms the server is really reachable (a hotel
 * wifi with no internet reports "online").
 */

const HEARTBEAT_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 4_000;

const SERVER_STATE: ConnectionState = {
  online: true,
  pending: 0,
  syncing: false,
};

let state: ConnectionState = SERVER_STATE;
const listeners = new Set<() => void>();
let started = false;
let draining = false;
const rejectedHandlers = new Set<(entries: OutboxEntry[]) => void>();

function set(next: Partial<ConnectionState>) {
  const merged = { ...state, ...next };
  if (
    merged.online === state.online &&
    merged.pending === state.pending &&
    merged.syncing === state.syncing
  ) {
    return;
  }
  state = merged;
  for (const listener of listeners) listener();
}

async function refreshPending() {
  try {
    set({ pending: await outboxCount() });
  } catch {
    // Private windows can refuse IndexedDB; the app then just works online.
  }
}

async function reachable(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/health", {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Sends waiting changes. Safe to call any time; only one run happens at once. */
export async function syncNow(): Promise<void> {
  if (draining || !state.online) return;
  draining = true;
  try {
    await refreshPending();
    if (state.pending === 0) return;
    set({ syncing: true });
    const result = await drainOutbox();
    if (result.rejected.length > 0) {
      for (const handler of rejectedHandlers) handler(result.rejected);
    }
  } finally {
    draining = false;
    await refreshPending();
    set({ syncing: false });
  }
}

async function check() {
  const online = await reachable();
  const wasOffline = !state.online;
  // Another tab may have queued changes since we last looked.
  await refreshPending();
  set({ online });
  if (online && (wasOffline || state.pending > 0)) void syncNow();
}

/** Starts listening. Called once by `ConnectivityWatcher`; further calls do nothing. */
export function startConnectivity(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  const onChange = () => void check();
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  const timer = setInterval(onChange, HEARTBEAT_MS);
  void refreshPending().then(check);
  return () => {
    started = false;
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    clearInterval(timer);
  };
}

/** Called after something is added to the outbox, so the pill updates at once. */
export function notifyQueued(): void {
  void refreshPending().then(() => {
    if (state.online) void syncNow();
  });
}

/** Be told when the server refused queued changes for good. */
export function onRejected(
  handler: (entries: OutboxEntry[]) => void,
): () => void {
  rejectedHandlers.add(handler);
  return () => rejectedHandlers.delete(handler);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConnection(): ConnectionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
