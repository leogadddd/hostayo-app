import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYMENT_ALLOCATION_LABELS } from "@/lib/labels";
import { PaymentMethodLabel } from "@/components/app/payment-method-logo";
import { formatPHP } from "@/lib/money";
import type { ReservationLedger } from "@/server/payments/service";
import { ProofQueue } from "./proof-queue";
import { InfoTip } from "@/components/ui/info-tip";

const TIME_LABEL = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

type LedgerRow = {
  id: string;
  when: Date;
  title: ReactNode;
  detail?: ReactNode;
  badge?: string;
  amount: string;
  /** Money going back out (refunds, deductions). */
  out?: boolean;
};

/** The phone's version of a ledger table: one tappable-looking card row per entry. */
function LedgerRows({ rows, empty }: { rows: LedgerRow[]; empty: string }) {
  if (!rows.length)
    return (
      <p className="rounded-2xl bg-linen px-4 py-5 text-center text-sm text-ink/55 lg:hidden">
        {empty}
      </p>
    );
  return (
    <ul className="divide-y divide-pine/8 overflow-hidden rounded-2xl bg-linen lg:hidden">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-start justify-between gap-3 px-4 py-3.5"
        >
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-pine">{row.title}</p>
            {row.detail ? (
              <p className="mt-0.5 break-words text-xs text-ink/60">
                {row.detail}
              </p>
            ) : null}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/50">
              {TIME_LABEL.format(row.when)}
              {row.badge ? <Badge tone="neutral">{row.badge}</Badge> : null}
            </p>
          </div>
          <p
            className={
              row.out
                ? "shrink-0 text-base font-semibold tabular-nums text-clay-deep"
                : "shrink-0 text-base font-semibold tabular-nums text-pine"
            }
          >
            {row.amount}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function PaymentsCard({
  reservationId,
  ledger,
  canReviewProofs,
  canRecord = true,
}: {
  reservationId: string;
  ledger: ReservationLedger;
  /** payments.update: record or dismiss guest payment proofs. */
  canReviewProofs: boolean;
  canRecord?: boolean;
}) {
  const { balances, payments, refunds, deductions, proofs } = ledger;

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg text-pine">Payments & balance</h2>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/60">Booking total</dt>
              <dd className="font-medium text-pine">
                {formatPHP(balances.bookingTotalCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/60">Paid towards booking</dt>
              <dd className="font-medium text-pine">
                {formatPHP(balances.paidBookingCents)}
              </dd>
            </div>
            {balances.refundedBookingCents > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Refunded from booking</dt>
                <dd className="font-medium text-clay-deep">
                  -{formatPHP(balances.refundedBookingCents)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 rounded-lg bg-sage/35 p-3">
              <dt className="font-medium text-pine">
                {balances.bookingBalanceCents >= 0
                  ? "Balance due"
                  : "Overpaid by"}
              </dt>
              <dd className="font-semibold text-pine">
                {formatPHP(Math.abs(balances.bookingBalanceCents))}
              </dd>
            </div>
          </dl>
          <div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Refundable deposit required</dt>
                <dd className="font-medium text-pine">
                  {formatPHP(balances.depositTotalCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/60">Deposit collected</dt>
                <dd className="font-medium text-pine">
                  {formatPHP(balances.paidDepositCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 rounded-lg bg-sage/35 p-3">
                <dt className="font-medium text-pine">
                  Deposit still held
                  <InfoTip className="ml-1.5">
                    The deposit is a refundable liability — it never counts
                    towards the booking balance.
                  </InfoTip>
                </dt>
                <dd className="font-semibold text-pine">
                  {formatPHP(balances.depositHeldCents)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <section className="space-y-3 border-t border-pine/10 pt-5">
          <h3 className="text-sm font-medium text-pine">
            Payments ({payments.length})
          </h3>
          <div className="max-lg:hidden">
            <Table aria-label="Payments">
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Method / reference</TableHead>
                  <TableHead>Towards</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap text-xs text-ink/60">
                        {TIME_LABEL.format(payment.receivedAt)}
                      </TableCell>
                      <TableCell>
                        <PaymentMethodLabel
                          method={payment.method}
                          className="text-pine"
                        />
                        {payment.reference ? (
                          <p className="mt-1 max-w-64 break-words text-xs text-ink/55">
                            {payment.reference}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge tone="neutral">
                          {PAYMENT_ALLOCATION_LABELS[payment.allocation]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium text-pine">
                        {formatPHP(payment.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-ink/55">
                      No payments recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <LedgerRows
            empty="No payments recorded yet."
            rows={payments.map((payment) => ({
              id: payment.id,
              when: payment.receivedAt,
              title: (
                <PaymentMethodLabel
                  method={payment.method}
                  className="text-pine"
                />
              ),
              detail: payment.reference,
              badge: PAYMENT_ALLOCATION_LABELS[payment.allocation],
              amount: formatPHP(payment.amountCents),
            }))}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-pine">
            Refunds ({refunds.length})
          </h3>
          <div className="max-lg:hidden">
            <Table aria-label="Refunds">
              <TableHeader>
                <TableRow>
                  <TableHead>Returned</TableHead>
                  <TableHead>Reason / method</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.length ? (
                  refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="whitespace-nowrap text-xs text-ink/60">
                        {TIME_LABEL.format(refund.refundedAt)}
                      </TableCell>
                      <TableCell>
                        <p className="min-w-40 max-w-64 break-words text-pine">
                          {refund.reason}
                        </p>
                        <PaymentMethodLabel
                          method={refund.method}
                          className="mt-1 text-xs text-ink/55"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge tone="neutral">
                          {PAYMENT_ALLOCATION_LABELS[refund.allocation]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium text-clay-deep">
                        -{formatPHP(refund.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-ink/55">
                      No refunds recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <LedgerRows
            empty="No refunds recorded yet."
            rows={refunds.map((refund) => ({
              id: refund.id,
              when: refund.refundedAt,
              title: refund.reason,
              detail: (
                <PaymentMethodLabel
                  method={refund.method}
                  className="text-xs"
                />
              ),
              badge: PAYMENT_ALLOCATION_LABELS[refund.allocation],
              amount: `-${formatPHP(refund.amountCents)}`,
              out: true,
            }))}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-pine">
            Deposit deductions ({deductions.length})
          </h3>
          <div className="max-lg:hidden">
            <Table aria-label="Deposit deductions">
              <TableHeader>
                <TableRow>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.length ? (
                  deductions.map((deduction) => (
                    <TableRow key={deduction.id}>
                      <TableCell className="whitespace-nowrap text-xs text-ink/60">
                        {TIME_LABEL.format(deduction.createdAt)}
                      </TableCell>
                      <TableCell className="min-w-40 max-w-64 break-words text-pine">
                        {deduction.reason}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium text-clay-deep">
                        -{formatPHP(deduction.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-ink/55">
                      No deductions recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <LedgerRows
            empty="No deductions recorded yet."
            rows={deductions.map((deduction) => ({
              id: deduction.id,
              when: deduction.createdAt,
              title: deduction.reason,
              amount: `-${formatPHP(deduction.amountCents)}`,
              out: true,
            }))}
          />
        </section>

        {canReviewProofs && proofs.length > 0 ? (
          <div className="border-t border-pine/10 pt-5">
            <ProofQueue
              reservationId={reservationId}
              canRecord={canRecord}
              proofs={proofs.map((proof) => ({
                id: proof.id,
                reference: proof.reference,
                note: proof.note,
                createdAt: proof.createdAt,
                status: proof.status,
              }))}
            />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
