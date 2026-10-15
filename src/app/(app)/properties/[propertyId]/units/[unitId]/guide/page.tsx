import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getPropertyOrThrow, getUnitOrThrow } from "@/server/inventory/service";
import { InventoryError } from "@/server/inventory/validation";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { updateUnitGuideAction } from "../../../../actions";
import { CreateSteps, UNIT_STEPS } from "../../../../create-steps";
import { UnitGuideForm } from "../../../../guide-form";
import { SectionTabs, unitTabs } from "../../../../section-tabs";

export const metadata: Metadata = { title: "Guest guide" };

export default async function UnitGuidePage({
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
  const photosHref = `${unitHref}/photos?new=1`;

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title={justCreated ? "Write the guest guide" : "Guest guide"}
        description={
          justCreated
            ? `What guests read about ${unit.name}: Wi-Fi, house rules, how to arrive. You can skip this and add it later.`
            : `${unit.name} · ${property.name}`
        }
        backHref={unitHref}
        backLabel={unit.name}
      />
      {justCreated ? (
        <CreateSteps current={3} steps={UNIT_STEPS} />
      ) : (
        <SectionTabs tabs={unitTabs(property.id, unit.id)} current="guide" />
      )}
      <UnitGuideForm
        action={updateUnitGuideAction.bind(null, property.id, unit.id)}
        destination={justCreated ? photosHref : unitHref}
        successMessage={justCreated ? "Guest guide saved." : "Guest guide updated."}
        cancelHref={justCreated ? photosHref : unitHref}
        cancelLabel={justCreated ? "Skip for now" : "Cancel"}
        submitLabel={justCreated ? "Save and continue" : "Save guide"}
        unitName={unit.name}
        propertyName={property.name}
        values={{
          description: unit.description ?? "",
          wifiName: unit.wifiName ?? "",
          wifiPassword: unit.wifiPassword ?? "",
          houseRules: unit.guestHouseRules.join("\n"),
          arrivalNotes: unit.arrivalNotes.join("\n"),
          checkoutSteps: unit.checkoutSteps.join("\n"),
          areaTips: unit.areaTips,
        }}
      />
    </div>
  );
}
