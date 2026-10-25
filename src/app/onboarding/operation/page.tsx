import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOnboardingState, guardOnboardingStep } from "../state";
import { OperationForm } from "./operation-form";

export const metadata: Metadata = { title: "About your business" };

export default async function OnboardingOperationPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  const redirectTo = guardOnboardingStep(state, "operation");
  if (redirectTo) redirect(redirectTo);

  return (
    <div>
      <h1 className="animate-rise font-display text-4xl text-pine">
        How big is your business?
      </h1>
      <p
        className="animate-rise mt-3 max-w-xl text-base text-ink/65"
        style={{ animationDelay: "80ms" }}
      >
        A rough idea is enough. It helps us set up your checklist.
      </p>
      <div className="animate-rise mt-8" style={{ animationDelay: "160ms" }}>
        <OperationForm
          defaults={{
            unitCount: state.profile?.unitCount,
            monthlyBookings: state.profile?.monthlyBookings,
          }}
        />
      </div>
    </div>
  );
}
