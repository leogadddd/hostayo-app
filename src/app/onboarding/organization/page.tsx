import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOnboardingState, guardOnboardingStep } from "../state";
import { OrganizationForm } from "./organization-form";
import { InfoTip } from "@/components/ui/info-tip";

export const metadata: Metadata = { title: "Name your business" };

export default async function OnboardingOrganizationPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  const redirectTo = guardOnboardingStep(state, "organization");
  if (redirectTo) redirect(redirectTo);

  return (
    <div>
      <h1 className="animate-rise font-display text-4xl text-pine">
        What’s your business called?
        <InfoTip className="ml-2">
          You can add a logo and contact details later in Settings.
        </InfoTip>
      </h1>
      <div className="animate-rise mt-8" style={{ animationDelay: "180ms" }}>
        <OrganizationForm
          defaultName={state.membership?.organizationName ?? ""}
        />
      </div>
    </div>
  );
}
