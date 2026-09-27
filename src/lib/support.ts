/** Where people reach the StayOps team. Shown in Settings → Support and on the legal pages. */
export const SUPPORT_EMAIL = "support@stayops.leogadil.online";
export const SUPPORT_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61594931963512";
export const SUPPORT_INSTAGRAM_URL = "https://www.instagram.com/stayopsph/";
export const SUPPORT_INSTAGRAM_HANDLE = "@stayopsph";

export const PROBLEM_CATEGORIES = [
  { value: "bug", label: "Something isn’t working" },
  { value: "question", label: "I have a question" },
  { value: "idea", label: "Feature idea" },
  { value: "account", label: "Account or access" },
  { value: "privacy", label: "Privacy or data request" },
] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number]["value"];

export interface ProblemReportContext {
  name: string;
  email: string;
  organizationName: string;
  organizationId: string;
  role: string;
  version: string;
}

/**
 * Builds a mailto link carrying the report and the context we'd otherwise
 * have to ask for, so a report is useful on the first message.
 */
export function problemReportMailto({ category, page, details, context, browser }: {
  category: ProblemCategory;
  page: string;
  details: string;
  context: ProblemReportContext;
  browser: string;
}): string {
  const label = PROBLEM_CATEGORIES.find((item) => item.value === category)?.label ?? category;
  const subject = `[StayOps] ${label}${page ? ` — ${page}` : ""}`;
  const body = [
    details.trim(),
    "",
    "———",
    `Where: ${page || "Not specified"}`,
    `From: ${context.name} <${context.email}>`,
    `Organization: ${context.organizationName} (${context.organizationId})`,
    `Role: ${context.role}`,
    `StayOps version: ${context.version}`,
    `Browser: ${browser}`,
    `Sent: ${new Date().toISOString()}`,
  ].join("\n");
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
