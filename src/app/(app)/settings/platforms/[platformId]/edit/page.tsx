import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { listManagedPlatforms } from "@/server/reservations/platforms";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { Card, CardBody } from "@/components/ui/card";
import { updatePlatformAction } from "../../actions";
import { PlatformForm } from "../../platform-forms";

export const metadata: Metadata = { title: "Edit booking platform" };

export default async function EditPlatformPage({
  params,
}: {
  params: Promise<{ platformId: string }>;
}) {
  const membership = await requirePermission("platforms.update");
  if (!membership) return <PermissionDenied />;
  const { platformId } = await params;
  const platform = (await listManagedPlatforms(membership.organizationId)).find(
    (row) => row.id === platformId,
  );
  if (!platform) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading
        title={`Edit ${platform.name}`}
        description="Changes apply to new reservations, and only when the unit requires a down payment. Existing bookings keep their reservation fee."
        backHref="/settings/general"
        backLabel="Booking platforms"
      />
      <Card className="bg-card">
        <CardBody>
          <PlatformForm
            action={updatePlatformAction.bind(null, platform.id)}
            submitLabel="Save changes"
            successMessage="Platform saved."
            values={{
              name: platform.name,
              color: platform.color ?? "",
              websiteUrl: platform.websiteUrl ?? "",
              downPaymentApplies: platform.downPaymentApplies,
              logoUrl: platform.logoUrl,
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
