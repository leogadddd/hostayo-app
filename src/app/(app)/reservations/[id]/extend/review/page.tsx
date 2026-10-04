import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { ReservationActionPage } from "../../action-page";
import { reviewPanel } from "../../extend-panel";

export const metadata: Metadata = { title: "Review late check-out" };

export default async function ReviewLateCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await requirePermission("extensions.update");
  if (!membership) return <PermissionDenied description="Your role doesn’t include approving late check-out." />;
  const { id } = await params;
  const { form, ...panel } = await reviewPanel(membership, id);
  return <ReservationActionPage {...panel} reservationId={id}>{form}</ReservationActionPage>;
}
