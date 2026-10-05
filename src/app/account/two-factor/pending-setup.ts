"use client";

import { useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/client";

/**
 * The authenticator secret and recovery codes from starting 2FA setup, handed
 * from the password dialog to the setup page. Kept in memory only, never in
 * storage, so a reload means confirming the password again. Cleared when
 * setup finishes.
 */
export interface PendingSetup {
  totpURI: string;
  backupCodes: string[];
}

let pending: PendingSetup | null = null;
const listeners = new Set<() => void>();

function setPendingSetup(next: PendingSetup | null) {
  pending = next;
  listeners.forEach((listener) => listener());
}

export function clearPendingSetup() {
  setPendingSetup(null);
}

export function usePendingSetup() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending,
    () => null,
  );
}

/** Checks the password and creates a fresh, not-yet-verified authenticator secret. Returns an error message. */
export async function startTwoFactorSetup(
  password: string,
): Promise<string | void> {
  const { data, error } = await authClient.twoFactor.enable({
    password,
    method: "totp",
  });
  if (error || !data || data.method !== "totp") {
    return error?.status === 400 || error?.status === 401
      ? "That password isn’t right."
      : (error?.message ?? "Couldn’t start two-factor setup. Try again.");
  }
  setPendingSetup({ totpURI: data.totpURI, backupCodes: data.backupCodes });
}
