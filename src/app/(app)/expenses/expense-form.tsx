"use client";

import { DateInput } from "@/components/ui/date-input";
import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import type { ExpenseCategory } from "@/lib/db/schema";
import { centavosToPesosInput } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type { PaymentMethod } from "@/lib/db/schema";
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

const EXPENSE_CATEGORIES = Object.keys(
  EXPENSE_CATEGORY_LABELS,
) as ExpenseCategory[];

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
  const [propertyId, setPropertyId] = useState(
    expense
      ? (expense.propertyId ?? "")
      : properties.length === 1
        ? properties[0]!.id
        : "",
  );

  const unitOptions = unitsByProperty[propertyId] ?? [];

  return (
    <div className="space-y-3">
      {state.success ? (
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
      ) : (
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="expense-property">Property (optional)</Label>
            <Select
              id="expense-property"
              name="propertyId"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
            >
              <option value="">No specific property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="expense-unit">Unit (optional)</Label>
            <Select
              key={propertyId}
              id="expense-unit"
              name="unitId"
              disabled={!propertyId}
              defaultValue={
                propertyId === expense?.propertyId ? (expense.unitId ?? "") : ""
              }
            >
              <option value="">No specific unit</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="expense-amount">Amount paid (₱)</Label>
              <Input
                id="expense-amount"
                name="amountPesos"
                inputMode="decimal"
                placeholder="e.g. 1,200"
                defaultValue={
                  expense ? centavosToPesosInput(expense.amountCents) : ""
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="expense-date">Date paid</Label>
              <DateInput
                id="expense-date"
                name="paidDate"
                defaultValue={expense?.paidDate ?? defaultPaidDate}
                required
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="expense-category">Category</Label>
              <Select
                id="expense-category"
                name="category"
                defaultValue={expense?.category ?? "cleaning"}
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {EXPENSE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="expense-classification">Type</Label>
              <Select
                id="expense-classification"
                name="classification"
                defaultValue={expense?.classification ?? "operating"}
              >
                <option value="operating">Operating (day-to-day)</option>
                <option value="capital">Capital (improvement)</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="expense-payee">Paid to (optional)</Label>
              <Input
                id="expense-payee"
                name="payee"
                maxLength={120}
                defaultValue={expense?.payee ?? ""}
                placeholder="e.g. Netflix, Ate Mel, Meralco"
              />
            </div>
            <div>
              <Label htmlFor="expense-method">Paid via (optional)</Label>
              <Select
                id="expense-method"
                name="paymentMethod"
                defaultValue={expense?.paymentMethod ?? ""}
              >
                <option value="">Not recorded</option>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="expense-description">Description</Label>
            <Textarea
              id="expense-description"
              name="description"
              required
              minLength={2}
              maxLength={300}
              placeholder="e.g. Deep clean after checkout — paid cleaner in cash."
              defaultValue={expense?.description ?? ""}
              className="min-h-16"
            />
          </div>
          <div>
            <Label htmlFor="expense-receipt">
              {expense?.hasReceipt
                ? "Replace receipt"
                : "Receipt photo (optional)"}
            </Label>
            <Input
              id="expense-receipt"
              name="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
            />
            <p className="mt-1 text-xs text-ink/55">
              JPG, PNG or WebP up to 4 MB. On a phone this opens the camera.
            </p>
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
                  <input type="checkbox" name="removeReceipt" />
                  Remove it
                </label>
              </div>
            ) : null}
          </div>
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
        </form>
      )}
    </div>
  );
}
