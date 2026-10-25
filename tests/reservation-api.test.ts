import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { resolvePermissions } from "@/lib/permissions";
import type { MembershipContext } from "@/lib/auth/session";

const requireMembership = vi.fn<() => Promise<MembershipContext>>();

vi.mock("@/lib/auth/session", async () => {
  const { can } = await import("@/lib/permissions");
  class PermissionError extends Error {}
  return {
    requireMembership: () => requireMembership(),
    PermissionError,
    assertCan: (
      m: MembershipContext,
      permission: Parameters<typeof can>[1],
    ) => {
      if (!can(m, permission))
        throw new PermissionError("Your role doesn’t allow that.");
    },
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/dist/client/components/redirect-error", () => ({
  isRedirectError: (e: unknown) =>
    (e as { digest?: string })?.digest === "NEXT_REDIRECT",
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/reservations/service", () => ({
  createHold: vi.fn(),
  createConfirmed: vi.fn(),
}));
vi.mock("@/server/operations/service", () => ({
  checkIn: vi.fn(),
  checkOut: vi.fn(),
}));
vi.mock("@/server/operations/replay", () => ({ hasReached: vi.fn() }));
vi.mock("@/server/payments/service", () => ({ recordPayment: vi.fn() }));
vi.mock("@/server/inventory/service", () => ({ getUnitOrThrow: vi.fn() }));
vi.mock("@/server/pricing/service", () => ({ listPricingRules: vi.fn() }));

const { createHold, createConfirmed } =
  await import("@/server/reservations/service");
const { ReservationError } = await import("@/server/reservations/validation");
const { checkIn } = await import("@/server/operations/service");
const { hasReached } = await import("@/server/operations/replay");
const { recordPayment } = await import("@/server/payments/service");
const { PaymentError } = await import("@/server/payments/validation");
const reservations = await import("@/app/api/reservations/route");
const checkInRoute =
  await import("@/app/api/reservations/[reservationId]/check-in/route");
const paymentsRoute =
  await import("@/app/api/reservations/[reservationId]/payments/route");

function member(role: "owner" | "staff"): MembershipContext {
  return {
    organizationId: "org-1",
    organizationName: "Org",
    organizationSlug: "org",
    role,
    userId: "user-1",
    permissions: resolvePermissions(role),
  };
}

const post = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });
const params = { params: Promise.resolve({ reservationId: "res-1" }) };

