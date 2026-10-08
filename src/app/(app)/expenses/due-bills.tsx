"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readableDate } from "@/lib/dates";
import { centavosToPesosInput, formatPHP } from "@/lib/money";
import {
  confirmRecurringAction,
  skipRecurringAction,
  type RecurringFormState,
} from "./recurring/actions";

export interface DueBill {
  id: string;
  description: string;
  payee: string | null;
  propertyName: string | null;
  unitName: string | null;
  amountCents: number;
  dueDate: string;
  status: "overdue" | "today" | "upcoming";
  missedPeriods: number;
}

function DueRow({
  bill,
  today,
  canAct,
}: {
  bill: DueBill;
  today: string;
  canAct: boolean;
}) {
  const [amount, setAmount] = useState(centavosToPesosInput(bill.amountCents));
  const [pending, start] = useTransition();

  function run(task: () => Promise<RecurringFormState>, done: string) {
    start(async () => {
      const result = await task();
      if (result.error)
        toast.error("That didn’t work", { description: result.error });
      else toast.success(done);
    });
  }

  const form = new FormData();
  form.set("amountPesos", amount);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <div className="min-w-48 flex-1">
        <p className="font-medium text-pine">{bill.description}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/55">
          {bill.status === "overdue" ? (
            <Badge tone="clay">
              Overdue
              {bill.missedPeriods > 1 ? ` · ${bill.missedPeriods} missed` : ""}
            </Badge>
          ) : bill.status === "today" ? (
            <Badge tone="sage">Due today</Badge>
          ) : (
            <Badge>Coming up</Badge>
          )}
          <span>{readableDate(bill.dueDate, today)}</span>
          <span>
            {bill.propertyName ?? "General"}
            {bill.unitName ? ` · ${bill.unitName}` : ""}
          </span>
          {bill.payee ? <span>· {bill.payee}</span> : null}
        </p>
      </div>
      {canAct ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`due-amount-${bill.id}`}>
            Amount for {bill.description}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/50">
              ₱
            </span>
            <Input
              id={`due-amount-${bill.id}`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="h-10 w-32 pl-7"
            />
          </div>
          <Button
            type="button"
            variant="clay"
            disabled={pending || !amount.trim()}
            onClick={() =>
              run(
                () => confirmRecurringAction(bill.id, bill.dueDate, {}, form),
                "Expense recorded.",
              )
            }
          >
            Confirm
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(() => skipRecurringAction(bill.id, bill.dueDate), "Skipped.")
            }
          >
            Skip
          </Button>
        </div>
      ) : (
        <p className="text-sm font-medium tabular-nums text-pine">
          {formatPHP(bill.amountCents)}
        </p>
      )}
    </li>
  );
}

/** Recurring bills that are due or coming up. Nothing posts until you confirm. */
export function DueBills({
  bills,
  today,
  canAct,
}: {
  bills: DueBill[];
  today: string;
  canAct: boolean;
}) {
  if (bills.length === 0) return null;
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg text-pine">
          <CalendarClock className="h-5 w-5 text-clay-deep" aria-hidden />
          Bills due
          <span className="text-sm font-normal text-ink/50">
            {bills.length}
          </span>
        </h2>
        <Link
          href="/expenses/recurring"
          className="text-xs font-medium text-clay-deep hover:underline"
        >
          Manage recurring bills
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <ul className="divide-y divide-pine/10">
          {bills.map((bill) => (
            <DueRow key={bill.id} bill={bill} today={today} canAct={canAct} />
          ))}
        </ul>
        <p className="border-t border-pine/10 px-5 py-3 text-xs text-ink/55">
          Nothing is recorded until you confirm. Change the amount first for
          bills that vary, like electricity.
        </p>
      </CardBody>
    </Card>
  );
}
