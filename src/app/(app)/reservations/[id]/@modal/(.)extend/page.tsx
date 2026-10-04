import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { RouteModal } from "@/components/app/route-modal";
import { requestPanel } from "../../extend-panel";

/** Opened from the reservation: the same form, as a modal over it. */
export default async function RequestLateCheckoutPageModal({ params }: { params: Promise<{ id: string }> }) {
  const membership = await requirePermission("extensions.create");
  if (!membership) return <RouteModal title="Request late check-out" description="Your role doesn’t include requesting late check-out."><PermissionDenied /></RouteModal>;
  const { id } = await params;
  const { form, ...panel } = await requestPanel(membership, id);
  return <RouteModal {...panel}>{form}</RouteModal>;
}
