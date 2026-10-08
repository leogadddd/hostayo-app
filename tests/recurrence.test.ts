import { describe, expect, it } from "vitest";
import {
  monthlyEquivalentCents,
  nextDueAfter,
  occurrence,
} from "@/lib/recurrence";

describe("occurrence", () => {
  it("steps weekly", () => {
    expect(occurrence("2026-10-07", "weekly", 2)).toBe("2026-10-21");
  });
  it("keeps the anchor day across short months and returns to it", () => {
    expect(occurrence("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(occurrence("2026-01-31", "monthly", 2)).toBe("2026-03-31");
    expect(occurrence("2026-01-31", "monthly", 3)).toBe("2026-04-30");
  });
  it("rolls over the year", () => {
    expect(occurrence("2026-11-15", "monthly", 3)).toBe("2027-02-15");
  });
  it("clamps Feb 29 on non-leap years", () => {
    expect(occurrence("2028-02-29", "yearly", 1)).toBe("2029-02-28");
    expect(occurrence("2028-02-29", "yearly", 4)).toBe("2032-02-29");
  });
});

describe("nextDueAfter", () => {
  it("returns the anchor when it is still ahead", () => {
    expect(nextDueAfter("2026-10-10", "monthly", "2026-10-01")).toBe(
      "2026-10-10",
    );
  });
  it("is strictly after the given date", () => {
    expect(nextDueAfter("2026-10-10", "monthly", "2026-10-10")).toBe(
      "2026-11-10",
    );
  });
  it("derives from the anchor, not the previous date, so the day never drifts", () => {
    expect(nextDueAfter("2026-01-31", "monthly", "2026-02-28")).toBe(
      "2026-03-31",
    );
  });
});

describe("monthlyEquivalentCents", () => {
  it("normalizes each cadence to a month", () => {
    expect(monthlyEquivalentCents(54_900, "monthly")).toBe(54_900);
    expect(monthlyEquivalentCents(1_200_000, "yearly")).toBe(100_000);
    expect(monthlyEquivalentCents(100_000, "weekly")).toBe(433_333);
  });
});
