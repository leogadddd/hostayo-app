import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The cookies Hostayo uses and why.",
};

const sections: LegalSection[] = [
  {
    title: "1. What cookies are",
    content:
      "Cookies are small text files that a website stores in your browser. Hostayo uses a small number of them to keep you signed in and to remember your choices.",
  },
  {
    title: "2. Cookies we use to keep you signed in",
    content:
      "When you sign in, our authentication system sets a session cookie so you stay signed in as you move between pages. If you turn on two-factor sign-in, a short-lived cookie is also used while you complete the verification step. These cookies are essential: without them you cannot sign in, and they are removed when you sign out or the session expires.",
  },
  {
    title: "3. Cookies that remember your choices",
    content:
      "Hostayo remembers which organization you last opened (the cookie hostayo_active_organization_id), which is needed for the app to open the right workspace. If you choose Accept all, it also remembers your appearance setting of light, dark or system (the cookie hostayo-theme). Both are kept for up to one year. The theme cookie is stored per device and is not saved to your account. If you choose Essential only, your theme is not remembered between visits.",
  },
  {
    title: "4. Analytics cookies",
    content:
      "If you choose Accept all, Hostayo and our website (hostayo.casa) use Google Analytics to understand how the service is used, such as which pages are visited and how people reach us. Google Analytics sets cookies in your browser (named _ga and _ga_ followed by an identifier) and receives information such as your approximate location and device details. We do not load it unless you accept. If you choose Essential only, it is never loaded.",
  },
  {
    title: "5. Cookies we do not use",
    content:
      "Hostayo does not use advertising cookies, and we do not sell or share cookie data for advertising. We do not use any other third-party tracking cookies.",
  },
  {
    title: "6. Your cookie choice",
    content:
      "The first time you visit, we ask whether to allow preference and analytics cookies or keep to essential cookies only. We remember your answer in a cookie named hostayo-cookie-consent, kept for one year. To change your mind, delete your Hostayo cookies in your browser settings and the question will appear again.",
  },
  {
    title: "7. Managing cookies",
    content:
      "You can block or delete cookies in your browser settings. Because the sign-in cookies are essential, blocking them will stop you from signing in. Deleting the choice cookies, including any Google Analytics cookies, simply resets Hostayo to the light theme and your default organization.",
  },
  {
    title: "8. Changes to this policy",
    content:
      "We may update this policy from time to time. If we make a material change, we will update the effective date and provide notice through Hostayo or another reasonable channel.",
  },
  {
    title: "9. Contact",
    content: `For questions about cookies or this policy, contact the Hostayo team at ${SUPPORT_EMAIL}.`,
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="The few cookies Hostayo uses, what each one does and how you can control them."
      effectiveDate="October 4, 2026"
      sections={sections}
    />
  );
}
