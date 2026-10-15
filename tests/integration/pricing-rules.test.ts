import { describe, expect, it } from "vitest";
import {
  createPricingRule,
  deletePricingRule,
  getPricingRule,
  listPricingRules,
  PricingRuleError,
  setPricingRuleActive,
  updatePricingRule,
} from "@/server/pricing/service";
import { resolveNightlyRate } from "@/lib/pricing-rules";
import { createTestOrg } from "./helpers";

const PEAK = {
  name: "Christmas peak",
  priority: 100,
  startDate: "2025-12-15",
  endDate: "2026-01-05",
  repeatsYearly: true,
  adjustmentType: "percent" as const,
  adjustmentValue: 2500,
};

describe("pricing rules", () => {
  it("creates, edits, toggles and removes an organization's rules", async () => {
    const { org, owner } = await createTestOrg("pricing-rules");
    const args = { organizationId: org.id, actorUserId: owner.id };
    const peak = await createPricingRule({ ...args, data: PEAK });
    const weekend = await createPricingRule({
      ...args,
      data: {
        name: "Weekends",
        priority: 200,
        weekdays: ["5", "6"],
        adjustmentType: "amount",
        adjustmentValue: 100000,
        appliesToAll: false,
        propertyIds: ["11111111-1111-4111-8111-111111111111"],
      },
    });

    // Highest priority first.
    expect((await listPricingRules(org.id)).map((r) => r.name)).toEqual([
      "Weekends",
      "Christmas peak",
    ]);

    await setPricingRuleActive({
      ...args,
      ruleId: weekend.id,
      isActive: false,
    });
    expect(
      (await listPricingRules(org.id, { activeOnly: true })).map((r) => r.name),
    ).toEqual(["Christmas peak"]);

    await updatePricingRule({
      ...args,
      ruleId: peak.id,
      data: { ...PEAK, adjustmentValue: 3000, stacks: true },
    });
    const saved = await getPricingRule(org.id, peak.id);
    expect(saved).toMatchObject({ adjustmentValue: 3000, stacks: true });
    expect(
      resolveNightlyRate(
        "2030-12-24",
        { id: "u", propertyId: "p", nightlyRateCents: 100000 },
        [saved!],
      ).cents,
    ).toBe(130000);

    await deletePricingRule({ ...args, ruleId: weekend.id });
    expect(await getPricingRule(org.id, weekend.id)).toBeNull();
  });

  it("keeps rules private to their organization", async () => {
    const first = await createTestOrg("pricing-a");
    const second = await createTestOrg("pricing-b");
    const rule = await createPricingRule({
      organizationId: first.org.id,
      actorUserId: first.owner.id,
      data: PEAK,
    });
    expect(await listPricingRules(second.org.id)).toEqual([]);
    expect(await getPricingRule(second.org.id, rule.id)).toBeNull();
    await expect(
      deletePricingRule({
        organizationId: second.org.id,
        actorUserId: second.owner.id,
        ruleId: rule.id,
      }),
    ).rejects.toBeInstanceOf(PricingRuleError);
  });

  it("rejects rules that make no sense", async () => {
    const { org, owner } = await createTestOrg("pricing-invalid");
    const create = (data: Record<string, unknown>) =>
      createPricingRule({
        organizationId: org.id,
        actorUserId: owner.id,
        data: { ...PEAK, ...data } as never,
      });
    await expect(create({ endDate: undefined })).rejects.toThrow("both");
    await expect(
      create({
        repeatsYearly: false,
        startDate: "2026-12-31",
        endDate: "2026-12-01",
      }),
    ).rejects.toThrow("can't be before");
    await expect(
      create({ adjustmentType: "fixed", adjustmentValue: -1 }),
    ).rejects.toThrow("negative");
    await expect(create({ adjustmentValue: -10001 })).rejects.toThrow("100%");
    await expect(create({ appliesToAll: false })).rejects.toThrow(
      "pick at least one",
    );
  });
});
