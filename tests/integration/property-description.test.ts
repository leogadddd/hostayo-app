import { describe, expect, it } from "vitest";
import {
  createProperty,
  getPropertyOrThrow,
  updateProperty,
} from "@/server/inventory/service";
import { createTestOrg } from "./helpers";

const BASE = {
  name: "Hillside Residences",
  timezone: "Asia/Manila",
  checkInTime: "15:00",
  checkOutTime: "11:00",
};

describe("property description", () => {
  it("is saved on create, kept when an update omits it, and cleared when blank", async () => {
    const { org, owner } = await createTestOrg("property-description");
    const created = await createProperty({
      organizationId: org.id,
      actorUserId: owner.id,
      data: { ...BASE, description: "  A quiet hillside residence.  " },
    });
    expect(created.description).toBe("A quiet hillside residence.");

    // Updates from other forms (house rules, for one) don't send it.
    await updateProperty({
      organizationId: org.id,
      actorUserId: owner.id,
      propertyId: created.id,
      data: { ...BASE, houseRules: "No smoking." },
    });
    expect((await getPropertyOrThrow(org.id, created.id)).description).toBe(
      "A quiet hillside residence.",
    );

    await updateProperty({
      organizationId: org.id,
      actorUserId: owner.id,
      propertyId: created.id,
      data: { ...BASE, description: "   " },
    });
    expect(
      (await getPropertyOrThrow(org.id, created.id)).description,
    ).toBeNull();
  });
});
