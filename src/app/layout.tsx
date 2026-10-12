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

const TITLE = "Hostayo — a calmer way to run your stays";
const DESCRIPTION =
  "Bookings, payments, turnovers and expenses for short-stay hosts in the Philippines.";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.hostayo.casa"),
  applicationName: "Hostayo",
  title: {
    default: TITLE,
    template: "%s · Hostayo",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Hostayo",
    locale: "en_PH",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const theme = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);
  const answered =
    parseConsent(cookieStore.get(CONSENT_COOKIE)?.value) !== null;
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} ${montserrat.variable}`}
    >
      <body>
        {children}
        <HostayoToaster />
        <CookieBanner answered={answered} />
        <Analytics />
      </body>
    </html>
  );
}
