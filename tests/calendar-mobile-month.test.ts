import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MobileMonth,
  type PhoneEvent,
} from "@/app/(app)/calendar/mobile-month";

const stay: PhoneEvent = {
  id: "s1",
  kind: "stay",
  status: "confirmed",
  title: "Maria Santos",
  unitLabel: "Unit 12B",
  startDate: "2026-10-20",
  endDate: "2026-10-23",
  href: "/reservations/s1",
};
const block: PhoneEvent = {
  id: "b1",
  kind: "block",
  title: "Repairs",
  unitLabel: "Unit 12B",
  startDate: "2026-10-21",
  endDate: "2026-10-22",
};

function render(today: string, events: PhoneEvent[]) {
  return renderToStaticMarkup(
    createElement(MobileMonth, {
      month: "2026-10",
      monthLabel: "October 2026",
      today,
      events,
      previousHref: "/calendar?month=2026-09",
      nextHref: "/calendar?month=2026-11",
      todayHref: "/calendar",
      viewSwitcher: null,
      canBook: true,
    }),
  );
}

describe("phone calendar month", () => {
  it("starts on today and lists what is happening that day", () => {
    const html = render("2026-10-21", [stay, block]);
    expect(html).toContain("Wed, Oct 21");
    expect(html).toContain("Staying · 1");
    expect(html).toContain("Night 2 of 3");
    expect(html).toContain("Blocked · 1");
    expect(html).toContain('href="/reservations/s1"');
  });

  it("says the day is free when nothing is booked", () => {
    expect(render("2026-10-05", [stay])).toContain("This day is free");
  });

  it("marks arrival and departure days", () => {
    expect(render("2026-10-20", [stay])).toContain("Arriving · 1");
    expect(render("2026-10-23", [stay])).toContain("Leaving · 1");
  });

  it("offers booking on the selected day", () => {
    expect(render("2026-10-21", [])).toContain("checkIn=2026-10-21");
  });
});
