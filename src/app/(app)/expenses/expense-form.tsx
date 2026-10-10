"use client";

import { DateInput } from "@/components/ui/date-input";
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  Hammer,
  ReceiptText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import {
  ChoiceCards,
  type ChoiceCardOption,
} from "@/components/ui/choice-cards";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/select-menu";
import {
  CAPITAL_CATEGORIES,
  EXPENSE_CATEGORY_HINTS,
  EXPENSE_CATEGORY_ICONS,
} from "@/components/app/expense-category";
import { PAYMENT_METHOD_LOGOS } from "@/components/app/payment-method-logo";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { addDaysLocal } from "@/lib/dates";
import type { ExpenseCategory, PaymentMethod } from "@/lib/db/schema";
import { centavosToPesosInput, formatPHP, pesosToCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  createExpenseAction,
  updateExpenseAction,
  type ExpenseFormState,
} from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export interface PropertyOption {
  id: string;
  name: string;
}

/** What the edit page pre-fills; absent when recording a new expense. */
export interface ExpenseFormValues {
  id: string;
  propertyId: string | null;
  unitId: string | null;
  amountCents: number;
  paidDate: string;
  category: string;
  classification: "operating" | "capital";
  payee: string | null;
  paymentMethod: PaymentMethod | null;
  description: string;
  hasReceipt: boolean;
}

type Classification = "operating" | "capital";

const CATEGORY_OPTIONS: ChoiceCardOption<ExpenseCategory>[] = (
  Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]
).map((category) => ({
  value: category,
  label: EXPENSE_CATEGORY_LABELS[category],
  icon: EXPENSE_CATEGORY_ICONS[category],
}));

const CLASSIFICATION_OPTIONS: ChoiceCardOption<Classification>[] = [
  {
    value: "operating",
    label: "Operating",
    description: "Day-to-day running costs",
    icon: ReceiptText,
  },
  {
    value: "capital",
    label: "Capital",
    description: "Improvements that last for years",
    icon: Hammer,
  },
];

const PAYMENT_METHOD_OPTIONS: ChoiceCardOption<PaymentMethod>[] = (
  Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
).map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method],
  logo: PAYMENT_METHOD_LOGOS[method],
}));

/** Up to this many properties show as cards; more fall back to a menu. */
const PROPERTY_CARD_LIMIT = 3;
const NO_PROPERTY = "none";
const WHOLE_PROPERTY = "whole";

/** The amount as typed, in centavos, or null while it isn't a valid amount yet. */
function previewCents(amount: string) {
  try {
    return pesosToCentavos(amount, { allowZero: false });
  } catch {
    return null;
  }
}

