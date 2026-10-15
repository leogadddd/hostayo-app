import { describe, expect, it } from "vitest";
import {
  propertyInputSchema,
  unitInputSchema,
} from "@/server/inventory/validation";

const BASE = {
  name: "Unit 12B",
  capacity: 2,
  bedrooms: 1,
  bathrooms: 1,
  status: "active" as const,
};

describe("unit description", () => {
  it("is optional, so a partial update keeps the stored text", () => {
    expect(unitInputSchema.parse(BASE).description).toBeUndefined();
  });

  it("is trimmed, and blank text clears it", () => {
    expect(
      unitInputSchema.parse({ ...BASE, description: "  Bright studio.  " })
        .description,
    ).toBe("Bright studio.");
    expect(
      unitInputSchema.parse({ ...BASE, description: "   " }).description,
    ).toBeNull();
  });

  it("stops at 2,000 characters", () => {
    expect(() =>
      unitInputSchema.parse({ ...BASE, description: "x".repeat(2001) }),
    ).toThrow(/2,000/);
    expect(
      unitInputSchema.parse({ ...BASE, description: "x".repeat(2000) })
        .description,
    ).toHaveLength(2000);
  });
});

describe("property description", () => {
  const PROPERTY = {
    name: "Lakeview Villas",
    timezone: "Asia/Manila",
    checkInTime: "15:00",
    checkOutTime: "11:00",
  };

  it("is optional and trimmed", () => {
    expect(propertyInputSchema.parse(PROPERTY).description).toBeUndefined();
    expect(
      propertyInputSchema.parse({ ...PROPERTY, description: "  Quiet.  " })
        .description,
    ).toBe("Quiet.");
  });

  it("stops at 2,000 characters", () => {
    expect(() =>
      propertyInputSchema.parse({ ...PROPERTY, description: "x".repeat(2001) }),
    ).toThrow(/2,000/);
  });
});
