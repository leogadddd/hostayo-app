import { describe, expect, it } from "vitest";
import {
  defaultHourlyRateCents,
  extensionHourlyRateCents,
  extensionWindow,
  lateCheckoutBlocksArrival,
  stayHours,
} from "@/lib/extensions";

const at = (time: string) => new Date(`2026-10-03T${time}:00+08:00`);
const base = {
  checkoutAt: at("11:00"),
  extendedHours: 0,
  maxHours: 6,
  turnoverMinutes: 120,
  nextArrivalAt: null,
  dayEndsAt: new Date("2026-10-04T00:00:00+08:00"),
};

describe("stay extensions", () => {
  it("measures a stay from check-in to check-out", () => {
    expect(stayHours(2, "15:00", "11:00")).toBe(44);
    expect(stayHours(1, "14:00", "12:00")).toBe(22);
  });

  it("spreads the accommodation total over the stay, in whole pesos", () => {
    expect(defaultHourlyRateCents(880_000, 44)).toBe(20_000);
    expect(defaultHourlyRateCents(1_000_000, 44)).toBe(22_700);
    expect(defaultHourlyRateCents(0, 44)).toBe(0);
    expect(extensionHourlyRateCents(15_000, 880_000, 44)).toBe(15_000);
    expect(extensionHourlyRateCents(null, 880_000, 44)).toBe(20_000);
  });

  it("leaves room for turnover before a same-day arrival", () => {
    // 11:00 check-out, 15:00 arrival, 2h turnover: 2 hours fit.
    expect(
      extensionWindow({ ...base, nextArrivalAt: at("15:00") }),
    ).toMatchObject({ availableHours: 2, limitedBy: "next_arrival" });
    // With 1h already added, one more fits.
    expect(
      extensionWindow({
        ...base,
        extendedHours: 1,
        nextArrivalAt: at("15:00"),
      }),
    ).toMatchObject({ availableHours: 1, departureAt: at("12:00") });
    // Turnover already too long: nothing fits.
    expect(
      extensionWindow({
        ...base,
        turnoverMinutes: 300,
        nextArrivalAt: at("15:00"),
      }).availableHours,
    ).toBe(0);
  });

  it("caps at the unit's limit, then midnight", () => {
    expect(extensionWindow(base)).toMatchObject({
      availableHours: 6,
      limitedBy: "unit_limit",
    });
    expect(extensionWindow({ ...base, extendedHours: 6 })).toMatchObject({
      availableHours: 0,
      limitedBy: "unit_limit",
    });
    expect(
      extensionWindow({ ...base, checkoutAt: at("20:00"), maxHours: 12 }),
    ).toMatchObject({ availableHours: 4, limitedBy: "end_of_day" });
  });

  it("blocks an arrival while the late check-out's turnover runs", () => {
    expect(lateCheckoutBlocksArrival(at("13:00"), 120, at("15:00"))).toBe(
      false,
    );
    expect(lateCheckoutBlocksArrival(at("14:00"), 120, at("15:00"))).toBe(true);
  });
});
