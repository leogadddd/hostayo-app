"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Layers, Trophy } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DateInput } from "@/components/ui/date-input";
import { InfoTip } from "@/components/ui/info-tip";
import { FieldError, Input, Label } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { useSaveAndReturn } from "@/hooks/use-save-and-return";
import { MoneyParseError, pesosToCentavos } from "@/lib/money";
import {
  ADJUSTMENT_LABELS,
  type AdjustmentType,
  type PricingRuleLike,
} from "@/lib/pricing-rules";
import { WEEKDAYS, type Weekday } from "@/lib/rates";
import { cn } from "@/lib/utils";
import type { PricingFormState } from "./actions";
import { PricePreview, type PreviewUnit } from "./price-preview";

export interface RuleFormValues {
  name: string;
  isActive: boolean;
  priority: string;
  stacks: boolean;
  startDate: string;
  endDate: string;
  repeatsYearly: boolean;
  weekdays: Weekday[];
  adjustmentType: AdjustmentType;
  direction: "increase" | "decrease";
  /** Percent, or pesos, as typed. */
  adjustmentAmount: string;
  appliesToAll: boolean;
  propertyIds: string[];
  unitIds: string[];
}

export interface TargetProperty {
  id: string;
  name: string;
  units: { id: string; name: string }[];
}

const TYPE_OPTIONS = [
  {
    value: "percent",
    label: "Percent",
    description: "Raise or lower the rate by a percentage, like +20%.",
  },
  {
    value: "amount",
    label: "Amount",
    description: "Add or subtract a set amount per night, like +₱500.",
  },
  {
    value: "fixed",
    label: "Fixed price",
    description: "Charge a set nightly price whatever the usual rate is.",
  },
] as const satisfies readonly {
  value: AdjustmentType;
  label: string;
  description: string;
}[];

const MODE_OPTIONS = [
  {
    value: "priority",
    label: "Priority",
    description:
      "Competes with other rules. Only the highest priority one that matches a night applies.",
    icon: Trophy,
  },
  {
    value: "stack",
    label: "Stacks",
    description:
      "Always applies on top of the winning rule, such as a weekend surcharge in peak season.",
    icon: Layers,
  },
] as const;

/** The form's values as a rule the preview can price with; unfinished fields count as unset. */
function draftRule(values: RuleFormValues): PricingRuleLike | null {
  const typed = values.adjustmentAmount.trim();
  if (!typed) return null;
  let value: number;
  try {
    value =
      values.adjustmentType === "percent"
        ? Math.round(Number(typed) * 100)
        : pesosToCentavos(typed, { allowZero: true });
  } catch (error) {
    if (error instanceof MoneyParseError) return null;
    throw error;
  }
  if (!Number.isFinite(value)) return null;
  if (values.adjustmentType !== "fixed" && values.direction === "decrease")
    value = -value;
  const hasDates = Boolean(values.startDate && values.endDate);
  return {
    id: "draft",
    name: values.name.trim() || "This rule",
    isActive: true,
    priority: Number(values.priority) || 0,
    stacks: values.stacks,
    startDate: hasDates ? values.startDate : null,
    endDate: hasDates ? values.endDate : null,
    repeatsYearly: hasDates && values.repeatsYearly,
    weekdays: values.weekdays,
    adjustmentType: values.adjustmentType,
    adjustmentValue: value,
    appliesToAll: values.appliesToAll,
    propertyIds: values.propertyIds,
    unitIds: values.unitIds,
  };
}

