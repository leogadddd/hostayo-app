import Link from "next/link";
import { ArrowRight, MailPlus } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";
import type { RegistrationInviteStatus } from "@/server/registration/service";

const REASONS: Record<
  Exclude<RegistrationInviteStatus, "valid"> | "missing" | "unavailable",
  string
> = {
  missing:
    "We’re opening Hostayo to a small group of hosts first. Ask for early access and we’ll send you a personal invite link.",
  used: "This invite link has already been used. If that was you, sign in. Otherwise ask us for a new link.",
  expired: "This invite link has expired. Ask us for a new one.",
  revoked: "This invite link is no longer active. Ask us for a new one.",
  invalid:
    "This invite link isn’t valid. Check that you opened the whole link, or ask us for a new one.",
  unavailable:
    "We couldn’t check this invite link just now. Please try again in a moment.",
};

/** Shown instead of the sign-up form when registration is invite-only and the visitor has no working invite. */
export function InviteOnlyNotice({ status }: { status: keyof typeof REASONS }) {
  return (
    <div>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sage/60 text-pine">
        <MailPlus className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-3xl text-pine">
        Hostayo is invite-only for now
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {REASONS[status]}
      </p>
      <a
        href={`${SITE_URL.replace(/\/$/, "")}/#early-access`}
        className={buttonClassName(
          "primary",
          "md",
          "mt-8 h-12 w-full text-base sm:h-10 sm:text-sm",
        )}
      >
        Get early access
        <ArrowRight className="h-4 w-4" aria-hidden />
      </a>
      <p className="mt-4 text-center text-xs leading-relaxed text-ink/55">
        Joining someone’s team? Open the invitation link they sent you.
      </p>

      <p className="mt-8 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-pine underline underline-offset-4 hover:text-pine-soft"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
