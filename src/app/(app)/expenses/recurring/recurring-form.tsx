"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { PaymentMethod } from "@/lib/db/schema";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { centavosToPesosInput } from "@/lib/money";
import { CADENCE_LABELS, CADENCES, type Cadence } from "@/lib/recurrence";
import type { ExpenseCategory } from "@/lib/db/schema";
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

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

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
  const [propertyId, setPropertyId] = useState(
    recurring
      ? (recurring.propertyId ?? "")
      : properties.length === 1
        ? properties[0]!.id
        : "",
  );
  const unitOptions = unitsByProperty[propertyId] ?? [];

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="rec-description">Bill</Label>
        <Input
          id="rec-description"
          name="description"
          required
          minLength={2}
          maxLength={300}
          defaultValue={recurring?.description ?? ""}
          placeholder="e.g. Netflix, Condo dues, Internet"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="rec-property">Property (optional)</Label>
          <Select
            id="rec-property"
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
          <Label htmlFor="rec-unit">Unit (optional)</Label>
          <Select
            key={propertyId}
            id="rec-unit"
            name="unitId"
            disabled={!propertyId}
            defaultValue={
              propertyId === recurring?.propertyId
                ? (recurring.unitId ?? "")
                : ""
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
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="rec-amount">Usual amount (₱)</Label>
          <Input
            id="rec-amount"
            name="amountPesos"
            inputMode="decimal"
            placeholder="e.g. 549"
            defaultValue={
              recurring ? centavosToPesosInput(recurring.amountCents) : ""
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="rec-cadence">Repeats</Label>
          <Select
            id="rec-cadence"
            name="cadence"
            defaultValue={recurring?.cadence ?? "monthly"}
          >
            {CADENCES.map((cadence) => (
              <option key={cadence} value={cadence}>
                {CADENCE_LABELS[cadence]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="rec-due">
            {editing ? "Next due date" : "First due date"}
          </Label>
          <DateInput
            id="rec-due"
            name="dueDate"
            defaultValue={recurring?.nextDueDate ?? defaultDueDate}
            required
          />
        </div>
        <div>
          <Label htmlFor="rec-end">Ends (optional)</Label>
          <DateInput
            id="rec-end"
            name="endDate"
            defaultValue={recurring?.endDate ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="rec-category">Category</Label>
          <Select
            id="rec-category"
            name="category"
            defaultValue={recurring?.category ?? "subscriptions"}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="rec-classification">Type</Label>
          <Select
            id="rec-classification"
            name="classification"
            defaultValue={recurring?.classification ?? "operating"}
          >
            <option value="operating">Operating (day-to-day)</option>
            <option value="capital">Capital (improvement)</option>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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
        <div>
          <Label htmlFor="rec-method">Paid via (optional)</Label>
          <Select
            id="rec-method"
            name="paymentMethod"
            defaultValue={recurring?.paymentMethod ?? ""}
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
      <p className="text-xs text-ink/55">
        It never posts on its own. When it’s due you confirm the amount, or skip
        that month.
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
    </form>
  );
}
