import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents, units } from "@/lib/db/schema";
import {
  getUnitOrThrow,
  updateUnit,
  updateUnitPricing,
} from "@/server/inventory/service";
import { InventoryError } from "@/server/inventory/validation";
import { createActiveUnit, createTestOrg, createTestProperty } from "./helpers";

const PRICING = {
  defaultNightlyRateCents: 550_000,
  dayRates: { "5": 700_000, "6": 700_000 },
  cleaningFeeCents: 50_000,
  securityDepositCents: 200_000,
  reservationFeeType: "percent" as const,
  reservationFeeAmount: 3000,
  extensionsEnabled: true,
  maxExtensionHours: 3,
  extensionHourlyRateCents: 30_000,
};

async function setup(label: string) {
  const { org, owner } = await createTestOrg(label);
  const property = await createTestProperty(org.id, owner.id);
  const unit = await createActiveUnit(org.id, owner.id, property.id);
  return { org, owner, unit };
}

describe("unit pricing", () => {
  it("saves rates, fees, down payment and late check-out on their own", async () => {
    const { org, owner, unit } = await setup("pricing-save");
    await updateUnitPricing({
      organizationId: org.id,
      actorUserId: owner.id,
      unitId: unit.id,
      data: PRICING,
    });
    const saved = await getUnitOrThrow(org.id, unit.id);
    expect(saved).toMatchObject({
      defaultNightlyRateCents: 550_000,
      dayRates: { "5": 700_000, "6": 700_000 },
      cleaningFeeCents: 50_000,
      securityDepositCents: 200_000,
      reservationFeeType: "percent",
      reservationFeeAmount: 3000,
      extensionsEnabled: true,
      maxExtensionHours: 3,
      extensionHourlyRateCents: 30_000,
      // Nothing outside pricing changed.
      name: unit.name,
      capacity: unit.capacity,
    });
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.entityId, unit.id));
    expect(events.some((e) => e.action === "unit.pricing_updated")).toBe(true);
  });

  it("keeps pricing when the unit's details are edited", async () => {
    const { org, owner, unit } = await setup("pricing-details");
    await updateUnitPricing({
      organizationId: org.id,
      actorUserId: owner.id,
      unitId: unit.id,
      data: PRICING,
    });
    // The Details form no longer sends any pricing fields.
    await updateUnit({
      organizationId: org.id,
      actorUserId: owner.id,
      unitId: unit.id,
      data: {
        name: "Renamed unit",
        capacity: 6,
        bedrooms: 2,
        bathrooms: 1.5,
        checkInTime: "14:00",
        checkOutTime: "11:00",
        status: "active",
      },
    });
    const after = await getUnitOrThrow(org.id, unit.id);
    expect(after.name).toBe("Renamed unit");
    expect(after.capacity).toBe(6);
    expect(after.defaultNightlyRateCents).toBe(550_000);
    expect(after.dayRates).toEqual({ "5": 700_000, "6": 700_000 });
    expect(after.cleaningFeeCents).toBe(50_000);
    expect(after.reservationFeeType).toBe("percent");
    expect(after.extensionsEnabled).toBe(true);
  });

  it("validates the down payment and won't touch another organization's unit", async () => {
    const a = await setup("pricing-iso-a");
    const b = await setup("pricing-iso-b");
    await expect(
      updateUnitPricing({
        organizationId: a.org.id,
        actorUserId: a.owner.id,
        unitId: a.unit.id,
        data: {
          ...PRICING,
          reservationFeeType: "fixed",
          reservationFeeAmount: null,
        },
      }),
    ).rejects.toThrow();
    await expect(
      updateUnitPricing({
        organizationId: b.org.id,
        actorUserId: b.owner.id,
        unitId: a.unit.id,
        data: PRICING,
      }),
    ).rejects.toBeInstanceOf(InventoryError);
    const [row] = await db.select().from(units).where(eq(units.id, a.unit.id));
    expect(row!.defaultNightlyRateCents).not.toBe(550_000);
  });
});
