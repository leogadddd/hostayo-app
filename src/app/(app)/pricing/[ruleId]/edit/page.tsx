import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { todayInTimeZone } from "@/lib/dates";
import { getPricingRule } from "@/server/pricing/service";
import { updatePricingRuleAction } from "../../actions";
import { loadPricingFormData } from "../../form-data";
import { RuleForm } from "../../rule-form";

export const metadata: Metadata = { title: "Edit pricing rule" };

export default async function EditPricingRulePage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const membership = await requirePermission("pricing.update");
  if (!membership) return <PermissionDenied />;
  const { ruleId } = await params;
  const rule = await getPricingRule(membership.organizationId, ruleId);
  if (!rule) notFound();
  const data = await loadPricingFormData(membership.organizationId);
  const magnitude = Math.abs(rule.adjustmentValue);
  return (
    <div className="min-w-0">
      <PageHeading
        title={rule.name}
        description="Edit when and where this rule applies. The preview shows the result as you change it."
        backHref="/pricing"
        backLabel="Pricing rules"
      />
      <RuleForm
        action={updatePricingRuleAction.bind(null, rule.id)}
        submitLabel="Save changes"
        successMessage="Pricing rule saved."
        today={todayInTimeZone(data.timeZone)}
        properties={data.properties}
        previewUnits={data.previewUnits}
        otherRules={data.activeRules.filter((other) => other.id !== rule.id)}
        values={{
          name: rule.name,
          isActive: rule.isActive,
          priority: String(rule.priority),
          stacks: rule.stacks,
          startDate: rule.startDate ?? "",
          endDate: rule.endDate ?? "",
          repeatsYearly: rule.repeatsYearly,
          weekdays: [...rule.weekdays],
          adjustmentType: rule.adjustmentType,
          direction: rule.adjustmentValue < 0 ? "decrease" : "increase",
          adjustmentAmount: String(magnitude / 100),
          appliesToAll: rule.appliesToAll,
          propertyIds: [...rule.propertyIds],
          unitIds: [...rule.unitIds],
        }}
      />
    </div>
  );
}
