/**
 * Advertising mode: set HIDE_LOGIN_LINKS=true to remove the "Sign in" buttons
 * from public pages (terms, privacy), e.g. when the host is only being shown
 * off. Read on the server at request time, so no rebuild is needed.
 */
export function loginLinksHidden(): boolean {
  return process.env.HIDE_LOGIN_LINKS === "true";
}
