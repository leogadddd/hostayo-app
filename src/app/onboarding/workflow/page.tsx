import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOnboardingState, guardOnboardingStep } from "../state";
import { WorkflowForm } from "./workflow-form";

export const metadata: Metadata = { title: "How you work today" };

export default async function OnboardingWorkflowPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  const redirectTo = guardOnboardingStep(state, "workflow");
  if (redirectTo) redirect(redirectTo);

  return (
    <div>
      <h1 className="animate-rise font-display text-4xl text-pine">
        How do you work today?
      </h1>
      <div className="animate-rise mt-8" style={{ animationDelay: "160ms" }}>
        <WorkflowForm
          defaults={{
            sources: state.profile?.sources ?? [],
            teamSize: state.profile?.teamSize,
            currentTool: state.profile?.currentTool,
          }}
        />
      </div>
    </div>
  );
}
