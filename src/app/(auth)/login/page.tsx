import type { Metadata } from "next";
import LoginPage from "./login-content";
import { registrationDisabled, registrationInviteOnly } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Hostayo, booking and operations software for short-stay hosts in the Philippines.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
};

// Read the flags per request so toggling the env vars needs no rebuild.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <LoginPage
      registration={
        registrationDisabled()
          ? "closed"
          : registrationInviteOnly()
            ? "invite-only"
            : "open"
      }
    />
  );
}
