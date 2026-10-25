import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FormActions } from "@/components/ui/form-actions";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PaymentsCard } from "@/app/(app)/reservations/[id]/payments-card";
import { ReservationActionPage } from "@/app/(app)/reservations/[id]/action-page";
import type { ReservationLedger } from "@/server/payments/service";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/reservations/holds", () => ({ expireStaleHolds: vi.fn() }));
vi.mock("@/server/reservations/service", () => ({
  getReservationDetail: vi.fn(),
  ReservationError: class extends Error {},
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

const h = React.createElement;
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

const ledger = {
  balances: {
    bookingTotalCents: 1_700_000,
    paidBookingCents: 500_000,
    refundedBookingCents: 0,
    bookingBalanceCents: 1_200_000,
    depositTotalCents: 200_000,
    paidDepositCents: 0,
    depositHeldCents: 0,
  },
  payments: [
    {
      id: "p1",
      receivedAt: new Date("2026-10-21T02:00:00Z"),
      method: "gcash",
      reference: "REF-1234",
      allocation: "booking",
      amountCents: 500_000,
    },
  ],
  refunds: [
    {
      id: "r1",
      refundedAt: new Date("2026-10-22T02:00:00Z"),
      reason: "Guest cancelled one night",
      method: "cash",
      allocation: "booking",
      amountCents: 100_000,
    },
  ],
  deductions: [
    {
      id: "d1",
      createdAt: new Date("2026-10-23T02:00:00Z"),
      reason: "Cracked mirror",
      amountCents: 50_000,
    },
  ],
  proofs: [],
} as unknown as ReservationLedger;

describe("phone forms and actions", () => {
  it("pins a form's submit row on phones and stretches its button", () => {
    const html = renderToStaticMarkup(
      h(FormActions, null, h(Button, { type: "submit" }, "Save")),
    );
    expect(html).toContain("max-lg:sticky");
    expect(html).toContain("max-lg:[&amp;&gt;button]:w-full");
    expect(html).toContain("Save");
  });

  it("makes fields and buttons thumb-sized on phones", () => {
    const fields = renderToStaticMarkup(
      h("div", null, h(Input), h(Select), h(Textarea)),
    );
    expect(fields.match(/max-lg:text-base/g)).toHaveLength(3);
    expect(fields.match(/max-lg:h-12/g)).toHaveLength(2);
    expect(buttonClassName("primary", "md")).toContain("max-lg:h-12");
    expect(buttonClassName("primary", "sm")).toContain("max-lg:h-10");
  });

  it("lists payments, refunds and deductions as cards on a phone, keeping the tables for desktop", () => {
    const html = renderToStaticMarkup(
      h(PaymentsCard, {
        reservationId: "res-a",
        ledger,
        canReviewProofs: false,
      }),
    );
    // Tables for wide screens, hidden on phones.
    expect(html).toContain('aria-label="Payments"');
    expect(html).toContain("max-lg:hidden");
    // Card rows for phones.
    expect(html).toContain("lg:hidden");
    expect(html).toContain("REF-1234");
    expect(html).toContain("Guest cancelled one night");
    expect(html).toContain("Cracked mirror");
    expect(html).toContain("-₱1,000");
    expect(html).toContain("-₱500");
  });

  it("shows a friendly line when a ledger section is empty", () => {
    const html = renderToStaticMarkup(
      h(PaymentsCard, {
        reservationId: "res-a",
        ledger: { ...ledger, payments: [], refunds: [], deductions: [] },
        canReviewProofs: false,
      }),
    );
    expect(
      html.match(/No payments recorded yet\./g)?.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("gives every reservation action page a phone header and a soft card", () => {
    const html = renderToStaticMarkup(
      h(ReservationActionPage, {
        title: "Confirm hold",
        description: "Maria · Unit 12B. Confirm this stay.",
        reservationId: "res-a",
        children: h("p", null, "the form"),
      }),
    );
    expect(html).toContain('aria-label="Back to reservation"');
    expect(html).toContain("Confirm hold");
    expect(html).toContain("the form");
    expect(html).toContain("max-lg:rounded-3xl");
  });

  it("explains when an action isn't available", () => {
    const html = renderToStaticMarkup(
      h(ReservationActionPage, {
        title: "Record refund",
        description: "Record money returned.",
        reservationId: "res-a",
        unavailable: "Nothing to refund yet.",
      }),
    );
    expect(html).toContain("Nothing to refund yet.");
    expect(html).toContain('role="status"');
  });
});
