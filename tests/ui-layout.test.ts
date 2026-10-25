import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader, AppSidebar } from "@/components/app/sidebar";
import { MobileTabBar } from "@/components/app/mobile-tab-bar";
import { MobileBackHeader } from "@/components/app/mobile-back-header";
import { StepProgress } from "@/components/ui/step-progress";
import { Logo, LogoMark } from "@/components/logo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppLayout from "@/app/(app)/layout";
import {
  isL1,
  listMemberships,
  requireMembership,
  requireUser,
} from "@/lib/auth/session";
import { getOrganizationLogoUrl } from "@/server/orgs/service";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => ({ get: () => null })),
}));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));
vi.mock("@/lib/auth/session", async () =>
  (await import("./helpers/session-mock")).mockSessionModule({
    requireUser: vi.fn(),
    listMemberships: vi.fn(),
    isL1: vi.fn(),
  }),
);
vi.mock("@/server/orgs/service", () => ({ getOrganizationLogoUrl: vi.fn() }));

const identity = {
  organizationName: "Example stays",
  userName: "Test Owner",
  userEmail: "owner@example.com",
  role: "owner" as const,
};
const h = React.createElement;
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(usePathname).mockReturnValue("/calendar");
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    refresh: vi.fn(),
  } as never);
});

describe("branded app shell", () => {
  it("uses supplied brand assets rather than a redrawn SVG", () => {
    const logo = renderToStaticMarkup(h(Logo));
    expect(logo).toContain('aria-label="Hostayo"');
    expect(logo).toContain("/brand/hostayo-logo.png");
    expect(logo).not.toContain("<svg");
    expect(renderToStaticMarkup(h(LogoMark))).toContain(
      "/brand/hostayo-mark.png",
    );
  });

  it("keeps audit logs under settings rather than sidebar navigation", () => {
    const markup = renderToStaticMarkup(h(AppSidebar, identity));
    for (const href of [
      "/dashboard",
      "/calendar",
      "/reservations",
      "/properties",
      "/guests",
      "/tasks",
      "/reports",
      "/expenses",
      "/settings/general",
    ]) {
      expect(markup).toContain(`href="${href}"`);
    }
    expect(markup).not.toContain('href="/audit-logs"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain("Sign out");
    expect(markup).toContain("Version 0.9.0");
  });

  it("shows Settings to staff while keeping protected destinations hidden", () => {
    const markup = renderToStaticMarkup(
      h(AppSidebar, { ...identity, role: "staff" }),
    );
    for (const href of ["/reports", "/expenses", "/audit-logs"])
      expect(markup).not.toContain(`href="${href}`);
    expect(markup).toContain('href="/settings/general"');
    expect(markup).toContain('href="/tasks"');
    expect(markup).toContain('href="/reservations"');
  });

  it("shows Settings to operations managers", () => {
    const markup = renderToStaticMarkup(
      h(AppSidebar, { ...identity, role: "operations_manager" }),
    );
    expect(markup).toContain('href="/settings/general"');
  });

  it("selects only properties while editing a nested unit", () => {
    vi.mocked(usePathname).mockReturnValue(
      "/properties/property-a/units/unit-a/edit",
    );
    const markup = renderToStaticMarkup(h(AppSidebar, identity));
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    const propertiesLink = markup
      .match(/<a\b[^>]*>/g)
      ?.find((tag) => tag.includes('href="/properties"'));
    expect(propertiesLink).toContain('aria-current="page"');
  });

  it("provides account controls and a live clock, with phone navigation moved to the tab bar", () => {
    const markup = renderToStaticMarkup(
      h(AppHeader, { ...identity, initialNow: "2026-09-24T01:02:03.000Z" }),
    );
    expect(markup).not.toContain('action="/reservations"');
    expect(markup).not.toContain('name="q"');
    expect(markup).toContain('aria-label="Current date and time"');
    expect(markup).toContain('aria-label="Open account menu"');
    expect(markup).not.toContain('aria-label="Open navigation"');
    expect(markup).toContain("Example stays");
    expect(markup).not.toContain('<dialog aria-label="Navigation"');
  });

  it("renders the phone tab bar with the five main destinations", () => {
    vi.mocked(usePathname).mockReturnValue("/reservations/res-a/edit");
    const markup = renderToStaticMarkup(h(MobileTabBar, { role: "owner" }));
    const hrefs = [...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      "/dashboard",
      "/reservations",
      "/calendar",
      "/tasks",
      "/profile",
    ]);
    expect(markup).toContain("lg:hidden");
    // Only the tab holding the current page is marked.
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    const active = markup
      .match(/<a\b[^>]*>/g)
      ?.find((tag) => tag.includes('aria-current="page"'));
    expect(active).toContain('href="/reservations"');
  });

  it("keeps Profile lit on pages that have no tab, like Settings and Guests", () => {
    for (const path of ["/guests", "/settings/team", "/reports", "/profile"]) {
      vi.mocked(usePathname).mockReturnValue(path);
      const markup = renderToStaticMarkup(h(MobileTabBar, { role: "owner" }));
      const active = markup
        .match(/<a\b[^>]*>/g)
        ?.find((tag) => tag.includes('aria-current="page"'));
      expect(active, path).toContain('href="/profile"');
    }
  });

  it("does not light Home on pages beneath other tabs", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    const home = renderToStaticMarkup(h(MobileTabBar, { role: "owner" }));
    expect(home).toMatch(
      /aria-current="page"[^>]*href="\/dashboard"|href="\/dashboard"[^>]*aria-current="page"/,
    );
  });

  it("hides tabs the member has no permission for", () => {
    const markup = renderToStaticMarkup(
      h(MobileTabBar, { role: "staff", permissions: ["tasks.view"] }),
    );
    expect(markup).toContain('href="/tasks"');
    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain('href="/profile"');
    expect(markup).not.toContain('href="/reservations"');
    expect(markup).not.toContain('href="/calendar"');
  });

  it("keeps the shared header and sidebar outside the content scroll region", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: "user-a",
      name: identity.userName,
      email: identity.userEmail,
    } as Awaited<ReturnType<typeof requireUser>>);
    vi.mocked(requireMembership).mockResolvedValue({
      userId: "user-a",
      organizationId: "org-a",
      organizationName: identity.organizationName,
      organizationSlug: "example",
      role: "owner",
    });
    vi.mocked(listMemberships).mockResolvedValue([
      {
        organizationId: "org-a",
        organizationName: identity.organizationName,
        organizationSlug: "example",
        role: "owner",
        blockedAt: null,
      },
    ]);
    vi.mocked(isL1).mockResolvedValue(false);
    vi.mocked(getOrganizationLogoUrl).mockResolvedValue(null);
    const markup = renderToStaticMarkup(
      await AppLayout({ children: h("p", null, "Page content") }),
    );
    expect(requireMembership).toHaveBeenCalledOnce();
    expect(markup).toContain("h-dvh overflow-hidden");
    expect(markup).toContain("flex-col overflow-hidden");
    expect(markup).toMatch(/<main[^>]*overflow-y-auto/);
    expect(markup.indexOf('data-testid="app-header"')).toBeLessThan(
      markup.indexOf("<main"),
    );
    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain("Page content");
  });
});

