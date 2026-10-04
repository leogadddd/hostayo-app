/**
 * APP_IS_LIVE=false puts the app in advertising mode: the "Sign in" buttons
 * are removed from public pages (terms, privacy) while the host is only being
 * shown off. Anything else, including unset, means the app is live. Read on
 * the server at request time, so no rebuild is needed.
 */
export function loginLinksHidden(): boolean {
  return process.env.APP_IS_LIVE === "false";
}
