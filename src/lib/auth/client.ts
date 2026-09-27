"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

let onTwoFactorChallenge: (() => void) | null = null;

export function setTwoFactorChallengeHandler(handler: (() => void) | null) {
  onTwoFactorChallenge = handler;
}

export const authClient = createAuthClient({
  plugins: [twoFactorClient({ onTwoFactorRedirect: () => onTwoFactorChallenge?.() })],
});
