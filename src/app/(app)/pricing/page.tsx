import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { todayInTimeZone } from "@/lib/dates";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { EmptyState } from "@/components/ui/empty-state";
import { listProperties, listOrgUnits } from "@/server/inventory/service";
import { listPricingRules } from "@/server/pricing/service";
import { PricePreview, type PreviewUnit } from "./price-preview";
import { RulesList, type RuleRow } from "./rules-list";
import { ruleScope } from "./rule-scope";

export const metadata: Metadata = { title: "Pricing rules" };

export default async function PricingPage() {
  const membership = await requirePermission("pricing.view");
  if (!membership) return <PermissionDenied />;
  const [rules, properties, units] = await Promise.all([
    listPricingRules(membership.organizationId),
    listProperties(membership.organizationId),
    listOrgUnits(membership.organizationId),
  ]);
  const propertyName = new Map(properties.map((p) => [p.id, p.name]));
  const previewUnits: PreviewUnit[] = units.map((unit) => ({
    id: unit.id,
    propertyId: unit.propertyId,
    name: unit.name,
    propertyName: propertyName.get(unit.propertyId) ?? "",
    nightlyRateCents: unit.defaultNightlyRateCents,
    dayRates: unit.dayRates,
  }));
  const rows: RuleRow[] = rules.map((rule) => ({
    ...rule,
    ...ruleScope(rule, properties, units),
  }));
  const timeZone = properties[0]?.timezone ?? "Asia/Manila";
  const canCreate = can(membership, "pricing.create");

  return (
    <div className="min-w-0 space-y-6">
      <PageHeading
        title="Pricing rules"
        description="Seasonal, weekend and holiday pricing for all your units. Rules sit on top of each unit's regular and day-of-week rates, and only affect new quotes and reservations."
      >
        {canCreate ? (
          <Link
            href="/pricing/new"
            className={buttonClassName("primary", "md")}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add rule
          </Link>
        ) : null}
      </PageHeading>

      <Card className="overflow-hidden bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg text-pine">Rules</h2>
            <InfoTip>
              For each night, the matching rule with the highest priority wins.
              Rules marked Stacks always apply on top of it.
            </InfoTip>
          </div>
        </CardHeader>
        {rows.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No pricing rules yet"
              description="Add a rule for peak season, holidays or weekends, and choose which properties and units it applies to."
            />
          </CardBody>
        ) : (
          <RulesList
            rules={rows}
            canUpdate={can(membership, "pricing.update")}
            canDelete={can(membership, "pricing.delete")}
          />
        )}
      </Card>

      <PricePreview
        units={previewUnits}
        rules={rules.filter((rule) => rule.isActive)}
        today={todayInTimeZone(timeZone)}
      />
    </div>
  );
}
