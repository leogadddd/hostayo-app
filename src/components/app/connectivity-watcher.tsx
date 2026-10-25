"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { claimOfflineData } from "@/lib/offline/clear";
import {
  onRejected,
  startConnectivity,
  useConnection,
} from "@/lib/offline/connectivity";

/**
 * Mount once in the app layout. Keeps the connection state fresh, registers the
 * service worker that lets the app open without a network (production only,
 * so development hot reloading is never intercepted), and tells people when
 * the server turned down something they did offline.
 */
export function ConnectivityWatcher({ userKey }: { userKey: string }) {
  useEffect(() => {
    // A different person on this device must never see the last person's saved pages.
    void claimOfflineData(userKey);
    const stop = startConnectivity();
    const stopRejected = onRejected((entries) => {
      for (const entry of entries) {
        toast.error(
          entry.label
            ? `“${entry.label}” couldn’t be saved`
            : "A change made offline couldn’t be saved",
          {
            description:
              "The server turned it down, for example because the dates were taken meanwhile.",
          },
        );
      }
    });
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The app works without it; it just can't open offline.
      });
    }
    return () => {
      stop();
      stopRejected();
    };
  }, [userKey]);
  return null;
}

/**
 * A strip across the top of the phone layout, which has no header, whenever
 * the app is offline or catching up. Desktop shows the same state in the
 * header pill.
 */
export function ConnectionStrip() {
  const { online, pending, syncing } = useConnection();
  if (online && !syncing && pending === 0) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-40 bg-pine px-4 py-1.5 text-center text-xs font-medium text-paper lg:hidden"
    >
      {!online
        ? pending > 0
          ? `Offline. ${pending} ${pending === 1 ? "change" : "changes"} will sync when you're back.`
          : "Offline. Changes will sync when you're back."
        : `Syncing ${pending > 0 ? pending : ""} ${pending === 1 ? "change" : "changes"}…`}
    </div>
  );
}