export function ExpenseForm({
  properties,
  unitsByProperty,
  defaultPaidDate,
  expense,
  doneHref = "/expenses",
}: {
  properties: PropertyOption[];
  unitsByProperty: Record<string, { id: string; name: string }[]>;
  defaultPaidDate: string;
  expense?: ExpenseFormValues;
  /** Where to go after saving, and what Cancel does. */
  doneHref?: string;
}) {
  const editing = Boolean(expense);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ExpenseFormState,
    FormData
  >(async (previous, formData) => {
    const result = expense
      ? await updateExpenseAction(expense.id, previous, formData)
      : await createExpenseAction(previous, formData);
    if (result.success) {
      toast.success(editing ? "Expense updated." : "Expense recorded.");
      router.replace(doneHref);
      router.refresh();
    }
    return result;
  }, {});
  useActionFeedback(state);

  const today = defaultPaidDate;
  const [amount, setAmount] = useState(
    expense ? centavosToPesosInput(expense.amountCents) : "",
  );
  const [paidDate, setPaidDate] = useState(expense?.paidDate ?? today);
  const [category, setCategory] = useState<ExpenseCategory>(
    (expense?.category as ExpenseCategory | undefined) ?? "cleaning",
  );
  const [classification, setClassification] = useState<Classification>(
    expense?.classification ?? "operating",
  );
  // Picking a category suggests its type until the type is chosen by hand.
  const [classificationTouched, setClassificationTouched] = useState(editing);
  const [propertyId, setPropertyId] = useState(
    expense
      ? (expense.propertyId ?? "")
      : properties.length === 1
        ? properties[0]!.id
        : "",
  );
  const [unitId, setUnitId] = useState(expense?.unitId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(
    expense?.paymentMethod ?? "",
  );
  const [payee, setPayee] = useState(expense?.payee ?? "");

  const unitOptions = unitsByProperty[propertyId] ?? [];
  const cents = previewCents(amount);
  const yesterday = addDaysLocal(today, -1);

  const chooseCategory = (next: ExpenseCategory) => {
    setCategory(next);
    if (!classificationTouched)
      setClassification(CAPITAL_CATEGORIES.has(next) ? "capital" : "operating");
  };
  const chooseProperty = (next: string) => {
    setPropertyId(next);
    setUnitId("");
  };

  if (state.success) {
    return (
      <div className="space-y-3">
        <p
          className="inline-flex items-center gap-1.5 text-sm text-pine"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Expense recorded.
        </p>
        <Link
          href="/expenses"
          className="block text-sm text-pine hover:underline"
        >
          Back to expenses
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="classification" value={classification} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="unitId" value={unitId} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Label htmlFor="expense-amount">Amount paid</Label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-xl text-ink/45"
              aria-hidden
            >
              ₱
            </span>
            <Input
              id="expense-amount"
              name="amountPesos"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              autoFocus={!editing}
              className="h-12 rounded-xl pl-9 font-display text-2xl tabular-nums text-pine"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="expense-date">Date paid</Label>
          <DateInput
            id="expense-date"
            name="paidDate"
            value={paidDate}
            onChange={setPaidDate}
            today={today}
            size="lg"
            required
          />
          <div className="mt-2 flex gap-1.5">
            {[
              { label: "Today", value: today },
              { label: "Yesterday", value: yesterday },
            ].map((option) => (
              <QuickChip
                key={option.label}
                active={paidDate === option.value}
                onClick={() => setPaidDate(option.value)}
              >
                {option.label}
              </QuickChip>
            ))}
          </div>
        </div>
      </div>

      <FormSection title="What was it for?">
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
            id="expense-classification"
            className="mb-1.5 text-sm font-medium text-ink"
          >
            Type
          </p>
          <ChoiceCards
            aria-labelledby="expense-classification"
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
        hint="Leave it on the whole business for costs that aren’t tied to one place."
      >
        <PropertyPicker
          properties={properties}
          value={propertyId}
          onChange={chooseProperty}
        />
        {propertyId && unitOptions.length ? (
          <div className="mt-3">
            <Label htmlFor="expense-unit">Unit</Label>
            <SelectMenu
              id="expense-unit"
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
          <Label htmlFor="expense-payee">Paid to (optional)</Label>
          <Input
            id="expense-payee"
            name="payee"
            maxLength={120}
            value={payee}
            onChange={(event) => setPayee(event.target.value)}
            placeholder="e.g. Meralco, Ate Mel, Netflix"
          />
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p id="expense-method" className="text-sm font-medium text-ink">
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
            aria-labelledby="expense-method"
            columns={4}
            value={paymentMethod as PaymentMethod}
            onChange={(next) =>
              setPaymentMethod(next === paymentMethod ? "" : next)
            }
            options={PAYMENT_METHOD_OPTIONS}
          />
        </div>
      </FormSection>

      <FormSection title="Details">
        <div>
          <Label htmlFor="expense-description">Description</Label>
          <Textarea
            id="expense-description"
            name="description"
            required
            minLength={2}
            maxLength={300}
            placeholder="e.g. Deep clean after checkout, paid cleaner in cash."
            defaultValue={expense?.description ?? ""}
            className="min-h-20"
          />
        </div>
        <ReceiptField expense={expense} />
      </FormSection>

      <div className="space-y-3 border-t border-pine/10 pt-5">
        <p className="text-sm text-ink/60" aria-live="polite">
          {cents ? (
            <>
              <span className="font-medium text-pine">{formatPHP(cents)}</span>{" "}
              for {EXPENSE_CATEGORY_LABELS[category].toLowerCase()}
              {paymentMethod
                ? ` via ${PAYMENT_METHOD_LABELS[paymentMethod]}`
                : ""}
              {payee.trim() ? ` to ${payee.trim()}` : ""},{" "}
              {classification === "capital" ? "capital" : "operating"}.
            </>
          ) : (
            "Enter the amount to record this expense."
          )}
        </p>
        <FieldError message={state.error} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="clay" disabled={pending}>
            {pending
              ? editing
                ? "Saving…"
                : "Recording…"
              : editing
                ? "Save changes"
                : "Record expense"}
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

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-pine/10 pt-5">
      <h3 className="font-display text-lg text-pine">{title}</h3>
      {hint ? <p className="text-sm text-ink/60">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function QuickChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-clay bg-clay-mist/50 text-clay-deep"
          : "border-pine/15 text-ink/65 hover:border-pine/35 hover:text-pine",
      )}
    >
      {children}
    </button>
  );
}

/** Cards for a handful of properties, a menu for more. "" means the whole business. */
function PropertyPicker({
  properties,
  value,
  onChange,
}: {
  properties: PropertyOption[];
  value: string;
  onChange: (propertyId: string) => void;
}) {
  if (properties.length <= PROPERTY_CARD_LIMIT) {
    const options: ChoiceCardOption<string>[] = [
      {
        value: NO_PROPERTY,
        label: "Whole business",
        description: "Not tied to a property",
        icon: Briefcase,
      },
      ...properties.map((property) => ({
        value: property.id,
        label: property.name,
        icon: Building2,
      })),
    ];
    return (
      <ChoiceCards
        aria-label="Property"
        value={value || NO_PROPERTY}
        onChange={(next) => onChange(next === NO_PROPERTY ? "" : next)}
        options={options}
      />
    );
  }
  const options: SelectMenuOption<string>[] = [
    {
      value: NO_PROPERTY,
      label: "Whole business",
      description: "Not tied to a property",
      icon: Briefcase,
    },
    ...properties.map((property) => ({
      value: property.id,
      label: property.name,
      icon: Building2,
    })),
  ];
  return (
    <div>
      <Label htmlFor="expense-property">Property</Label>
      <SelectMenu
        id="expense-property"
        value={value || NO_PROPERTY}
        onChange={(next) => onChange(next === NO_PROPERTY ? "" : next)}
        options={options}
      />
    </div>
  );
}

/** A tap-to-add receipt tile with a preview of the picked photo. */
function ReceiptField({ expense }: { expense?: ExpenseFormValues }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-sm font-medium text-ink">
        {expense?.hasReceipt ? "Receipt" : "Receipt photo (optional)"}
      </p>
      <input
        key={inputKey}
        id={inputId}
        name="receipt"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-pine/15 bg-surface p-2.5">
          {preview ? (
            <img
              src={preview}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-pine">
              {file.name}
            </p>
            <p className="text-xs text-ink/55">
              {(file.size / 1024 / 1024).toFixed(1)} MB
              {expense?.hasReceipt ? " · replaces the current receipt" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setInputKey((key) => key + 1);
            }}
            aria-label="Remove photo"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-clay-mist hover:text-clay-deep"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-pine/25 bg-surface px-4 py-3.5 transition hover:border-pine/45 hover:bg-pine-mist/30"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/60 text-pine">
            <Camera className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-pine">
              {expense?.hasReceipt ? "Replace receipt" : "Add a photo"}
            </span>
            <span className="block text-xs text-ink/55">
              JPG, PNG or WebP up to 4 MB. On a phone this opens the camera.
            </span>
          </span>
        </label>
      )}
      {expense?.hasReceipt ? (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <a
            href={`/api/expenses/${expense.id}/receipt`}
            target="_blank"
            rel="noreferrer"
            className="text-pine underline"
          >
            View current receipt
          </a>
          <label className="inline-flex items-center gap-2 text-ink/70">
            <input
              type="checkbox"
              name="removeReceipt"
              className="accent-pine"
            />
            Remove it
          </label>
        </div>
      ) : null}
    </div>
  );
}
