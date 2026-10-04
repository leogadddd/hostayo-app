import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { HostayoToaster } from "@/components/ui/sonner";
import { parseThemePreference, THEME_COOKIE } from "@/lib/theme";
import { Analytics } from "@/components/analytics";
import { CookieBanner } from "@/components/cookie-banner";
import { CONSENT_COOKIE, parseConsent } from "@/lib/cookie-consent";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hostayo",
    template: "%s · Hostayo",
  },
  description:
    "A calmer way to run your stays. Bookings, payments, turnovers and expenses for small stay operators.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const theme = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);
  const answered = parseConsent(cookieStore.get(CONSENT_COOKIE)?.value) !== null;
  return (
    <html lang="en" data-theme={theme} className={`${inter.variable} ${montserrat.variable}`}>
      <body>
        {children}
        <HostayoToaster />
        <CookieBanner answered={answered} />
        <Analytics />
      </body>
    </html>
  );
}
