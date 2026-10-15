import { describe, expect, it } from "vitest";
import { matchPages } from "@/lib/search-pages";

const PAGES = [
  { label: "Dashboard" },
  { label: "Reservations", group: "Bookings" },
  { label: "Guests", group: "Bookings" },
  { label: "Platform fees", group: "Tools", keywords: "airbnb commission" },
  { label: "Rate calculator", group: "Tools" },
  { label: "Expenses", group: "Money" },
];
const labels = (query: string) =>
  matchPages(PAGES, query).map((page) => page.label);

describe("matchPages", () => {
  it("matches nothing for an empty query", () => {
    expect(labels("  ")).toEqual([]);
  });

  it("ranks label prefixes first, ignoring case", () => {
    expect(labels("RES")).toEqual(["Reservations"]);
    expect(labels("fees")).toEqual(["Platform fees"]);
    // A label word that starts with it beats a match inside a word.
    expect(labels("p")).toEqual(["Platform fees", "Expenses"]);
  });

  it("finds pages by section and keywords", () => {
    expect(labels("tools")).toEqual(["Platform fees", "Rate calculator"]);
    expect(labels("airbnb")).toEqual(["Platform fees"]);
  });

  it("requires every word to match", () => {
    expect(labels("tools calc")).toEqual(["Rate calculator"]);
    expect(labels("guests nobody")).toEqual([]);
  });
});
