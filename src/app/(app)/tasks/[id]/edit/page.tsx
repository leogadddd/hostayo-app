import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/app/permission-denied";
import { getTaskDetail } from "@/server/operations/service";
import { TaskActionPage } from "../task-action-page";
import { TaskNotesForm } from "../task-notes-form";

export const metadata: Metadata = { title: "Edit turnover notes" };

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requirePermission("tasks.update");
  if (!membership) return <PermissionDenied />;
  const { id } = await params;
  const { task, unitName, propertyName } = await getTaskDetail(
    membership.organizationId,
    id,
  );
  if (task.status !== "open") redirect(`/tasks/${task.id}`);

  return (
    <TaskActionPage
      title="Edit turnover notes"
      description={`${propertyName} · ${unitName}`}
      taskId={task.id}
    >
      <TaskNotesForm taskId={task.id} notes={task.notes ?? ""} editable />
    </TaskActionPage>
  );
}
