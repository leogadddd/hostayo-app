"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ChoiceCards,
  type ChoiceCardOption,
} from "@/components/ui/choice-cards";
import { DateInput } from "@/components/ui/date-input";
import { FieldError, Input, Label } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import {
  CAPITAL_CATEGORIES,
  EXPENSE_CATEGORY_HINTS,
} from "@/components/app/expense-category";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { ExpenseCategory, PaymentMethod } from "@/lib/db/schema";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { centavosToPesosInput, formatPHP } from "@/lib/money";
import { CADENCE_LABELS, type Cadence } from "@/lib/recurrence";
import {
  CATEGORY_OPTIONS,
  CLASSIFICATION_OPTIONS,
  FormSection,
  PAYMENT_METHOD_OPTIONS,
  PropertyPicker,
  previewCents,
  type Classification,
} from "../expense-form";
import {
  createRecurringAction,
  updateRecurringAction,
  type RecurringFormState,
} from "./actions";

export interface RecurringFormValues {
  id: string;
  propertyId: string | null;
  unitId: string | null;
  description: string;
  category: string;
  classification: "operating" | "capital";
  payee: string | null;
  paymentMethod: PaymentMethod | null;
  amountCents: number;
  cadence: Cadence;
  nextDueDate: string;
  endDate: string | null;
}

const CADENCE_OPTIONS: ChoiceCardOption<Cadence>[] = [
  { value: "weekly", label: CADENCE_LABELS.weekly, icon: CalendarDays },
  { value: "monthly", label: CADENCE_LABELS.monthly, icon: CalendarRange },
  { value: "yearly", label: CADENCE_LABELS.yearly, icon: CalendarClock },
];

