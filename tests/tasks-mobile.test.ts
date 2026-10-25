import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/app/mobile-search", () => ({
  MobileSearch: () => null,
}));

import { MobileTasks, type PhoneTask } from "@/app/(app)/tasks/mobile";

const task = (over: Partial<PhoneTask>): PhoneTask => ({
  id: "t1",
  unitName: "Unit 12B",
  propertyName: "Riverside",
  status: "open",
  doneItems: 0,
  totalItems: 10,
  requiredLeft: 8,
  checkedOut: "Oct 20, 3:15 PM",
  markedReady: "—",
  ...over,
});

function render(tasks: PhoneTask[], canWork = true) {
  return renderToStaticMarkup(
    createElement(MobileTasks, {
      search: {} as never,
      tasks,
      counts: { open: 1, ready: 1 },
      allCount: 2,
      query: "",
      showProperty: false,
      canWork,
      filtered: false,
      hrefWith: () => "/tasks",
    }),
  );
}

describe("phone tasks list", () => {
  it("offers Start on an untouched task and Resume once started", () => {
    expect(render([task({})])).toContain("Start turnover");
    expect(render([task({ doneItems: 3 })])).toContain("Resume");
  });

  it("hides the work button from people who can't update tasks", () => {
    expect(render([task({})], false)).not.toContain("Start turnover");
  });

  it("shows a ready task with its ready time and no work button", () => {
    const html = render([
      task({ status: "ready", doneItems: 10, markedReady: "Oct 21, 9:00 AM" }),
    ]);
    expect(html).toContain("Ready Oct 21, 9:00 AM");
    expect(html).not.toContain("Start turnover");
  });
});
