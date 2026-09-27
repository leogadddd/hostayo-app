import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { TwoFactorSetup } from "./two-factor-setup";

export const metadata: Metadata = { title: "Set up two-factor authentication" };

/** Its own full-screen flow, outside the app shell: scan, verify, save recovery codes. */
export default async function TwoFactorSetupPage() {
  const user = await requireUser();
  if (user.twoFactorEnabled) redirect("/settings/security");
  return <TwoFactorSetup email={user.email} />;
}
