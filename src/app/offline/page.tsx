import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "You’re offline" };

/**
 * Shown by the service worker when a page is opened with no connection and no
 * saved copy. Pages you've already opened on this device still work offline.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="font-display text-4xl text-pine">You’re offline</h1>
      <p className="mt-3 max-w-md text-base text-ink/65">
        This page isn’t saved on this device yet. Pages you’ve opened before
        still work offline, and anything you change will sync when you’re back
        online.
      </p>
      <RetryButton />
    </main>
  );
}