export function RuleForm({
  action,
  values: initial,
  properties,
  previewUnits,
  otherRules,
  today,
  submitLabel,
  successMessage,
}: {
  action: (
    state: PricingFormState,
    formData: FormData,
  ) => Promise<PricingFormState>;
  values: RuleFormValues;
  properties: TargetProperty[];
  previewUnits: PreviewUnit[];
  /** The organization's other active rules, so the preview shows how this one combines with them. */
  otherRules: PricingRuleLike[];
  today: string;
  submitLabel: string;
  successMessage: string;
}) {
  const save = useSaveAndReturn(action, "/pricing", successMessage);
  const [state, formAction, pending] = useActionState<
    PricingFormState,
    FormData
  >(save, {});
  useActionFeedback(state);
  const [values, setValues] = useState(initial);
  const set = <K extends keyof RuleFormValues>(
    key: K,
    value: RuleFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const draft = useMemo(() => draftRule(values), [values]);
  const previewRules = useMemo(
    () => (draft ? [...otherRules, draft] : otherRules),
    [otherRules, draft],
  );
  const previewTargets = useMemo(
    () =>
      draft
        ? previewUnits.filter(
            (unit) =>
              draft.appliesToAll ||
              draft.unitIds.includes(unit.id) ||
              draft.propertyIds.includes(unit.propertyId),
          )
        : previewUnits,
    [draft, previewUnits],
  );

  const toggleIn = (key: "propertyIds" | "unitIds", id: string) =>
    set(
      key,
      values[key].includes(id)
        ? values[key].filter((existing) => existing !== id)
        : [...values[key], id],
    );
  const toggleWeekday = (day: Weekday) =>
    set(
      "weekdays",
      values.weekdays.includes(day)
        ? values.weekdays.filter((existing) => existing !== day)
        : [...values.weekdays, day],
    );

  const amountLabel =
    values.adjustmentType === "percent"
      ? "Percent"
      : values.adjustmentType === "fixed"
        ? "Nightly price"
        : "Amount per night";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <form action={formAction} className="min-w-0 space-y-5 xl:order-2">
        <input
          type="hidden"
          name="adjustmentType"
          value={values.adjustmentType}
        />
        <input type="hidden" name="direction" value={values.direction} />
        <input type="hidden" name="stacks" value={String(values.stacks)} />
        <input type="hidden" name="isActive" value={String(values.isActive)} />
        <input
          type="hidden"
          name="appliesToAll"
          value={String(values.appliesToAll)}
        />
        <input
          type="hidden"
          name="repeatsYearly"
          value={String(values.repeatsYearly)}
        />
        {values.weekdays.map((day) => (
          <input key={day} type="hidden" name="weekdays" value={day} />
        ))}
        {!values.appliesToAll
          ? values.propertyIds.map((id) => (
              <input key={id} type="hidden" name="propertyIds" value={id} />
            ))
          : null}
        {!values.appliesToAll
          ? values.unitIds.map((id) => (
              <input key={id} type="hidden" name="unitIds" value={id} />
            ))
          : null}

        <Card className="bg-card">
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg text-pine">What it is</h2>
            <div>
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                name="name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. Holy Week, Christmas peak, Weekends"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => set("isActive", event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Rule is on
            </label>
          </CardBody>
        </Card>

        <Card className="bg-card">
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg text-pine">When it applies</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rule-start">First night</Label>
                <DateInput
                  id="rule-start"
                  name="startDate"
                  value={values.startDate}
                  onChange={(date) => set("startDate", date)}
                  clearable
                  placeholder="Any date"
                  today={today}
                />
              </div>
              <div>
                <Label htmlFor="rule-end">Last night</Label>
                <DateInput
                  id="rule-end"
                  name="endDate"
                  value={values.endDate}
                  onChange={(date) => set("endDate", date)}
                  min={
                    values.repeatsYearly
                      ? undefined
                      : values.startDate || undefined
                  }
                  clearable
                  placeholder="Any date"
                  today={today}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={values.repeatsYearly}
                onChange={(event) => set("repeatsYearly", event.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Repeat every year
            </label>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <p className="text-sm font-medium text-ink">
                  Only on these days
                </p>
                <InfoTip>
                  Select none to apply on every day. A night counts on the day
                  it starts, so a Friday check-in&apos;s first night is a Friday
                  night.
                </InfoTip>
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const on = values.weekdays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleWeekday(day.key)}
                      className={cn(
                        "h-9 min-w-12 rounded-lg border px-3 text-sm font-medium transition-colors",
                        on
                          ? "border-pine bg-pine text-white"
                          : "border-pine/20 text-pine hover:bg-pine-mist/60",
                      )}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-card">
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg text-pine">The price change</h2>
            <ChoiceCards
              aria-label="How the price changes"
              value={values.adjustmentType}
              onChange={(type) => set("adjustmentType", type)}
              options={TYPE_OPTIONS}
              columns={3}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {values.adjustmentType !== "fixed" ? (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-ink">
                    Direction
                  </p>
                  <div className="flex gap-2">
                    {(
                      [
                        ["increase", "Raise", ArrowUp],
                        ["decrease", "Lower", ArrowDown],
                      ] as const
                    ).map(([key, label, Icon]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={values.direction === key}
                        onClick={() => set("direction", key)}
                        className={cn(
                          "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                          values.direction === key
                            ? "border-pine bg-pine text-white"
                            : "border-pine/20 text-pine hover:bg-pine-mist/60",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <Label
                  htmlFor="rule-amount"
                  info={
                    <>
                      {ADJUSTMENT_LABELS[values.adjustmentType]}. Applied to
                      each unit&apos;s own rate for the night, including its
                      day-of-week rate.
                    </>
                  }
                >
                  {amountLabel}
                </Label>
                <div className="relative">
                  <Input
                    id="rule-amount"
                    name="adjustmentAmount"
                    inputMode="decimal"
                    value={values.adjustmentAmount}
                    onChange={(event) =>
                      set("adjustmentAmount", event.target.value)
                    }
                    required
                    className={
                      values.adjustmentType === "percent" ? "pr-8" : "pl-8"
                    }
                    placeholder={
                      values.adjustmentType === "percent" ? "20" : "500"
                    }
                  />
                  <span
                    className={cn(
                      "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-ink/45",
                      values.adjustmentType === "percent"
                        ? "right-3"
                        : "left-3",
                    )}
                  >
                    {values.adjustmentType === "percent" ? "%" : "₱"}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-card">
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg text-pine">
              How it combines with other rules
            </h2>
            <ChoiceCards
              aria-label="How it combines"
              value={values.stacks ? "stack" : "priority"}
              onChange={(mode) => set("stacks", mode === "stack")}
              options={MODE_OPTIONS}
            />
            <div className="max-w-48">
              <Label
                htmlFor="rule-priority"
                info={
                  <>
                    Higher numbers win. Use 100 for a regular season and 200 for
                    weekends or holidays that should beat it. Stacking rules
                    apply from the highest priority down.
                  </>
                }
              >
                Priority
              </Label>
              <Input
                id="rule-priority"
                name="priority"
                type="number"
                min={0}
                max={100000}
                step={10}
                value={values.priority}
                onChange={(event) => set("priority", event.target.value)}
                required
              />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-card">
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg text-pine">Where it applies</h2>
            <ChoiceCards
              aria-label="Where it applies"
              value={values.appliesToAll ? "all" : "selected"}
              onChange={(scope) => set("appliesToAll", scope === "all")}
              options={[
                {
                  value: "all",
                  label: "Every unit",
                  description: "Including units you add later.",
                },
                {
                  value: "selected",
                  label: "Chosen properties and units",
                  description: "Tick the ones this rule should price.",
                },
              ]}
            />
            {!values.appliesToAll ? (
              <div className="space-y-3 rounded-lg border border-pine/12 bg-surface p-3">
                {properties.length === 0 ? (
                  <p className="text-sm text-ink/60">No properties yet.</p>
                ) : null}
                {properties.map((property) => {
                  const whole = values.propertyIds.includes(property.id);
                  return (
                    <div key={property.id}>
                      <label className="flex items-center gap-2 text-sm font-medium text-ink">
                        <input
                          type="checkbox"
                          checked={whole}
                          onChange={() => toggleIn("propertyIds", property.id)}
                          className="h-4 w-4 accent-pine"
                        />
                        {property.name}
                        <span className="font-normal text-ink/50">
                          · whole property
                        </span>
                      </label>
                      <div className="ml-6 mt-1.5 space-y-1.5">
                        {property.units.map((unit) => (
                          <label
                            key={unit.id}
                            className={cn(
                              "flex items-center gap-2 text-sm text-ink/80",
                              whole && "opacity-60",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={
                                whole || values.unitIds.includes(unit.id)
                              }
                              disabled={whole}
                              onChange={() => toggleIn("unitIds", unit.id)}
                              className="h-4 w-4 accent-pine"
                            />
                            {unit.name}
                          </label>
                        ))}
                        {property.units.length === 0 ? (
                          <p className="text-xs text-ink/50">No units yet.</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <FieldError message={state.error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
          <Link href="/pricing" className={buttonClassName("ghost", "md")}>
            Cancel
          </Link>
        </div>
      </form>

      <div className="min-w-0 xl:order-1 xl:sticky xl:top-6 xl:self-start">
        <PricePreview
          title="Live preview"
          units={previewTargets.length ? previewTargets : previewUnits}
          rules={previewRules}
          today={today}
        />
      </div>
    </div>
  );
}
