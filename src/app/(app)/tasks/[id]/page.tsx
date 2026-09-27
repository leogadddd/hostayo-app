import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { PermissionDenied } from "@/components/app/permission-denied";
import { getTaskDetail } from "@/server/operations/service";
import { TurnoverRun } from "./turnover-run";

export const metadata: Metadata = { title: "Turnover task" };

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const membership = await requirePermission("tasks.view");
  if (!membership) return <PermissionDenied />;
  const { task, unitName, propertyName, guestName, items, openDamage, assessment, nextCheckIn } =
    await getTaskDetail(membership.organizationId, id);

  return (
    <TurnoverRun
      task={{
        id: task.id,
        status: task.status,
        notes: task.notes,
        reservationId: task.reservationId,
        markedReadyAt: task.markedReadyAt?.toISOString() ?? null,
        readyOverrideReason: task.readyOverrideReason,
      }}
      unitName={unitName}
      propertyName={propertyName}
      guestName={guestName}
      items={items.map((item) => ({
        id: item.id,
        label: item.label,
        required: item.required,
        completedAt: item.completedAt?.toISOString() ?? null,
      }))}
      openDamage={openDamage.map((report) => ({
        id: report.id,
        description: report.description,
        estimatedAmountCents: report.estimatedAmountCents,
      }))}
      canMarkReady={assessment.canMarkReady}
      nextCheckIn={nextCheckIn ? { guestName: nextCheckIn.guestName, checkInDate: nextCheckIn.checkInDate } : null}
      permissions={{
        work: task.status === "open" && can(membership, "tasks.update"),
        reportDamage: task.status === "open" && can(membership, "damage.create"),
        resolveDamage: can(membership, "damage.update"),
        viewReservation: can(membership, "reservations.view"),
      }}
    />
  );
}
