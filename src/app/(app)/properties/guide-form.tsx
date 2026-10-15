"use client";

import { useActionState, useRef, useState } from "react";
import { BookOpenText, Check } from "@/components/ui/icons";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { useSaveAndReturn } from "@/hooks/use-save-and-return";
import { cn } from "@/lib/utils";
import type { InventoryFormState } from "./actions";
import { AreaTipsField, type AreaTip } from "./area-tips-field";
import { FormAside, FormLayout, FormSection } from "./form-kit";

export interface GuideFormValues {
  description: string;
  wifiName: string;
  wifiPassword: string;
  /** One entry per line. */
  houseRules: string;
  arrivalNotes: string;
  checkoutSteps: string;
  areaTips: AreaTip[];
}

const lineCount = (value: string) =>
  value.split(/\r?\n/).filter((line) => line.trim()).length;

/**
 * What a unit's guests read, on a page of its own: the description, Wi-Fi,
 * house rules, how to arrive, check-out steps and nearby tips. A checklist
 * beside the form shows what guests will see.
 */
export function UnitGuideForm({
  action,
  destination,
  successMessage,
  values,
  unitName,
  propertyName,
  cancelHref,
  cancelLabel,
  submitLabel = "Save guide",
}: {
  action: (
    state: InventoryFormState,
    formData: FormData,
  ) => Promise<InventoryFormState>;
  destination: string | ((result: InventoryFormState) => string);
  successMessage: string;
  values: GuideFormValues;
  unitName: string;
  propertyName: string;
  cancelHref: string;
  cancelLabel?: string;
  submitLabel?: string;
}) {
  const save = useSaveAndReturn(action, destination, successMessage);
  const [state, formAction, pending] = useActionState<
    InventoryFormState,
    FormData
  >(save, {});
  useActionFeedback(state);
  const formRef = useRef<HTMLFormElement>(null);

  // Counts for the checklist, read from the form as it's edited.
  const summarize = (form: HTMLFormElement | null) => {
    const data = new FormData(form ?? undefined);
    const text = (key: string) => String(data.get(key) ?? "");
    return {
      description: text("description").trim().length > 0,
      wifi: text("wifiName").trim().length > 0,
      rules: lineCount(text("houseRules")),
      arrival: lineCount(text("arrivalNotes")),
      checkout: lineCount(text("checkoutSteps")),
      tips: data.getAll("areaTipTitle").filter((t) => String(t).trim()).length,
    };
  };
  const [summary, setSummary] = useState(() => ({
    description: values.description.trim().length > 0,
    wifi: values.wifiName.trim().length > 0,
    rules: lineCount(values.houseRules),
    arrival: lineCount(values.arrivalNotes),
    checkout: lineCount(values.checkoutSteps),
    tips: values.areaTips.filter((tip) => tip.title.trim()).length,
  }));
  const refresh = () =>
    setTimeout(() => setSummary(summarize(formRef.current)), 0);

  const items: { label: string; done: boolean; detail?: string }[] = [
    { label: "Description", done: summary.description },
    { label: "Wi-Fi", done: summary.wifi },
    {
      label: "House rules",
      done: summary.rules > 0,
      detail: summary.rules ? String(summary.rules) : undefined,
    },
    {
      label: "How to arrive",
      done: summary.arrival > 0,
      detail: summary.arrival ? String(summary.arrival) : undefined,
    },
    {
      label: "Check-out steps",
      done: summary.checkout > 0,
      detail: summary.checkout ? String(summary.checkout) : undefined,
    },
    {
      label: "Nearby tips",
      done: summary.tips > 0,
      detail: summary.tips ? String(summary.tips) : undefined,
    },
  ];
  const doneCount = items.filter((item) => item.done).length;

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={refresh}
      onChange={refresh}
      onClick={refresh}
    >
      <FormLayout
        aside={
          <FormAside
            preview={
              <div className="p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-mist px-2.5 py-0.5 text-xs font-medium text-pine">
                  <BookOpenText className="h-3.5 w-3.5" aria-hidden />
                  Guest guide
                </span>
                <p className="mt-3 truncate font-display text-2xl text-pine">
                  {unitName}
                </p>
                <p className="mt-0.5 truncate text-sm text-ink/55">
                  {propertyName}
                </p>
                <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink/45">
                  What guests will see
                </p>
                <ul className="mt-2 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                          item.done
                            ? "bg-moss text-white"
                            : "border border-pine/20 text-transparent",
                        )}
                      >
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      <span className={item.done ? "text-pine" : "text-ink/50"}>
                        {item.label}
                      </span>
                      {item.detail ? (
                        <span className="ml-auto text-xs tabular-nums text-ink/45">
                          {item.detail}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-ink/50">
                  {doneCount} of {items.length} filled in. Everything is
                  optional.
                </p>
              </div>
            }
            error={state.error}
            pending={pending}
            submitLabel={submitLabel}
            pendingLabel="Saving…"
            cancelHref={cancelHref}
            cancelLabel={cancelLabel}
          />
        }
      >
        <FormSection
          title="About this place"
          description="Shown on the unit's public page and your guest's welcome page."
        >
          <Label htmlFor="unit-description" className="sr-only">
            Description
          </Label>
          <Textarea
            id="unit-description"
            name="description"
            defaultValue={values.description}
            maxLength={2000}
            placeholder="What makes this place nice to stay in: the view, the bed, who it suits…"
            className="min-h-32"
          />
        </FormSection>

        <FormSection
          title="Wi-Fi"
          description="Guests see this as a card with a copy button."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="unit-wifi-name">Network name</Label>
              <Input
                id="unit-wifi-name"
                name="wifiName"
                defaultValue={values.wifiName}
                maxLength={80}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="unit-wifi-password">Password</Label>
              <Input
                id="unit-wifi-password"
                name="wifiPassword"
                defaultValue={values.wifiPassword}
                maxLength={120}
                autoComplete="off"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="House rules"
          description="One rule per line. You can paste a bulleted list."
        >
          <Label htmlFor="unit-house-rules" className="sr-only">
            House rules
          </Label>
          <Textarea
            id="unit-house-rules"
            name="houseRules"
            defaultValue={values.houseRules}
            placeholder={
              "Check-in 3:00 PM, check-out 11:00 AM\nNo smoking inside\nQuiet hours 10:00 PM to 7:00 AM"
            }
            className="min-h-36"
          />
        </FormSection>

        <FormSection
          title="Arriving and leaving"
          description="One step per line."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label htmlFor="unit-arrival-notes">How to arrive</Label>
              <Textarea
                id="unit-arrival-notes"
                name="arrivalNotes"
                defaultValue={values.arrivalNotes}
                placeholder={
                  "Tell the guard your name at the lobby\nTake the elevator to the 12th floor"
                }
                className="min-h-32"
              />
            </div>
            <div>
              <Label htmlFor="unit-checkout-steps">Before you check out</Label>
              <Textarea
                id="unit-checkout-steps"
                name="checkoutSteps"
                defaultValue={values.checkoutSteps}
                placeholder={
                  "Turn off the aircon and lights\nLeave the key card on the table"
                }
                className="min-h-32"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Nearby tips"
          description="Places guests will want to know about: shops, food, transport."
        >
          <AreaTipsField defaultTips={values.areaTips} />
        </FormSection>
      </FormLayout>
    </form>
  );
}
