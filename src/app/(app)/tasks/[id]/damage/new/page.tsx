import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { getTaskDetail } from "@/server/operations/service";
import { TaskActionPage } from "../../task-action-page";
import { DamageReportForm } from "../../../damage-report-form";

export const metadata: Metadata = { title: "Report turnover damage" };

export default async function NewTaskDamagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requirePermission("damage.create");
  if (!membership) return <PermissionDenied />;
  const { id } = await params;
  const { task, unitName, propertyName } = await getTaskDetail(
    membership.organizationId,
    id,
  );
  if (task.status !== "open") redirect(`/tasks/${task.id}`);

  return (
    <TaskActionPage
      title="Report damage"
      description={`${propertyName} · ${unitName}. This report stays open until the owner resolves it.`}
      taskId={task.id}
    >
      <DamageReportForm unitId={task.unitId} returnHref={`/tasks/${task.id}`} />
    </TaskActionPage>
  );
}
