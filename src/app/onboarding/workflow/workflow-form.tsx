"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldError } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  BOOKING_SOURCE_OPTIONS,
  CURRENT_TOOL_OPTIONS,
  TEAM_SIZE_OPTIONS,
  type BookingSource,
  type CurrentTool,
  type TeamSize,
} from "@/lib/onboarding-profile";
import { cn } from "@/lib/utils";
import { saveWorkflowAction, type OnboardingFormState } from "../actions";
import { StepNav } from "../step-nav";

export function WorkflowForm({
  defaults,
}: {
  defaults: {
    sources: BookingSource[];
    teamSize?: TeamSize;
    currentTool?: CurrentTool;
  };
}) {
  const [state, formAction, pending] = useActionState<
    OnboardingFormState,
    FormData
  >(saveWorkflowAction, {});
  useActionFeedback(state, { errorTitle: "Couldn’t save your answers" });
  const [sources, setSources] = useState<BookingSource[]>(defaults.sources);
  const [teamSize, setTeamSize] = useState(defaults.teamSize ?? "solo");
  const [currentTool, setCurrentTool] = useState(
    defaults.currentTool ?? "spreadsheet",
  );
  const router = useRouter();
  useEffect(() => {
    if (!state.success) return;
    router.replace("/onboarding/welcome");
    router.refresh();
  }, [state.success, router]);

  function toggle(source: BookingSource) {
    setSources((current) =>
      current.includes(source)
        ? current.filter((value) => value !== source)
        : [...current, source],
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="teamSize" value={teamSize} />
      <input type="hidden" name="currentTool" value={currentTool} />
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-pine">
          Where do your bookings come from?{" "}
          <span className="font-normal text-ink/45">(pick all that apply)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {BOOKING_SOURCE_OPTIONS.map((option) => {
            const checked = sources.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sage",
                  checked
                    ? "border-pine bg-pine text-white"
                    : "border-pine/15 bg-linen text-pine hover:border-pine/40",
                )}
              >
                <input
                  type="checkbox"
                  name="sources"
                  value={option.value}
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div>
        <p id="team-size-label" className="mb-3 text-sm font-medium text-pine">
          Who helps you run it?
        </p>
        <ChoiceCards
          aria-labelledby="team-size-label"
          value={teamSize}
          onChange={setTeamSize}
          options={TEAM_SIZE_OPTIONS}
          columns={3}
        />
      </div>
      <div>
        <p
          id="current-tool-label"
          className="mb-3 text-sm font-medium text-pine"
        >
          What do you use to keep track today?
        </p>
        <ChoiceCards
          aria-labelledby="current-tool-label"
          value={currentTool}
          onChange={setCurrentTool}
          options={CURRENT_TOOL_OPTIONS}
          columns={4}
        />
      </div>
      <FieldError message={state.error} />

      <StepNav backHref="/onboarding/operation">
        <Button type="submit" variant="clay" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Next"}
          {pending ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </StepNav>
    </form>
  );
}
