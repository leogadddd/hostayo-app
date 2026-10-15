import { describe, expect, it } from "vitest";
import {
  availabilityStrip,
  isNightBooked,
  nextOpenDate,
} from "@/lib/public-availability";

const BOOKED = [
  { checkIn: "2026-10-15", checkOut: "2026-10-17" },
  { checkIn: "2026-10-20", checkOut: "2026-10-22" },
];

describe("public availability", () => {
  it("holds the check-in night but frees the check-out day", () => {
    expect(isNightBooked(BOOKED, "2026-10-15")).toBe(true);
    expect(isNightBooked(BOOKED, "2026-10-16")).toBe(true);
    expect(isNightBooked(BOOKED, "2026-10-17")).toBe(false);
  });

  it("finds the first free night from today", () => {
    expect(nextOpenDate(BOOKED, "2026-10-15")).toBe("2026-10-17");
    expect(nextOpenDate(BOOKED, "2026-10-17")).toBe("2026-10-17");
    expect(nextOpenDate([], "2026-10-15")).toBe("2026-10-15");
  });

  it("returns null when nothing is free for a year", () => {
    expect(
      nextOpenDate(
        [{ checkIn: "2026-01-01", checkOut: "2028-01-01" }],
        "2026-10-15",
      ),
    ).toBeNull();
  });

  it("lays out the next days as free or booked", () => {
    const strip = availabilityStrip(BOOKED, "2026-10-15", 8);
    expect(strip).toHaveLength(8);
    expect(strip.map((day) => day.free)).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
    ]);
    expect(strip[0]?.date).toBe("2026-10-15");
    expect(strip[7]?.date).toBe("2026-10-22");
  });
});
