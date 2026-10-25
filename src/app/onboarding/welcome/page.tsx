import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle as CircleCheck } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getOnboardingState, nextOnboardingPath } from "../state";
import { StepNav } from "../step-nav";

export const metadata: Metadata = { title: "Welcome to Hostayo" };

export default async function OnboardingWelcomePage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  if (!state.membership) redirect("/onboarding/organization");
  if (state.membership.role !== "owner") redirect("/dashboard");
  const next = nextOnboardingPath(state);
  if (next !== "/onboarding/welcome") redirect(next);

  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div>
      <CircleCheck className="animate-rise h-10 w-10 text-moss" aria-hidden />
      <h1
        className="animate-rise mt-5 font-display text-4xl leading-tight text-pine sm:text-5xl"
        style={{ animationDelay: "60ms" }}
      >
        You’re all set{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p
        className="animate-rise mt-3 max-w-xl text-base leading-relaxed text-ink/65"
        style={{ animationDelay: "120ms" }}
      >
        Your dashboard has a checklist to get {state.membership.organizationName}{" "}
        ready: add your property and units, then go live when you’re happy with
        your public page.
      </p>

      <StepNav backHref="/onboarding/workflow">
        <Link
          href="/dashboard"
          replace
          className={buttonClassName("clay", "lg")}
        >
          Go to dashboard
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </StepNav>
    </div>
  );
}
