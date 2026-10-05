import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { centavosToPesosInput } from "@/lib/money";
import { listReservationDamageReports } from "@/server/operations/service";
import { ResolveDamageForm } from "@/app/(app)/tasks/[id]/resolve-damage-form";
import {
  ReservationActionPage,
  loadActionReservation,
} from "../../../action-page";

export const metadata: Metadata = { title: "Resolve damage" };

export default async function ResolveReservationDamagePage({
  params,
}: {
  params: Promise<{ id: string; damageReportId: string }>;
}) {
  const membership = await requirePermission("damage.update");
  if (!membership)
    return (
      <PermissionDenied description="Your role doesn’t include resolving damage reports." />
    );
  const { id, damageReportId } = await params;
  const { guest, unit } = await loadActionReservation(
    membership.organizationId,
    id,
  );
  const reports = await listReservationDamageReports(
    membership.organizationId,
    id,
  );
  const report = reports.find((candidate) => candidate.id === damageReportId);
  if (!report) notFound();

  return (
    <ReservationActionPage
      title="Resolve damage"
      description={`${guest.name} · ${unit.name}`}
      reservationId={id}
      unavailable={
        report.status === "open"
          ? undefined
          : "This damage report is already resolved."
      }
    >
      <div className="space-y-5">
        <p className="whitespace-pre-line rounded-lg bg-sage/35 p-4 text-sm text-pine">
          {report.description}
        </p>
        <ResolveDamageForm
          from={{ reservationId: id }}
          damageReportId={report.id}
          defaultActualPesos={centavosToPesosInput(
            report.actualAmountCents ?? report.estimatedAmountCents,
          )}
        />
      </div>
    </ReservationActionPage>
  );
}
