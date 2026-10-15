/** The public marketing site. The logo on public pages (legal) leads here, not into the app. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://hostayo.casa";

/** This app's own origin, used for canonical URLs, the sitemap and structured data. */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.hostayo.casa";

/** Public pages that belong in the sitemap and the llms.txt map. */
export const PUBLIC_PAGES = [
  {
    path: "/login",
    title: "Sign in",
    description: "Sign in to your Hostayo workspace.",
  },
  {
    path: "/register",
    title: "Create your account",
    description:
      "Create a Hostayo account (may be invite-only during early access).",
  },
  {
    path: "/terms",
    title: "Terms and Conditions",
    description: "Terms for using Hostayo.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy",
    description: "How Hostayo handles personal data.",
  },
  {
    path: "/refunds",
    title: "Refund Policy",
    description: "How refunds work for Hostayo.",
  },
  {
    path: "/cookies",
    title: "Cookie Policy",
    description: "The cookies Hostayo uses and why.",
  },
] as const;

/** A site-relative path as a full URL, for places that need one (JSON-LD, link previews). */
export function absoluteUrl(value: string): string {
  return value.startsWith("/") ? `${APP_URL}${value}` : value;
}
