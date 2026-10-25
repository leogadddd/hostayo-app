import { vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DesktopConfirmation } from "@/app/(app)/reservations/[id]/confirmation/desktop";
import { MobileConfirmation } from "@/app/(app)/reservations/[id]/confirmation/mobile";
import type { ConfirmationData } from "@/app/(app)/reservations/[id]/confirmation/model";

const h = React.createElement;
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function data(overrides: Partial<ConfirmationData> = {}): ConfirmationData {
  return {
    detail: {
      reservation: {
        id: "abcdef12-0000-4000-8000-000000000000",
        status: "confirmed",
        checkInDate: "2026-12-14",
        checkOutDate: "2026-12-16",
        guestCount: 2,
        expiresAt: null,
      },
      guest: {
        name: "Maria Santos",
        email: "maria@example.com",
        phone: "+63 900",
      },
      unit: {
        id: "unit-a",
        name: "Unit 12B",
        imageUrl: null,
        checkInTime: "15:00",
        checkOutTime: "11:00",
      },
      property: {
        name: "Riverside",
        address: "Manila",
        timezone: "Asia/Manila",
      },
      occupants: [{ id: "o1", name: "Ben Reyes" }],
      charges: [
        {
          id: "c1",
          type: "accommodation",
          description: "Accommodation (2 nights)",
          quantity: 2,
          unitAmountCents: 550_000,
          amountCents: 1_100_000,
        },
        {
          id: "c2",
          type: "cleaning",
          description: "Cleaning fee",
          quantity: 1,
          unitAmountCents: 50_000,
          amountCents: 50_000,
        },
      ],
    } as unknown as ConfirmationData["detail"],
    balances: {
      bookingTotalCents: 1_150_000,
      depositTotalCents: 200_000,
      paidBookingCents: 0,
      paidDepositCents: 0,
      bookingBalanceCents: 1_150_000,
      depositOutstandingCents: 200_000,
    } as ConfirmationData["balances"],
    nights: 2,
    isHold: false,
    expiresLabel: null,
    reservationHref: "/reservations/abcdef12-0000-4000-8000-000000000000",
    shortRef: "ABCDEF12",
    canSeeMoney: true,
    canConfirmHold: false,
    canRecordPayment: true,
    ...overrides,
  };
}

describe("reservation saved page", () => {
  it("shows the result, the stay, the money and the way on, on a phone", () => {
    const html = renderToStaticMarkup(h(MobileConfirmation, { data: data() }));
    expect(html).toContain("Booking confirmed");
    expect(html).toContain("ABCDEF12");
    expect(html).toContain("Unit 12B");
    expect(html).toContain("Balance due");
    expect(html).toContain("₱13,500");
    expect(html).toContain("Open reservation");
    expect(html).toContain("Record payment");
    expect(html).toContain('href="mailto:maria@example.com"');
    expect(html).toContain('href="tel:+63 900"');
    expect(html).toContain("Ben Reyes");
  });

  it("does not repeat a charge's type when its description already says it", () => {
    const html = renderToStaticMarkup(h(MobileConfirmation, { data: data() }));
    // "Cleaning fee" appears once as the line, not again as its own caption.
    expect(html.match(/Cleaning fee/g)).toHaveLength(1);
    expect(html).toContain("2 × ₱5,500");
  });

  it("calls a settled booking paid in full", () => {
    const html = renderToStaticMarkup(
      h(MobileConfirmation, {
        data: data({
          balances: {
            bookingTotalCents: 1_150_000,
            depositTotalCents: 0,
            paidBookingCents: 1_150_000,
            paidDepositCents: 0,
            bookingBalanceCents: 0,
            depositOutstandingCents: 0,
          } as ConfirmationData["balances"],
          canRecordPayment: false,
        }),
      }),
    );
    expect(html).toContain("Paid in full");
    expect(html).not.toContain("Balance due");
    expect(html).not.toContain("Record payment");
  });

  it("explains a hold, and offers to confirm it", () => {
    const html = renderToStaticMarkup(
      h(MobileConfirmation, {
        data: data({
          isHold: true,
          expiresLabel: "Thu, Oct 22, 12:41 AM",
          canConfirmHold: true,
          canRecordPayment: false,
        }),
      }),
    );
    expect(html).toContain("Hold placed");
    expect(html).toContain("Held until Thu, Oct 22, 12:41 AM");
    expect(html).toContain("Confirm hold");
  });

  it("keeps money away from people who can't see it", () => {
    const html = renderToStaticMarkup(
      h(MobileConfirmation, {
        data: data({
          canSeeMoney: false,
          balances: null,
          canRecordPayment: false,
        }),
      }),
    );
    expect(html).not.toContain("Balance due");
    expect(html).not.toContain("₱");
    expect(html).toContain("Booking confirmed");
  });

  it("still draws the wide layout for desktop", () => {
    const html = renderToStaticMarkup(h(DesktopConfirmation, { data: data() }));
    expect(html).toContain("Booking confirmed");
    expect(html).toContain("Payment breakdown");
    expect(html).toContain("Open reservation");
  });
});
