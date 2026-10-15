import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { centavosToPesosInput } from "@/lib/money";
import { effectiveDayRates } from "@/lib/rates";
import { getPropertyOrThrow, getUnitOrThrow } from "@/server/inventory/service";
import { InventoryError } from "@/server/inventory/validation";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { updateUnitPricingAction } from "../../../../actions";
import { CreateSteps, UNIT_STEPS } from "../../../../create-steps";
import { UnitPricingForm } from "../../../../pricing-form";
import { SectionTabs, unitTabs } from "../../../../section-tabs";

export const metadata: Metadata = { title: "Unit pricing" };

export default async function UnitPricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string; unitId: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const membership = await requirePermission("properties.update");
  if (!membership) return <PermissionDenied />;
  const { propertyId, unitId } = await params;
  const justCreated = (await searchParams).new === "1";
  let property;
  let unit;
  try {
    property = await getPropertyOrThrow(membership.organizationId, propertyId);
    unit = await getUnitOrThrow(membership.organizationId, unitId);
  } catch (error) {
    if (error instanceof InventoryError) notFound();
    throw error;
  }
  if (unit.propertyId !== property.id) notFound();
  const unitHref = `/properties/${property.id}/units/${unit.id}`;
  const nextHref = `${unitHref}/guide?new=1`;

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeading
        title={justCreated ? "Set your pricing" : "Pricing"}
        description={
          justCreated
            ? `${unit.name} is saved. Set what it charges, or skip and do it later.`
            : `${unit.name} · ${property.name}`
        }
        backHref={unitHref}
        backLabel={unit.name}
      />
      {justCreated ? (
        <CreateSteps current={2} steps={UNIT_STEPS} />
      ) : (
        <SectionTabs tabs={unitTabs(property.id, unit.id)} current="pricing" />
      )}
      <UnitPricingForm
        action={updateUnitPricingAction.bind(null, property.id, unit.id)}
        destination={justCreated ? nextHref : unitHref}
        successMessage={justCreated ? "Pricing saved." : "Pricing updated."}
        cancelHref={justCreated ? nextHref : unitHref}
        cancelLabel={justCreated ? "Skip for now" : "Cancel"}
        submitLabel={justCreated ? "Save and continue" : "Save pricing"}
        unitName={unit.name}
        propertyName={property.name}
        values={{
          nightlyRate: centavosToPesosInput(unit.defaultNightlyRateCents),
          cleaningFee: centavosToPesosInput(unit.cleaningFeeCents),
          securityDeposit: centavosToPesosInput(unit.securityDepositCents),
          dayRates: Object.fromEntries(
            Object.entries(
              effectiveDayRates(unit.defaultNightlyRateCents, unit.dayRates),
            ).map(([day, cents]) => [day, centavosToPesosInput(cents)]),
          ),
          reservationFeeType: unit.reservationFeeType ?? "",
          reservationFeeAmount:
            unit.reservationFeeAmount === null
              ? ""
              : unit.reservationFeeType === "percent"
                ? String(unit.reservationFeeAmount / 100)
                : centavosToPesosInput(unit.reservationFeeAmount),
          extensionsEnabled: unit.extensionsEnabled,
          maxExtensionHours: String(unit.maxExtensionHours),
          extensionHourlyRate: centavosToPesosInput(
            unit.extensionHourlyRateCents,
          ),
        }}
      />
    </div>
  );
}
