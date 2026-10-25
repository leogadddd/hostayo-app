"use client";

import { useCallback, useEffect, useState } from "react";
import { onChanges, notifyChanged } from "./connectivity";
import {
  dismissRejected,
  listOutbox,
  listRejected,
  type OutboxEntry,
  type RejectedEntry,
} from "./outbox";

/**
 * Changes made on this device that the server hasn't taken yet: those still
 * waiting to sync and those it refused. Both newest first. Empty on the
 * server and when the browser can't store them.
 */
export function useOfflineChanges() {
  const [waiting, setWaiting] = useState<OutboxEntry[]>([]);
  const [rejected, setRejected] = useState<RejectedEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const [queued, refused] = await Promise.all([
        listOutbox(),
        listRejected(),
      ]);
      setWaiting(queued.reverse());
      setRejected(refused);
    } catch {
      // Storage is blocked; there is nothing to show.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const stop = onChanges(() => void load());
    return () => {
      clearTimeout(first);
      stop();
    };
  }, [load]);

  const dismiss = useCallback(async (id: string) => {
    await dismissRejected(id);
    notifyChanged();
  }, []);

  return { waiting, rejected, dismiss };
}
