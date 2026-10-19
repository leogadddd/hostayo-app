import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth/session";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Workspace blocked" };

/** Where a member lands when every workspace they belong to has been blocked. */
export default async function WorkspaceBlockedPage() {
  await requireUser();
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@hostayo.casa";
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5">
      <main className="w-full max-w-md text-center">
        <Logo className="mx-auto h-8 w-32" />
        <h1 className="mt-8 font-display text-3xl text-pine">
          This workspace is blocked
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          Access to your workspace has been paused. Contact{" "}
          <a className="underline underline-offset-4" href={`mailto:${email}`}>
            {email}
          </a>{" "}
          if you think this is a mistake.
        </p>
        <SignOutButton />
      </main>
    </div>
  );
}
