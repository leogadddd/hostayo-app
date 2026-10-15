import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { CreateSteps } from "../create-steps";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { PropertyForm } from "../property-form";
import { listAmenities } from "@/server/inventory/amenities";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  const membership = await requirePermission("properties.create");
  if (!membership) return <PermissionDenied />;

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, membership.organizationId),
  });

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeading
        title="Add property"
        description="A building or place where guests stay. You'll add the units they book next."
        backHref="/properties"
        backLabel="All properties"
      />
      <CreateSteps current={1} />
      <PropertyForm
        defaultTimezone={organization?.defaultTimezone ?? "Asia/Manila"}
        amenityOptions={await listAmenities(
          membership.organizationId,
          "property",
        )}
      />
    </div>
  );
}
