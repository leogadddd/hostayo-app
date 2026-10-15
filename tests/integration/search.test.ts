import { describe, expect, it } from "vitest";
import type { MembershipContext } from "@/lib/auth/session";
import { createHold } from "@/server/reservations/service";
import { searchOrganization } from "@/server/search/service";
import {
  createActiveUnit,
  createTestOrg,
  createTestProperty,
  stayDates,
} from "./helpers";

async function seed(label: string) {
  const { org, owner } = await createTestOrg(label);
  const property = await createTestProperty(
    org.id,
    owner.id,
    "Lakeview Villas",
  );
  const unit = await createActiveUnit(
    org.id,
    owner.id,
    property.id,
    "Sunrise Loft",
  );
  const { checkIn, checkOut } = stayDates(10);
  const reservation = await createHold({
    organizationId: org.id,
    actorUserId: owner.id,
    guest: {
      newGuest: {
        name: "José Santos",
        phone: "+63 917 555 0141",
        email: "jose@example.com",
      },
    },
    idempotencyKey: `${label}-res`,
    data: {
      unitId: unit.id,
      checkIn,
      checkOut,
      guestCount: 1,
      holdMinutes: 30,
      charges: [
        {
          type: "accommodation",
          description: "Nightly rate",
          quantity: 2,
          unitAmountCents: 100_000,
        },
      ],
    },
  });
  const membership: MembershipContext = {
    organizationId: org.id,
    organizationName: org.name,
    organizationSlug: org.slug,
    role: "owner",
    userId: owner.id,
  };
  return { org, owner, property, unit, reservation, membership, checkIn };
}

const kinds = (response: Awaited<ReturnType<typeof searchOrganization>>) =>
  response.groups.map((group) => group.kind);

describe("header search", () => {
  it("finds a guest by name, phone and email, and their reservation", async () => {
    const { membership, reservation } = await seed("search-basic");
    for (const query of [
      "santos",
      "jose",
      "0917 555",
      "+63917555",
      "example.com",
    ]) {
      const response = await searchOrganization(membership, query);
      expect(kinds(response), query).toContain("guest");
      expect(kinds(response), query).toContain("reservation");
    }
    const byReference = await searchOrganization(
      membership,
      `#${reservation.id.slice(0, 8)}`,
    );
    expect(byReference.groups[0]?.results[0]?.id).toBe(reservation.id);
  });

  it("tolerates a typo and finds properties and units", async () => {
    const { membership, property, unit } = await seed("search-fuzzy");
    const response = await searchOrganization(membership, "lakevew");
    const group = response.groups.find((g) => g.kind === "property");
    expect(group?.results[0]?.id).toBe(property.id);
    const units = await searchOrganization(membership, "sunrise");
    expect(units.groups.find((g) => g.kind === "unit")?.results[0]?.href).toBe(
      `/properties/${property.id}/units/${unit.id}`,
    );
  });

  it("treats % and _ as plain characters", async () => {
    const { membership } = await seed("search-wildcards");
    expect((await searchOrganization(membership, "%")).groups).toEqual([]);
    expect((await searchOrganization(membership, "_")).groups).toEqual([]);
  });

  it("narrows reservations by status and date words", async () => {
    const { membership, checkIn, reservation } = await seed("search-filters");
    const arriving = await searchOrganization(membership, `checkin ${checkIn}`);
    expect(arriving.groups.map((g) => g.kind)).toEqual(["reservation"]);
    expect(arriving.groups[0]?.results[0]?.id).toBe(reservation.id);

    const wrongDay = await searchOrganization(membership, "checkin tomorrow");
    expect(wrongDay.groups).toEqual([]);

    const holds = await searchOrganization(membership, "hold santos");
    expect(holds.groups[0]?.results[0]?.id).toBe(reservation.id);
    const cancelled = await searchOrganization(membership, "cancelled");
    expect(cancelled.groups).toEqual([]);
  });

  it("never returns another organization's records", async () => {
    const a = await seed("search-iso-a");
    const b = await seed("search-iso-b");
    const response = await searchOrganization(a.membership, "santos");
    const ids = response.groups.flatMap((g) => g.results.map((r) => r.id));
    expect(ids).toContain(a.reservation.id);
    expect(ids).not.toContain(b.reservation.id);
    expect(response.groups.some((g) => g.kind === "guest")).toBe(true);
    // The same words in B's organization name never leak across either.
    const other = await searchOrganization(a.membership, b.property.id);
    expect(other.groups).toEqual([]);
  });

  it("only searches areas the role may see", async () => {
    const { membership } = await seed("search-perms");
    const limited: MembershipContext = {
      ...membership,
      role: "staff",
      permissions: ["reservations.view"],
    };
    const response = await searchOrganization(limited, "santos");
    expect(kinds(response)).toEqual(["reservation"]);

    const none: MembershipContext = { ...membership, permissions: [] };
    expect((await searchOrganization(none, "santos")).groups).toEqual([]);
  });

  it("returns nothing for an empty query", async () => {
    const { membership } = await seed("search-empty");
    expect((await searchOrganization(membership, "   ")).groups).toEqual([]);
  });
});
