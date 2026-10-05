import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservationCharges, units } from "@/lib/db/schema";
import {
  createConfirmed,
  ReservationError,
} from "@/server/reservations/service";
import {
  approveExtension,
  cancelExtensionRequest,
  declineExtension,
  getExtensionState,
  removeExtension,
  requestExtension,
} from "@/server/reservations/extensions";
import {
  createActiveUnit,
  createTestOrg,
  createTestProperty,
  stayDates,
} from "./helpers";

// Two nights at ₱2,200 (check-in 15:00, check-out 11:00: 44 hours) → ₱100/h.
const CHARGES = [
  {
    type: "accommodation" as const,
    description: "Nightly rate",
    quantity: 2,
    unitAmountCents: 220_000,
  },
];

async function setup(label: string) {
  const { org, owner } = await createTestOrg(label);
  const property = await createTestProperty(org.id, owner.id); // 2h turnover
  const unit = await createActiveUnit(org.id, owner.id, property.id);
  await db
    .update(units)
    .set({ extensionsEnabled: true, maxExtensionHours: 4 })
    .where(eq(units.id, unit.id));
  const { checkIn, checkOut } = stayDates(40);
  const args = { organizationId: org.id, actorUserId: owner.id };
  const stay = await createConfirmed({
    ...args,
    guest: { newGuest: { name: "Ana Reyes", email: "ana@example.com" } },
    data: {
      unitId: unit.id,
      checkIn,
      checkOut,
      guestCount: 1,
      charges: CHARGES,
      acknowledgeUnpaid: true,
    },
  });
  const book = (guest: string, dates: { checkIn: string; checkOut: string }) =>
    createConfirmed({
      ...args,
      guest: {
        newGuest: {
          name: guest,
          email: `${guest.toLowerCase().replace(" ", ".")}@example.com`,
        },
      },
      data: {
        unitId: unit.id,
        ...dates,
        guestCount: 1,
        charges: CHARGES,
        acknowledgeUnpaid: true,
      },
    });
  const extensionCharges = () =>
    db
      .select()
      .from(reservationCharges)
      .where(
        and(
          eq(reservationCharges.reservationId, stay.id),
          eq(reservationCharges.type, "extension"),
        ),
      );
  return {
    ...args,
    stay,
    checkOut,
    book,
    extensionCharges,
    ref: { ...args, reservationId: stay.id },
  };
}

describe("late check-out requests", () => {
  it("changes nothing until approved, then charges and blocks a same-day arrival", async () => {
    const { ref, checkOut, book, extensionCharges } =
      await setup("late-approve");
    const request = await requestExtension({
      ...ref,
      data: { hours: 3, note: "Flight at 6 PM" },
    });
    expect(request).toMatchObject({
      status: "requested",
      hourlyRateCents: 10_000,
      chargeId: null,
    });
    expect(await extensionCharges()).toHaveLength(0);

    // Still requested: a guest arriving that afternoon can book.
    const before = await getExtensionState(
      ref.organizationId,
      ref.reservationId,
    );
    expect(before.extendedHours).toBe(0);
    await expect(
      requestExtension({ ...ref, data: { hours: 1 } }),
    ).rejects.toThrow("already waiting for approval");

    await approveExtension({
      ...ref,
      extensionId: request.id,
      canSetRate: false,
      data: {},
    });
    const after = await getExtensionState(
      ref.organizationId,
      ref.reservationId,
    );
    expect(after.extendedHours).toBe(3);
    expect(after.departureAt.getTime() - after.checkoutAt.getTime()).toBe(
      3 * 3_600_000,
    );
    expect(await extensionCharges()).toEqual([
      expect.objectContaining({
        quantity: 3,
        unitAmountCents: 10_000,
        amountCents: 30_000,
      }),
    ]);

    // 11:00 + 3h + 2h turnover = 16:00, after the next guest's 15:00 check-in.
    const next = { checkIn: checkOut, checkOut: stayDates(43).checkOut };
    await expect(book("Next Guest", next)).rejects.toThrow("late check-out");

    await removeExtension({ ...ref, extensionId: request.id });
    expect(await extensionCharges()).toHaveLength(0);
    expect(
      (await getExtensionState(ref.organizationId, ref.reservationId))
        .extendedHours,
    ).toBe(0);
    await expect(book("Next Guest", next)).resolves.toMatchObject({
      status: "confirmed",
    });
  });

  it("re-checks at approval, so a booking made meanwhile wins", async () => {
    const { ref, checkOut, book } = await setup("late-recheck");
    const request = await requestExtension({ ...ref, data: { hours: 3 } });
    // A request holds nothing: the next guest can still book that day.
    await book("Next Guest", {
      checkIn: checkOut,
      checkOut: stayDates(43).checkOut,
    });

    await expect(
      approveExtension({
        ...ref,
        extensionId: request.id,
        canSetRate: false,
        data: {},
      }),
    ).rejects.toThrow("no longer fits");
    await expect(
      declineExtension({ ...ref, extensionId: request.id, data: { note: "" } }),
    ).rejects.toThrow();
    await declineExtension({
      ...ref,
      extensionId: request.id,
      data: { note: "Next guest arrives at 3 PM." },
    });

    const state = await getExtensionState(
      ref.organizationId,
      ref.reservationId,
    );
    expect(state.openRequest).toBeNull();
    expect(state.extensions).toEqual([
      expect.objectContaining({
        status: "declined",
        decisionNote: "Next guest arrives at 3 PM.",
      }),
    ]);
    // With the next arrival at 15:00 and 2h turnover, only 2 hours fit now.
    expect(state.window.availableHours).toBe(2);
    await expect(
      requestExtension({ ...ref, data: { hours: 3 } }),
    ).rejects.toBeInstanceOf(ReservationError);
  });

  it("lets a request be withdrawn before it's decided", async () => {
    const { ref } = await setup("late-cancel");
    const request = await requestExtension({ ...ref, data: { hours: 1 } });
    await cancelExtensionRequest({ ...ref, extensionId: request.id });
    expect(
      (await getExtensionState(ref.organizationId, ref.reservationId))
        .extensions,
    ).toHaveLength(0);
    await expect(
      approveExtension({
        ...ref,
        extensionId: request.id,
        canSetRate: false,
        data: {},
      }),
    ).rejects.toThrow("already decided");
  });
});
