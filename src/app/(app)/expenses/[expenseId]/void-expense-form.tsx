"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { voidExpenseAction, type ExpenseFormState } from "../actions";

export function VoidExpenseForm({
  expenseId,
  doneHref = "/expenses",
}: {
  expenseId: string;
  doneHref?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ExpenseFormState,
    FormData
  >(async (previous, formData) => {
    const result = await voidExpenseAction(expenseId, previous, formData);
    if (result.success) {
      toast.success("Expense voided.");
      router.replace(doneHref);
      router.refresh();
    }
    return result;
  }, {});
  useActionFeedback(state);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="void-reason">Reason</Label>
        <Textarea
          id="void-reason"
          name="reason"
          required
          minLength={2}
          maxLength={300}
          placeholder="e.g. Entered twice, or paid by the guest instead."
          className="min-h-16"
        />
      </div>
      <FieldError message={state.error} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Voiding…" : "Void expense"}
      </Button>
    </form>
  );
}