describe("shared table", () => {
  it("keeps native semantics and contains wide content in its own scroller", () => {
    const markup = renderToStaticMarkup(
      h(
        Table,
        { className: "min-w-160" },
        h(
          TableHeader,
          null,
          h(TableRow, null, h(TableHead, { scope: "col" }, "Guest")),
        ),
        h(
          TableBody,
          null,
          h(TableRow, null, h(TableCell, null, "Example Guest")),
        ),
      ),
    );
    expect(markup).toContain('data-slot="table-container"');
    expect(markup).toContain("overflow-x-auto");
    for (const tag of ["table", "thead", "tbody", "tr", "th", "td"])
      expect(markup).toContain(`<${tag}`);
    expect(markup).toContain('scope="col"');
    expect(markup).toContain("min-w-160");
  });
});

describe("phone form chrome", () => {
  const items = [
    { key: "stay", label: "Stay", done: true, onSelect: vi.fn() },
    { key: "guests", label: "Guests", onSelect: vi.fn() },
    { key: "charges", label: "Charges", disabled: true, onSelect: vi.fn() },
    { key: "review", label: "Review", disabled: true, onSelect: vi.fn() },
  ];

  it("shows which step you are on, and locks the ones you cannot reach yet", () => {
    const markup = renderToStaticMarkup(
      h(StepProgress, { items, current: "guests", label: "Reservation steps" }),
    );
    expect(markup).toContain("Step 2 of 4");
    expect(markup).toContain("Guests");
    expect(markup).toContain('aria-label="Reservation steps"');
    expect(markup).toContain('aria-current="step"');
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Stay, done"');
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    // Wide screens show the tab bar instead.
    expect(markup).toContain("lg:hidden");
  });

  it("gives phone forms a back button and a short title", () => {
    const markup = renderToStaticMarkup(
      h(MobileBackHeader, {
        title: "Edit reservation",
        subtitle: "Maria · #ABC12345",
        backHref: "/reservations/abc",
        backLabel: "Back to reservation",
      }),
    );
    expect(markup).toContain('href="/reservations/abc"');
    expect(markup).toContain('aria-label="Back to reservation"');
    expect(markup).toContain("Edit reservation");
    expect(markup).toContain("Maria · #ABC12345");
  });
});
