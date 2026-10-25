"use client";

import { clearOutbox } from "./outbox";

const USER_KEY = "hostayo:offline-user";

/**
 * Removes everything the app saved for offline use: saved pages (via the
 * service worker) and changes waiting to sync. Call on sign-out, and when a
 * different person signs in on the same device.
 */
export async function clearOfflineData(): Promise<void> {
  try {
    await clearOutbox();
  } catch {
    // Nothing was stored, or storage is blocked; there is nothing to clear.
  }
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // Same as above.
  }
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: "clear-user-data" });
  }
}

/**
 * Remembers who this device's saved data belongs to. If it was someone else,
 * their saved pages and unsent changes are cleared first.
 */
export async function claimOfflineData(userKey: string): Promise<void> {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(USER_KEY);
  } catch {
    return;
  }
  if (previous !== null && previous !== userKey) await clearOfflineData();
  try {
    localStorage.setItem(USER_KEY, userKey);
  } catch {
    // Not remembered; the next visit just won't be able to tell.
  }
}
