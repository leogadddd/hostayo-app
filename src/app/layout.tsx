import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { HostayoToaster } from "@/components/ui/sonner";
import { parseThemePreference, THEME_COOKIE } from "@/lib/theme";
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
  const theme = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme} className={`${inter.variable} ${montserrat.variable}`}>
      <body>
        {children}
        <HostayoToaster />
      </body>
    </html>
  );
}
