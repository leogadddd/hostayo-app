import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { Card, CardBody } from "@/components/ui/card";
import { getBookingSettings } from "@/server/orgs/service";
import { BookingSettingsForm } from "./booking-settings-form";

export const metadata: Metadata = { title: "Booking settings" };

export default async function BookingSettingsPage() {
  const membership = await requirePermission("organization.update");
  if (!membership) return <PermissionDenied />;
  const settings = await getBookingSettings(membership.organizationId);
  return (
    <div className="min-w-0">
      <Card className="bg-card">
        <CardBody>
          <BookingSettingsForm settings={settings} />
        </CardBody>
      </Card>
    </div>
  );
}
