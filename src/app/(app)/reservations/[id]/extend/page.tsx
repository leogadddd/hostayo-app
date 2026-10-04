import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { ReservationActionPage } from "../action-page";
import { requestPanel } from "../extend-panel";

export const metadata: Metadata = { title: "Request late check-out" };

export default async function RequestLateCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await requirePermission("extensions.create");
  if (!membership) return <PermissionDenied description="Your role doesn’t include requesting late check-out." />;
  const { id } = await params;
  const { form, ...panel } = await requestPanel(membership, id);
  return <ReservationActionPage {...panel} reservationId={id}>{form}</ReservationActionPage>;
}
