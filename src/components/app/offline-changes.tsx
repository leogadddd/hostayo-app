"use client";

import { useOfflineChanges } from "@/lib/offline/use-offline-changes";
import { useConnection } from "@/lib/offline/connectivity";
import { Button } from "@/components/ui/button";

/**
 * Bookings and other changes made on this device that aren't on the server
 * yet, and the ones the server turned down. Shown above the reservation list.
 */
export function OfflineChanges() {
  const { waiting, rejected, dismiss } = useOfflineChanges();
  const { online, syncing } = useConnection();
  if (waiting.length === 0 && rejected.length === 0) return null;
  return (
    <div className="mb-4 space-y-3">
      {waiting.length > 0 && (
        <section
          aria-label="Waiting to sync"
          className="rounded-lg border border-clay/40 bg-clay-mist px-4 py-3 text-sm"
        >
          <h2 className="font-medium text-clay-deep">
            Waiting to sync ({waiting.length})
          </h2>
          <p className="mt-0.5 text-xs text-ink/65">
            {syncing
              ? "Sending now…"
              : online
                ? "Sending soon."
                : "Saved on this device. It will be sent when you're back online."}
          </p>
          <ul className="mt-2 space-y-1.5">
            {waiting.map((entry) => (
              <li key={entry.id} className="text-ink">
                {entry.label ?? "A change made offline"}
              </li>
            ))}
          </ul>
        </section>
      )}
      {rejected.length > 0 && (
        <section
          aria-label="Changes that could not be saved"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm"
        >
          <h2 className="font-medium text-red-800">
            Couldn’t be saved ({rejected.length})
          </h2>
          <ul className="mt-2 space-y-2">
            {rejected.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-ink">
                    {entry.label ?? "A change made offline"}
                  </p>
                  <p className="text-xs text-red-800">{entry.reason}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void dismiss(entry.id)}
                >
                  Dismiss
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
