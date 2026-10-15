import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/lib/search-query";

// A Thursday.
const TODAY = "2026-10-15";
const parse = (query: string) => parseSearchQuery(query, TODAY);

describe("parseSearchQuery", () => {
  it("leaves plain text alone", () => {
    expect(parse("maria santos")).toEqual({
      text: "maria santos",
      statuses: [],
      date: null,
    });
    expect(parse("   ")).toEqual({ text: "", statuses: [], date: null });
  });

  it("reads a single day as a stay on that night", () => {
    expect(parse("tomorrow").date).toEqual({
      kind: "staying",
      from: "2026-10-16",
      to: "2026-10-16",
    });
    expect(parse("yesterday").date?.from).toBe("2026-10-14");
    expect(parse("2026-12-25").date?.from).toBe("2026-12-25");
  });

  it("splits a name from a date", () => {
    const parsed = parse("maria oct 20");
    expect(parsed.text).toBe("maria");
    expect(parsed.date).toEqual({
      kind: "staying",
      from: "2026-10-20",
      to: "2026-10-20",
    });
    expect(parse("20 october maria")).toMatchObject({
      text: "maria",
      date: { from: "2026-10-20" },
    });
  });

  it("turns checkin and checkout into arrivals and departures", () => {
    expect(parse("checkin tomorrow").date).toEqual({
      kind: "arriving",
      from: "2026-10-16",
      to: "2026-10-16",
    });
    expect(parse("departing oct 3").date?.kind).toBe("departing");
    expect(parse("check-out today").date?.kind).toBe("departing");
  });

  it("means today when an arrival or departure has no date", () => {
    expect(parse("checkin").date).toEqual({
      kind: "arriving",
      from: TODAY,
      to: TODAY,
    });
    expect(parse("arriving").text).toBe("");
  });

  it("reads this week and next week as Monday to Sunday", () => {
    expect(parse("this week").date).toMatchObject({
      from: "2026-10-12",
      to: "2026-10-18",
    });
    expect(parse("checkout next week").date).toEqual({
      kind: "departing",
      from: "2026-10-19",
      to: "2026-10-25",
    });
  });

  it("collects statuses", () => {
    expect(parse("cancelled").statuses).toEqual(["cancelled"]);
    expect(parse("canceled ana").text).toBe("ana");
    expect(parse("holds confirmed").statuses).toEqual(["hold", "confirmed"]);
    expect(parse("in-house").statuses).toEqual(["checked_in"]);
  });

  it("keeps names that look like months until a day sits beside them", () => {
    expect(parse("may reyes")).toMatchObject({ text: "may reyes", date: null });
    expect(parse("june").date).toBeNull();
    expect(parse("may 5").date?.from).toBe("2026-05-05");
  });

  it("ignores dates that don't exist", () => {
    const parsed = parse("feb 30");
    expect(parsed.date).toBeNull();
    expect(parsed.text).toBe("feb 30");
    expect(parse("2026-13-01").date).toBeNull();
  });

  it("uses the first date and keeps the rest as text", () => {
    const parsed = parse("today tomorrow");
    expect(parsed.date?.from).toBe(TODAY);
    expect(parsed.text).toBe("tomorrow");
  });
});
