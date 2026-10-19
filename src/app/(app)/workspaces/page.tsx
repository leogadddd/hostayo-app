import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isL1, requireUser } from "@/lib/auth/session";
import { PageHeading } from "@/components/app/page-heading";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listWorkspaces } from "@/server/workspaces/service";
import { NewWorkspaceDialog, WorkspaceActions } from "./workspace-dialogs";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
  const current = await requireUser();
  // L1 operators only; anyone else gets the same page as a missing one.
  if (!(await isL1(current.id))) notFound();

  const workspaces = await listWorkspaces();
  const blocked = workspaces.filter((workspace) => workspace.blockedAt).length;
  const day = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  });

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Workspaces"
        description="Every team on Hostayo. Times shown in Asia/Manila."
      >
        <NewWorkspaceDialog />
      </PageHeading>

      <p className="mb-3 text-sm text-ink/65" aria-live="polite">
        {workspaces.length}{" "}
        {workspaces.length === 1 ? "workspace" : "workspaces"}, {blocked}{" "}
        blocked
      </p>

      <div className="overflow-x-auto rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
        <Table
          aria-label="Workspaces"
          className="[&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4"
        >
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>Owners</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.map((workspace) => (
              <TableRow
                key={workspace.id}
                className={cn(workspace.blockedAt && "opacity-70")}
              >
                <TableCell>
                  <p className="font-medium text-pine">{workspace.name}</p>
                  <p className="text-xs text-ink/60">{workspace.slug}</p>
                </TableCell>
                <TableCell className="max-w-64 text-sm">
                  {workspace.owners.length ? (
                    workspace.owners.map((owner) => owner.email).join(", ")
                  ) : (
                    <span className="text-ink/45">None</span>
                  )}
                </TableCell>
                <TableCell>{workspace.memberCount}</TableCell>
                <TableCell>{workspace.propertyCount}</TableCell>
                <TableCell>
                  {workspace.blockedAt ? (
                    <Badge tone="clay">Blocked</Badge>
                  ) : (
                    <Badge tone="sage">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {day.format(workspace.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <WorkspaceActions
                    id={workspace.id}
                    name={workspace.name}
                    slug={workspace.slug}
                    blocked={Boolean(workspace.blockedAt)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