const CADENCE_NOUN: Record<Cadence, string> = {
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

const WHOLE_PROPERTY = "whole";

export function RecurringForm({
  properties,
  unitsByProperty,
  defaultDueDate,
  recurring,
  doneHref = "/expenses/recurring",
}: {
  properties: { id: string; name: string }[];
  unitsByProperty: Record<string, { id: string; name: string }[]>;
  defaultDueDate: string;
  recurring?: RecurringFormValues;
  doneHref?: string;
}) {
  const router = useRouter();
  const editing = Boolean(recurring);
  const [state, formAction, pending] = useActionState<
    RecurringFormState,
    FormData
  >(async (previous, formData) => {
    const result = recurring
      ? await updateRecurringAction(recurring.id, previous, formData)
      : await createRecurringAction(previous, formData);
    if (result.success) {
      toast.success(
        editing ? "Recurring bill updated." : "Recurring bill added.",
      );
      router.replace(doneHref);
      router.refresh();
    }
    return result;
  }, {});
  useActionFeedback(state);

  const [amount, setAmount] = useState(
    recurring ? centavosToPesosInput(recurring.amountCents) : "",
  );
  const [cadence, setCadence] = useState<Cadence>(
    recurring?.cadence ?? "monthly",
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    (recurring?.category as ExpenseCategory | undefined) ?? "subscriptions",
  );
  const [classification, setClassification] = useState<Classification>(
    recurring?.classification ?? "operating",
  );
  // Picking a category suggests its type until the type is chosen by hand.
  const [classificationTouched, setClassificationTouched] = useState(editing);
  const [propertyId, setPropertyId] = useState(
    recurring
      ? (recurring.propertyId ?? "")
      : properties.length === 1
        ? properties[0]!.id
        : "",
  );
  const [unitId, setUnitId] = useState(recurring?.unitId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(
    recurring?.paymentMethod ?? "",
  );
  const [description, setDescription] = useState(recurring?.description ?? "");

  const unitOptions = unitsByProperty[propertyId] ?? [];
  const cents = previewCents(amount);

  const chooseCategory = (next: ExpenseCategory) => {
    setCategory(next);
    if (!classificationTouched)
      setClassification(CAPITAL_CATEGORIES.has(next) ? "capital" : "operating");
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="cadence" value={cadence} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="classification" value={classification} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="unitId" value={unitId} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Label htmlFor="rec-description">Bill</Label>
          <Input
            id="rec-description"
            name="description"
            required
            minLength={2}
            maxLength={300}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Netflix, Condo dues, Internet"
            autoFocus={!editing}
            className="h-12 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="rec-amount">Usual amount</Label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-xl text-ink/45"
              aria-hidden
            >
              ₱
            </span>
            <Input
              id="rec-amount"
              name="amountPesos"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className="h-12 rounded-xl pl-9 font-display text-2xl tabular-nums text-pine"
            />
          </div>
        </div>
      </div>

      <FormSection title="Schedule">
        <ChoiceCards
          aria-label="Repeats"
          columns={3}
          value={cadence}
          onChange={setCadence}
          options={CADENCE_OPTIONS}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="rec-due">
              {editing ? "Next due date" : "First due date"}
            </Label>
            <DateInput
              id="rec-due"
              name="dueDate"
              defaultValue={recurring?.nextDueDate ?? defaultDueDate}
              today={defaultDueDate}
              required
            />
          </div>
          <div>
            <Label htmlFor="rec-end">Ends (optional)</Label>
            <DateInput
              id="rec-end"
              name="endDate"
              defaultValue={recurring?.endDate ?? ""}
              today={defaultDueDate}
              clearable
              placeholder="Keeps going"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="What is it for?">
        <ChoiceCards
          aria-label="Category"
          variant="tile"
          columns={5}
          value={category}
          onChange={chooseCategory}
          options={CATEGORY_OPTIONS}
        />
        <p className="mt-2 text-xs text-ink/55">
          {EXPENSE_CATEGORY_HINTS[category]}
        </p>
        <div className="mt-4">
          <p
            id="rec-classification"
            className="mb-1.5 text-sm font-medium text-ink"
          >
            Type
          </p>
          <ChoiceCards
            aria-labelledby="rec-classification"
            value={classification}
            onChange={(next) => {
              setClassification(next);
              setClassificationTouched(true);
            }}
            options={CLASSIFICATION_OPTIONS}
          />
        </div>
      </FormSection>

      <FormSection
        title="Where"
        hint="Leave it on the whole business for bills that aren’t tied to one place."
      >
        <PropertyPicker
          properties={properties}
          value={propertyId}
          onChange={(next) => {
            setPropertyId(next);
            setUnitId("");
          }}
        />
        {propertyId && unitOptions.length ? (
          <div className="mt-3">
            <Label htmlFor="rec-unit">Unit</Label>
            <SelectMenu
              id="rec-unit"
              value={unitId || WHOLE_PROPERTY}
              onChange={(next) =>
                setUnitId(next === WHOLE_PROPERTY ? "" : next)
              }
              options={[
                {
                  value: WHOLE_PROPERTY,
                  label: "Whole property",
                  description: "Shared across every unit",
                },
                ...unitOptions.map((unit) => ({
                  value: unit.id,
                  label: unit.name,
                })),
              ]}
            />
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Payment">
        <div>
          <Label htmlFor="rec-payee">Paid to (optional)</Label>
          <Input
            id="rec-payee"
            name="payee"
            maxLength={120}
            defaultValue={recurring?.payee ?? ""}
            placeholder="e.g. Netflix, Meralco"
          />
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p id="rec-method" className="text-sm font-medium text-ink">
              Paid via (optional)
            </p>
            {paymentMethod ? (
              <button
                type="button"
                onClick={() => setPaymentMethod("")}
                className="text-xs text-ink/55 hover:text-pine hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
          <ChoiceCards
            aria-labelledby="rec-method"
            columns={4}
            value={paymentMethod as PaymentMethod}
            onChange={(next) =>
              setPaymentMethod(next === paymentMethod ? "" : next)
            }
            options={PAYMENT_METHOD_OPTIONS}
          />
        </div>
      </FormSection>

      <div className="space-y-3 border-t border-pine/10 pt-5">
        <p className="text-sm text-ink/60" aria-live="polite">
          {cents ? (
            <>
              <span className="font-medium text-pine">{formatPHP(cents)}</span>{" "}
              every {CADENCE_NOUN[cadence]}
              {description.trim() ? ` for ${description.trim()}` : ""} (
              {EXPENSE_CATEGORY_LABELS[category].toLowerCase()}
              {paymentMethod
                ? `, via ${PAYMENT_METHOD_LABELS[paymentMethod]}`
                : ""}
              ).
            </>
          ) : (
            "Enter the usual amount to set up this bill."
          )}{" "}
          It never posts on its own: when it’s due you confirm the amount or
          skip that {CADENCE_NOUN[cadence]}.
        </p>
        <FieldError message={state.error} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="clay" disabled={pending}>
            {pending
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Add recurring bill"}
          </Button>
          <Link
            href={doneHref}
            replace
            className="text-sm text-pine hover:underline"
          >
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
