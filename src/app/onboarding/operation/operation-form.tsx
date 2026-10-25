"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FieldError } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  MONTHLY_BOOKINGS_OPTIONS,
  UNIT_COUNT_OPTIONS,
  type MonthlyBookingsBand,
  type UnitCountBand,
} from "@/lib/onboarding-profile";
import { saveOperationAction, type OnboardingFormState } from "../actions";
import { StepNav } from "../step-nav";

export function OperationForm({
  defaults,
}: {
  defaults: { unitCount?: UnitCountBand; monthlyBookings?: MonthlyBookingsBand };
}) {
  const [state, formAction, pending] = useActionState<
    OnboardingFormState,
    FormData
  >(saveOperationAction, {});
  useActionFeedback(state, { errorTitle: "Couldn’t save your answers" });
  const [unitCount, setUnitCount] = useState(defaults.unitCount ?? "1");
  const [monthlyBookings, setMonthlyBookings] = useState(
    defaults.monthlyBookings ?? "5-20",
  );
  const router = useRouter();
  useEffect(() => {
    if (!state.success) return;
    router.replace("/onboarding/workflow");
    router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="unitCount" value={unitCount} />
      <input type="hidden" name="monthlyBookings" value={monthlyBookings} />
      <div>
        <p id="unit-count-label" className="mb-3 text-sm font-medium text-pine">
          How many units do you rent out?
        </p>
        <ChoiceCards
          aria-labelledby="unit-count-label"
          value={unitCount}
          onChange={setUnitCount}
          options={UNIT_COUNT_OPTIONS}
          columns={4}
        />
      </div>
      <div>
        <p
          id="monthly-bookings-label"
          className="mb-3 text-sm font-medium text-pine"
        >
          About how many bookings do you get a month?
        </p>
        <ChoiceCards
          aria-labelledby="monthly-bookings-label"
          value={monthlyBookings}
          onChange={setMonthlyBookings}
          options={MONTHLY_BOOKINGS_OPTIONS}
          columns={4}
        />
      </div>
      <FieldError message={state.error} />

      <StepNav backHref="/onboarding/organization">
        <Button type="submit" variant="clay" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Next"}
          {pending ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </StepNav>
    </form>
  );
}
