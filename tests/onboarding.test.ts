import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDemoAccountStatus,
  requireMembership,
  requireUser,
  type MembershipContext,
} from "@/lib/auth/session";
import * as orgs from "@/server/orgs/service";
import {
  saveOperationAction,
  saveOrganizationAction,
  saveWorkflowAction,
} from "@/app/onboarding/actions";
import {
  getOnboardingState,
  guardOnboardingStep,
  nextOnboardingPath,
  type OnboardingState,
} from "@/app/onboarding/state";

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  requireUser: vi.fn(),
  requireMembership: vi.fn(),
  getDemoAccountStatus: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: {} }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      organizations: {
        findFirst: vi.fn(async () => ({ defaultTimezone: "Asia/Singapore" })),
      },
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/orgs/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/orgs/service")>()),
  createOrganization: vi.fn(),
  updateOrganizationName: vi.fn(),
  saveOnboardingProfile: vi.fn(),
}));
vi.mock("@/app/onboarding/state", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/onboarding/state")>()),
  getOnboardingState: vi.fn(),
}));

const owner: MembershipContext = {
  organizationId: "org-1",
  organizationName: "Test stays",
  organizationSlug: "test-stays",
  userId: "user-1",
  role: "owner",
};
const membership = {
  organizationId: "org-1",
  organizationName: "Test stays",
  organizationSlug: "test-stays",
  role: "owner" as const,
  blockedAt: null,
};
const empty: OnboardingState = { membership: null, profile: null };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function withState(state: Partial<OnboardingState>) {
  vi.mocked(getOnboardingState).mockResolvedValue({ ...empty, ...state });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-1" } as Awaited<
    ReturnType<typeof requireUser>
  >);
  vi.mocked(requireMembership).mockResolvedValue(owner);
  vi.mocked(getDemoAccountStatus).mockResolvedValue(false);
  withState({});
});

describe("saveOrganizationAction", () => {
  it("creates the organization on the first visit", async () => {
    expect(
      await saveOrganizationAction({}, form({ name: " Test stays " })),
    ).toEqual({ success: true });
    expect(orgs.createOrganization).toHaveBeenCalledWith({
      name: "Test stays",
      ownerUserId: "user-1",
    });
  });

  it("renames it when the owner comes back and changes the name", async () => {
    withState({ membership });
    await saveOrganizationAction({}, form({ name: "Dela Cruz Stays" }));
    expect(orgs.createOrganization).not.toHaveBeenCalled();
    expect(orgs.updateOrganizationName).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      name: "Dela Cruz Stays",
    });
  });

  it("does nothing when the name is unchanged", async () => {
    withState({ membership });
    expect(
      await saveOrganizationAction({}, form({ name: "Test stays" })),
    ).toEqual({ success: true });
    expect(orgs.createOrganization).not.toHaveBeenCalled();
    expect(orgs.updateOrganizationName).not.toHaveBeenCalled();
  });

  it("shows the service's validation message", async () => {
    vi.mocked(orgs.createOrganization).mockRejectedValue(
      new orgs.OrgError(
        "Organization name needs at least 2 characters.",
        "name",
      ),
    );
    const state = await saveOrganizationAction({}, form({ name: "x" }));
    expect(state.error).toMatch(/at least 2 characters/);
  });
});

describe("saveOperationAction", () => {
  it("saves the answers and ignores values it doesn't know", async () => {
    expect(
      await saveOperationAction(
        {},
        form({ unitCount: "2-5", monthlyBookings: "<script>" }),
      ),
    ).toEqual({ success: true });
    expect(orgs.saveOnboardingProfile).toHaveBeenCalledWith({
      organizationId: "org-1",
      answers: { unitCount: "2-5", monthlyBookings: undefined },
    });
  });

  it("rejects staff", async () => {
    vi.mocked(requireMembership).mockResolvedValue({ ...owner, role: "staff" });
    expect(
      (await saveOperationAction({}, form({ unitCount: "1" }))).error,
    ).toBeTruthy();
    expect(orgs.saveOnboardingProfile).not.toHaveBeenCalled();
  });
});

describe("saveWorkflowAction", () => {
  it("saves distinct known sources", async () => {
    const data = form({ teamSize: "solo", currentTool: "spreadsheet" });
    data.append("sources", "airbnb");
    data.append("sources", "airbnb");
    data.append("sources", "bogus");
    data.append("sources", "facebook");
    expect(await saveWorkflowAction({}, data)).toEqual({ success: true });
    expect(orgs.saveOnboardingProfile).toHaveBeenCalledWith({
      organizationId: "org-1",
      answers: {
        sources: ["airbnb", "facebook"],
        teamSize: "solo",
        currentTool: "spreadsheet",
      },
    });
  });
});

describe("onboarding routing", () => {
  it("finds the first missing step", () => {
    expect(nextOnboardingPath(empty)).toBe("/onboarding/organization");
    expect(nextOnboardingPath({ ...empty, membership })).toBe(
      "/onboarding/operation",
    );
    expect(
      nextOnboardingPath({ membership, profile: { unitCount: "1" } }),
    ).toBe("/onboarding/workflow");
    expect(nextOnboardingPath({ membership, profile: { sources: [] } })).toBe(
      "/onboarding/welcome",
    );
  });

  it("lets owners revisit finished steps but not jump ahead", () => {
    const done = { membership, profile: { sources: [] } };
    expect(guardOnboardingStep(done, "organization")).toBeNull();
    expect(guardOnboardingStep(done, "operation")).toBeNull();
    expect(guardOnboardingStep(done, "workflow")).toBeNull();
    expect(guardOnboardingStep(empty, "operation")).toBe(
      "/onboarding/organization",
    );
  });

  it("sends staff to the dashboard", () => {
    const staff = {
      ...empty,
      membership: { ...membership, role: "staff" as const },
    };
    expect(nextOnboardingPath(staff)).toBe("/dashboard");
    expect(guardOnboardingStep(staff, "organization")).toBe("/dashboard");
  });
});
