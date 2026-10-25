import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { useSearchParams } from "next/navigation";
import {
  ReservationForm,
  type ReservationFormProps,
  type UnitOption,
} from "@/app/(app)/reservations/new/reservation-form";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock("@/app/(app)/reservations/actions", () => ({
  createReservationAction: vi.fn(),
  updateReservationAction: vi.fn(),
}));
vi.mock("@/app/(app)/reservations/new/actions", () => ({
  checkStayAvailabilityAction: vi.fn(async () => ({ status: "available" })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const h = React.createElement;
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
  );
});

const unit: UnitOption = {
  id: "unit-a",
  label: "Unit 12B — Studio",
  name: "Unit 12B — Studio",
  propertyName: "Riverside",
  imageUrl: null,
  capacity: 2,
  bedrooms: 0,
  bathrooms: 1,
  checkInTime: "15:00",
  checkOutTime: "11:00",
  nightlyRateCents: 550_000,
  dayRates: null,
  pricingRules: [],
  cleaningFeeCents: 50_000,
  securityDepositCents: 200_000,
  reservationFee: null,
};

function props(
  variant: "mobile" | "desktop",
  extra: Partial<ReservationFormProps> = {},
): ReservationFormProps {
  return {
    variant,
    units: [unit],
    guests: [
      {
        id: "guest-a",
        name: "Maria Santos",
        email: "m@example.com",
        phone: null,
      },
    ],
    platforms: [],
    canConfirm: true,
    canSetCharges: true,
    today: "2026-10-21",
    defaultCheckIn: "2026-10-21",
    defaultCheckOut: "2026-10-22",
    ...extra,
  };
}

const render = (p: ReservationFormProps) =>
  renderToStaticMarkup(h(ReservationForm, p));

describe("reservation form layouts", () => {
  it("draws the phone form with steps, a pinned summary and big touch targets", () => {
    const html = render(props("mobile"));
    expect(html).toContain("Step 1 of 4");
    expect(html).toContain("Check-in → check-out");
    expect(html).toContain("Tap for the summary");
    expect(html).toContain("₱6,000");
    expect(html).toContain("Continue");
    // The wizard's tab bar and side summary are desktop only.
    expect(html).not.toContain("Where and when");
  });

  it("keeps the desktop wizard for wide screens", () => {
    const html = render(props("desktop"));
    expect(html).toContain("Where and when");
    expect(html).not.toContain("Tap for the summary");
  });

  it("shows the same step on both layouts, and stops at the first one with a problem", () => {
    // Asking for review with nobody picked lands on Guests, where the problem is.
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("step=review") as unknown as ReturnType<
        typeof useSearchParams
      >,
    );
    const phone = render(props("mobile"));
    expect(phone).toContain("Step 2 of 4");
    expect(phone).toContain("Primary guest");
    const wide = render(props("desktop"));
    expect(wide).toContain("Primary guest");
    expect(wide).not.toContain("Review and save");
  });

  it("lists the charge lines as tappable rows on a phone", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("step=charges") as unknown as ReturnType<
        typeof useSearchParams
      >,
    );
    // A guest is already chosen (as when coming from their page), so Charges is reachable.
    const html = render(props("mobile", { requestedGuestId: "guest-a" }));
    expect(html).toContain("Booking total");
    expect(html).toContain("Accommodation (1 night)");
    expect(html).toContain("Add charge");
    expect(html).toContain("Payment received");
  });

  it("offers staff without pricing access only the steps they can use", () => {
    const html = render(props("mobile", { canSetCharges: false }));
    expect(html).toContain("Step 1 of 3");
    expect(html).not.toContain("Tap for the summary ₱");
  });
});
