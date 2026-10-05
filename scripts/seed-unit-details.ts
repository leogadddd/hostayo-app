import "dotenv/config";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { amenities, unitAmenities, units } from "@/lib/db/schema";

/**
 * Fills the guest-facing details (description, house rules, Wi-Fi, arrival,
 * checkout, area tips and amenities) on the demo "Unit 12B — Studio" so the
 * /g/[token] page has content. Idempotent: rerunning overwrites these fields.
 */
const UNIT_NAME = "Unit 12B — Studio";
const UNIT_AMENITIES = ["Wi-Fi", "Air conditioning", "Refrigerator", "Microwave", "Coffee maker", "Kitchen tools", "Towels", "Toiletries", "Hot shower", "Hair dryer", "Bed linens", "Smart TV", "Streaming apps", "Iron", "Workspace", "Balcony", "Drinking water"];

async function main() {
  const matches = await db.select({ id: units.id, organizationId: units.organizationId }).from(units).where(eq(units.name, UNIT_NAME));
  if (matches.length === 0) throw new Error(`No unit named "${UNIT_NAME}" found. Run npm run seed:demo first.`);

  for (const unit of matches) {
    await db
      .update(units)
      .set({
        description:
          "A bright, cosy studio on the 12th floor with city and river views. Built for one or two guests: a comfortable queen bed, a small kitchenette, fast Wi-Fi and a rain shower. Everything you need for a short stay or a work trip, a few minutes from cafés and the riverside walk.",
        guestHouseRules: [
          "No smoking or vaping inside the unit.",
          "Quiet hours from 10:00 PM to 7:00 AM.",
          "No parties or events. Maximum of 2 guests.",
          "Please keep the balcony door closed when the aircon is on.",
          "Report any damage or issue to the host as soon as you notice it.",
        ],
        wifiName: "Hostayo-12B",
        wifiPassword: "riverside-12b",
        arrivalNotes: [
          "Check-in is from 3:00 PM. Message us when you are 30 minutes away.",
          "Go to the 12th floor and turn right. The unit is the second door on the left.",
          "The door uses a keypad. Your code is sent to you on the day of arrival.",
          "Parking is available on level B2. Ask the front desk for a guest pass.",
        ],
        checkoutSteps: [
          "Check out by 11:00 AM.",
          "Switch off the aircon, lights and TV.",
          "Put used towels in the bathroom basket and throw rubbish in the bin.",
          "Close the windows and lock the door behind you.",
        ],
        areaTips: [
          { title: "Coffee and breakfast", detail: "Two cafés on the ground floor open from 7:00 AM." },
          { title: "Groceries", detail: "A 24-hour convenience store is across the street." },
          { title: "Riverside walk", detail: "A 5 minute stroll from the lobby. Best at sunset." },
          { title: "Getting around", detail: "Grab and taxis are easy to book from the lobby." },
        ],
      })
      .where(eq(units.id, unit.id));

    const options = await db
      .select({ id: amenities.id })
      .from(amenities)
      .where(and(eq(amenities.organizationId, unit.organizationId), eq(amenities.scope, "unit"), inArray(amenities.name, UNIT_AMENITIES)));
    if (options.length) {
      await db.delete(unitAmenities).where(and(eq(unitAmenities.organizationId, unit.organizationId), eq(unitAmenities.unitId, unit.id)));
      await db.insert(unitAmenities).values(options.map((o) => ({ organizationId: unit.organizationId, unitId: unit.id, amenityId: o.id })));
    }
    console.log(`unit ${unit.id}: details updated, ${options.length} amenities linked`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
