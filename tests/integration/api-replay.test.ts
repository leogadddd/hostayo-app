import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { MembershipContext } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { paymentEntries, reservations } from "@/lib/db/schema";
import { resolvePermissions } from "@/lib/permissions";
import {
  createActiveUnit,
  createTestOrg,
  createTestProperty,
  stayDates,
} from "./helpers";

const requireMembership = vi.fn<() => Promise<MembershipContext>>();
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  requireMembership: () => requireMembership(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const create = await import("@/app/api/reservations/route");
const checkInRoute =
  await import("@/app/api/reservations/[reservationId]/check-in/route");
const paymentsRoute =
  await import("@/app/api/reservations/[reservationId]/payments/route");
const { createGuest } = await import("@/server/reservations/service");

const post = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });

describe("replaying outbox requests against the real routes", () => {
  let setup: Awaited<ReturnType<typeof prepare>>;

  async function prepare() {
    const { org, owner } = await createTestOrg("replay");
    const property = await createTestProperty(org.id, owner.id);
    const unit = await createActiveUnit(org.id, owner.id, property.id);
    const guest = await createGuest({
      organizationId: org.id,
      actorUserId: owner.id,
      data: { name: "Replay Guest", email: "replay@example.com" },
    } as never);
    requireMembership.mockResolvedValue({
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      role: "owner",
      userId: owner.id,
      permissions: resolvePermissions("owner"),
    });
    return { org, owner, unit, guest };
  }

  beforeEach(async () => {
    setup = await prepare();
  });

  it("creates one confirmed booking and one payment however often the same requests arrive", async () => {
    const { unit, guest } = setup;
    const { checkIn, checkOut } = stayDates(90);
    const booking = {
      mode: "confirmed",
      idempotencyKey: "offline-booking-1",
      guestId: guest.id,
      unitId: unit.id,
      checkIn,
      checkOut,
      guestCount: 2,
      charges: [
        {
          type: "accommodation",
          description: "Nightly rate",
          quantity: 2,
          unitAmountCents: 250000,
        },
      ],
      acknowledgeUnpaid: true,
    };
    const first = await create.POST(post(booking));
    const second = await create.POST(post(booking));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const { reservationId } = await first.json();
    expect((await second.json()).reservationId).toBe(reservationId);
    expect(
      await db
        .select()
        .from(reservations)
        .where(eq(reservations.unitId, unit.id)),
    ).toHaveLength(1);

    const params = { params: Promise.resolve({ reservationId }) };
    const payment = {
      amountPesos: "1000",
      allocation: "booking",
      method: "cash",
      idempotencyKey: "offline-pay-1",
    };
    expect((await paymentsRoute.POST(post(payment), params)).status).toBe(200);
    const again = await paymentsRoute.POST(post(payment), params);
    expect((await again.json()).alreadyRecorded).toBe(true);
    expect(
      await db
        .select()
        .from(paymentEntries)
        .where(eq(paymentEntries.reservationId, reservationId)),
    ).toHaveLength(1);

    expect((await checkInRoute.POST(post({}), params)).status).toBe(200);
    const replayed = await checkInRoute.POST(post({}), params);
    expect(replayed.status).toBe(200);
    expect((await replayed.json()).alreadyDone).toBe(true);
  });

  it("refuses a different booking for taken dates with a clear 4xx", async () => {
    const { unit, guest } = setup;
    const { checkIn, checkOut } = stayDates(120);
    const base = {
      mode: "hold",
      guestId: guest.id,
      unitId: unit.id,
      checkIn,
      checkOut,
      guestCount: 1,
      charges: [
        {
          type: "accommodation",
          description: "Nightly rate",
          quantity: 2,
          unitAmountCents: 250000,
        },
      ],
    };
    expect(
      (await create.POST(post({ ...base, idempotencyKey: "a" }))).status,
    ).toBe(200);
    const clash = await create.POST(post({ ...base, idempotencyKey: "b" }));
    expect(clash.status).toBe(409);
    expect((await clash.json()).error).toMatch(/conflict/i);
  });
});
