import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { todayInTimeZone } from "@/lib/dates";
import { DEFAULT_RULE_PRIORITY } from "@/lib/pricing-rules";
import { createPricingRuleAction } from "../actions";
import { RuleForm } from "../rule-form";
import { loadPricingFormData } from "../form-data";

export const metadata: Metadata = { title: "Add pricing rule" };

export default async function NewPricingRulePage() {
  const membership = await requirePermission("pricing.create");
  if (!membership) return <PermissionDenied />;
  const data = await loadPricingFormData(membership.organizationId);
  return (
    <div className="min-w-0">
      <PageHeading
        title="Add pricing rule"
        description="Change nightly prices for certain dates, days of the week, or both. The preview shows the result as you type."
        backHref="/pricing"
        backLabel="Pricing rules"
      />
      <RuleForm
        action={createPricingRuleAction}
        submitLabel="Add rule"
        successMessage="Pricing rule added."
        today={todayInTimeZone(data.timeZone)}
        properties={data.properties}
        previewUnits={data.previewUnits}
        otherRules={data.activeRules}
        values={{
          name: "",
          isActive: true,
          priority: String(DEFAULT_RULE_PRIORITY),
          stacks: false,
          startDate: "",
          endDate: "",
          repeatsYearly: false,
          weekdays: [],
          adjustmentType: "percent",
          direction: "increase",
          adjustmentAmount: "",
          appliesToAll: true,
          propertyIds: [],
          unitIds: [],
        }}
      />
    </div>
  );
}
