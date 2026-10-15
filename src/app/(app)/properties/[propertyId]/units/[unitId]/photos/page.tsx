import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getPropertyOrThrow, getUnitOrThrow } from "@/server/inventory/service";
import { listGalleryPhotos } from "@/server/inventory/gallery";
import { InventoryError } from "@/server/inventory/validation";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { CreateSteps, UNIT_STEPS } from "../../../../create-steps";
import { PhotosPage } from "../../../../photos-page";
import { SectionTabs, unitTabs } from "../../../../section-tabs";

export const metadata: Metadata = { title: "Unit photos" };

export default async function UnitPhotosPage({
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
  const photos = await listGalleryPhotos({
    organizationId: membership.organizationId,
    propertyId: property.id,
    unitId: unit.id,
  });
  const unitHref = `/properties/${property.id}/units/${unit.id}`;

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title={justCreated ? "Add photos" : "Photos"}
        description={
          justCreated
            ? `${unit.name} is saved. Add photos of its rooms and view. You can skip this and add them later.`
            : `${unit.name} · ${property.name}`
        }
        backHref={unitHref}
        backLabel={unit.name}
      />
      {justCreated ? (
        <CreateSteps current={4} steps={UNIT_STEPS} />
      ) : (
        <SectionTabs tabs={unitTabs(property.id, unit.id)} current="photos" />
      )}
      <PhotosPage
        target={{ propertyId: property.id, unitId: unit.id }}
        scope="unit"
        initialPhotos={photos}
        name={unit.name}
        parentName={property.name}
        justCreated={justCreated}
        doneHref={unitHref}
      />
    </div>
  );
}
