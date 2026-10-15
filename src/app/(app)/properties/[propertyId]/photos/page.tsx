import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getPropertyOrThrow } from "@/server/inventory/service";
import { listGalleryPhotos } from "@/server/inventory/gallery";
import { InventoryError } from "@/server/inventory/validation";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { CreateSteps } from "../../create-steps";
import { PhotosPage } from "../../photos-page";
import { propertyTabs, SectionTabs } from "../../section-tabs";

export const metadata: Metadata = { title: "Property photos" };

export default async function PropertyPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const membership = await requirePermission("properties.update");
  if (!membership) return <PermissionDenied />;
  const { propertyId } = await params;
  const justCreated = (await searchParams).new === "1";
  let property;
  try {
    property = await getPropertyOrThrow(membership.organizationId, propertyId);
  } catch (error) {
    if (error instanceof InventoryError) notFound();
    throw error;
  }
  const photos = await listGalleryPhotos({
    organizationId: membership.organizationId,
    propertyId: property.id,
  });
  const propertyHref = `/properties/${property.id}`;

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title={justCreated ? "Add photos" : "Photos"}
        description={
          justCreated
            ? `${property.name} is saved. Show it off with photos of the building and what's around it. You can skip this and add them later.`
            : `${property.name} · Photos of the building and what's around it.`
        }
        backHref={propertyHref}
        backLabel={property.name}
      />
      {justCreated ? (
        <CreateSteps current={2} />
      ) : (
        <SectionTabs tabs={propertyTabs(property.id)} current="photos" />
      )}
      <PhotosPage
        target={{ propertyId: property.id }}
        scope="property"
        initialPhotos={photos}
        name={property.name}
        justCreated={justCreated}
        doneHref={propertyHref}
      />
    </div>
  );
}
