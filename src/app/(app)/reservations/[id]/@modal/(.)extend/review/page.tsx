import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { RouteModal } from "@/components/app/route-modal";
import { reviewPanel } from "../../../extend-panel";

/** Opened from the reservation: the same review, as a modal over it. */
export default async function ReviewLateCheckoutModal({ params }: { params: Promise<{ id: string }> }) {
  const membership = await requirePermission("extensions.update");
  if (!membership) return <RouteModal title="Review late check-out" description="Your role doesn’t include approving late check-out."><PermissionDenied /></RouteModal>;
  const { id } = await params;
  const { form, ...panel } = await reviewPanel(membership, id);
  return <RouteModal {...panel}>{form}</RouteModal>;
}
