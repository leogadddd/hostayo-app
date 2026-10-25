"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { BookingSettings } from "@/server/orgs/service";
import { saveBookingSettingsAction, type OrgFormState } from "../actions";
import { SettingsSaveBar } from "../settings-save-bar";

export function BookingSettingsForm({
  settings,
}: {
  settings: BookingSettings;
}) {
  const [state, formAction, pending] = useActionState<OrgFormState, FormData>(
    saveBookingSettingsAction,
    {},
  );
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  useActionFeedback(state, { success: "Booking settings saved." });
  useEffect(() => {
    if (state.success) {
      setDirty(false);
      router.refresh();
    }
  }, [state.success, router]);
  const saveBarVisible = dirty || pending || Boolean(state.error);

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className={saveBarVisible ? "space-y-8 pb-24" : "space-y-8"}
    >
      <div>
        <h2 className="font-display text-xl text-pine">Booking rules</h2>
        <div className="mt-4 max-w-xs">
          <Label
            htmlFor="minStayNights"
            info={
              <>
                The shortest stay you accept on direct bookings. Bookings from
                Airbnb, Booking.com and other platforms follow their own rules
                and aren’t checked. Use 1 for no minimum.
              </>
            }
          >
            Minimum stay (nights)
          </Label>
          <Input
            id="minStayNights"
            name="minStayNights"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            required
            defaultValue={settings.minStayNights}
          />
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl text-pine">Public page content</h2>
        <p className="mt-1 text-sm text-ink/60">
          Shown on your public page once you go live.
        </p>
        <div className="mt-4 space-y-5">
          <div>
            <Label htmlFor="aboutText">About your business</Label>
            <Textarea
              id="aboutText"
              name="aboutText"
              rows={5}
              maxLength={2000}
              defaultValue={settings.aboutText}
              placeholder="Who you are, what guests can expect, what makes your place special."
            />
          </div>
          <div>
            <Label htmlFor="cancellationPolicy">Cancellation policy</Label>
            <Textarea
              id="cancellationPolicy"
              name="cancellationPolicy"
              rows={4}
              maxLength={2000}
              defaultValue={settings.cancellationPolicy}
              placeholder="e.g. Free cancellation up to 7 days before check-in. The down payment is non-refundable after that."
            />
          </div>
        </div>
      </div>

      <SettingsSaveBar
        visible={saveBarVisible}
        pending={pending}
        error={state.error}
      />
    </form>
  );
}
