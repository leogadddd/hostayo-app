/**
 * APP_IS_LIVE=false puts the app in advertising mode: the "Sign in" buttons
 * are removed from public pages (terms, privacy) while the host is only being
 * shown off. Anything else, including unset, means the app is live. Read on
 * the server at request time, so no rebuild is needed.
 */
export function loginLinksHidden(): boolean {
  return process.env.APP_IS_LIVE === "false";
}

/**
 * REGISTRATION_DISABLED=true closes public sign-up: /register redirects to the
 * sign-in page, the "Create one" link is hidden and the auth API rejects new
 * email sign-ups. For the shared demo deployment. Read on the server at request
 * time, so no rebuild is needed.
 */
export function registrationDisabled(): boolean {
  return process.env.REGISTRATION_DISABLED === "true";
}

/**
 * REGISTRATION_INVITE_ONLY=true keeps sign-up to invited people: /register
 * needs an early-access link (`?tk=`, made with `npm run invite`) or a team
 * invitation, and the auth API rejects every other sign-up. Anything else,
 * including unset, leaves sign-up open. REGISTRATION_DISABLED wins when both
 * are set. Read on the server at request time, so no rebuild is needed.
 */
export function registrationInviteOnly(): boolean {
  return process.env.REGISTRATION_INVITE_ONLY === "true";
}
