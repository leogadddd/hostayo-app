/**
 * Cookie choice. "all" also lets Hostayo remember preferences such as the
 * theme on this device; "essential" keeps to the cookies needed to sign in.
 */
export const CONSENT_COOKIE = "hostayo-cookie-consent";
export type CookieConsent = "all" | "essential";

export function parseConsent(value: string | undefined): CookieConsent | null {
  return value === "all" || value === "essential" ? value : null;
}

/** Browser only. */
export function readConsent(): CookieConsent | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return parseConsent(match?.[1]);
}

/** Browser only. */
export function writeConsent(consent: CookieConsent) {
  document.cookie = `${CONSENT_COOKIE}=${consent}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event("hostayo:cookie-consent"));
}