const booking = {
  mode: "hold",
  idempotencyKey: "k1",
  guestId: "g1",
  unitId: "11111111-1111-4111-8111-111111111111",
  checkIn: "2030-01-10",
  checkOut: "2030-01-12",
  guestCount: 2,
  charges: [
    {
      type: "accommodation",
      description: "Nightly rate",
      quantity: 2,
      unitAmountCents: 250000,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  requireMembership.mockResolvedValue(member("owner"));
});

describe("POST /api/reservations", () => {
  it("answers 401 instead of redirecting when nobody is signed in", async () => {
    requireMembership.mockRejectedValue(
      Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" }),
    );
    const res = await reservations.POST(post(booking));
    expect(res.status).toBe(401);
  });

  it("requires an idempotency key", async () => {
    const res = await reservations.POST(
      post({ ...booking, idempotencyKey: "" }),
    );
    expect(res.status).toBe(422);
    expect(createHold).not.toHaveBeenCalled();
  });

  it("creates a hold with the key passed through to the service", async () => {
    vi.mocked(createHold).mockResolvedValue({ id: "r1" } as never);
    const res = await reservations.POST(post(booking));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reservationId: "r1" });
    expect(vi.mocked(createHold).mock.calls[0]![0]).toMatchObject({
      organizationId: "org-1",
      actorUserId: "user-1",
      idempotencyKey: "k1",
      guest: { guestId: "g1" },
    });
  });

  it("creates a confirmed booking with its first payment", async () => {
    vi.mocked(createConfirmed).mockResolvedValue({ id: "r2" } as never);
    const res = await reservations.POST(
      post({
        ...booking,
        mode: "confirmed",
        initialPayment: {
          amountPesos: "500",
          allocation: "booking",
          method: "cash",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(createConfirmed).mock.calls[0]![0].data).toMatchObject({
      initialPayment: { amountPesos: "500", method: "cash" },
    });
  });

  it("refuses with 409 and the service's words when the dates are taken", async () => {
    vi.mocked(createHold).mockRejectedValue(
      new ReservationError("Those dates conflict with a booking.", "checkIn"),
    );
    const res = await reservations.POST(post(booking));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/dates conflict/);
  });

  it("refuses a minimum-stay breach as a 4xx", async () => {
    vi.mocked(createHold).mockRejectedValue(
      new ReservationError("This unit has a 3-night minimum stay.", "checkOut"),
    );
    const res = await reservations.POST(post(booking));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect((await res.json()).error).toMatch(/minimum stay/);
  });

  it("answers 422 for invalid details", async () => {
    vi.mocked(createHold).mockRejectedValue(new ZodError([]));
    const res = await reservations.POST(post(booking));
    expect(res.status).toBe(422);
  });

  it("forbids staff from booking straight to confirmed, like the form", async () => {
    requireMembership.mockResolvedValue(member("staff"));
    const res = await reservations.POST(
      post({ ...booking, mode: "confirmed" }),
    );
    expect(res.status).toBe(403);
    expect(createConfirmed).not.toHaveBeenCalled();
  });

  it("lets staff place a hold", async () => {
    requireMembership.mockResolvedValue(member("staff"));
    const { getUnitOrThrow } = await import("@/server/inventory/service");
    vi.mocked(getUnitOrThrow).mockResolvedValue({
      defaultNightlyRateCents: 250000,
      dayRates: null,
      cleaningFeeCents: null,
      securityDepositCents: null,
    } as never);
    const { listPricingRules } = await import("@/server/pricing/service");
    vi.mocked(listPricingRules).mockResolvedValue([]);
    vi.mocked(createHold).mockResolvedValue({ id: "r3" } as never);
    const res = await reservations.POST(post(booking));
    expect(res.status).toBe(200);
  });

  it("keeps unexpected failures as 500 so the outbox retries", async () => {
    vi.mocked(createHold).mockRejectedValue(new Error("connection reset"));
    const res = await reservations.POST(post(booking));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/reservations/[id]/check-in", () => {
  it("checks in", async () => {
    vi.mocked(checkIn).mockResolvedValue({} as never);
    const res = await checkInRoute.POST(post({ note: "ok" }), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyDone: false });
  });

  it("treats a replay of a check-in that already happened as success", async () => {
    vi.mocked(checkIn).mockRejectedValue(
      new ReservationError("A checked_in reservation cannot be checked in."),
    );
    vi.mocked(hasReached).mockResolvedValue(true);
    const res = await checkInRoute.POST(post({}), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyDone: true });
  });

  it("still refuses a check-in that can't happen", async () => {
    vi.mocked(checkIn).mockRejectedValue(
      new ReservationError("A cancelled reservation cannot be checked in."),
    );
    vi.mocked(hasReached).mockResolvedValue(false);
    const res = await checkInRoute.POST(post({}), params);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/reservations/[id]/payments", () => {
  const payment = {
    amountPesos: "100",
    allocation: "booking",
    method: "cash",
    idempotencyKey: "p1",
  };

  it("records a payment", async () => {
    vi.mocked(recordPayment).mockResolvedValue({
      entry: { id: "pay1" },
      alreadyRecorded: false,
    } as never);
    const res = await paymentsRoute.POST(post(payment), params);
    expect(await res.json()).toEqual({
      paymentId: "pay1",
      alreadyRecorded: false,
    });
  });

  it("needs the payments permission", async () => {
    requireMembership.mockResolvedValue(member("staff"));
    const res = await paymentsRoute.POST(post(payment), params);
    expect(res.status).toBe(403);
    expect(recordPayment).not.toHaveBeenCalled();
  });

  it("requires an idempotency key", async () => {
    const res = await paymentsRoute.POST(
      post({ ...payment, idempotencyKey: undefined }),
      params,
    );
    expect(res.status).toBe(422);
  });

  it("refuses an overpayment as a 4xx", async () => {
    vi.mocked(recordPayment).mockRejectedValue(
      new PaymentError("That is more than is owed."),
    );
    const res = await paymentsRoute.POST(post(payment), params);
    expect(res.status).toBe(409);
  });
});
