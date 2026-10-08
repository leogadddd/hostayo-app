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
