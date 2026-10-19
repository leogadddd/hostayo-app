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
import { listAccounts } from "@/server/accounts/service";
import { AccountActions, NewAccountDialog } from "./account-dialogs";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const current = await requireUser();
  // L1 operators only; anyone else gets the same page as a missing one.
  if (!(await isL1(current.id))) notFound();

  const accounts = await listAccounts();
  const blocked = accounts.filter((account) => account.blockedAt).length;
  const time = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });
  const day = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  });

  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Accounts"
        description="Every sign-in on Hostayo. Times shown in Asia/Manila."
      >
        <NewAccountDialog />
      </PageHeading>

      <p className="mb-3 text-sm text-ink/65" aria-live="polite">
        {accounts.length} {accounts.length === 1 ? "account" : "accounts"},{" "}
        {blocked} blocked
      </p>

      <div className="overflow-x-auto rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
        <Table
          aria-label="Accounts"
          className="[&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4"
        >
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Workspaces</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow
                key={account.id}
                className={cn(account.blockedAt && "opacity-70")}
              >
                <TableCell>
                  <p className="font-medium text-pine">{account.name}</p>
                  <p className="text-xs text-ink/60">{account.email}</p>
                </TableCell>
                <TableCell className="max-w-64">
                  {account.workspaces.length ? (
                    <span className="text-sm">
                      {account.workspaces
                        .map((workspace) => workspace.name)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="text-ink/45">None</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {account.blockedAt ? (
                      <Badge tone="clay" title={account.blockedReason ?? ""}>
                        Blocked
                      </Badge>
                    ) : (
                      <Badge tone="sage">Active</Badge>
                    )}
                    {account.isL1 ? <Badge tone="neutral">L1</Badge> : null}
                    {account.isDemoAccount ? (
                      <Badge tone="neutral">Demo</Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {account.lastLoginAt ? (
                    time.format(account.lastLoginAt)
                  ) : (
                    <span className="text-ink/45">Never</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {day.format(account.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <AccountActions
                    id={account.id}
                    name={account.name}
                    email={account.email}
                    blocked={Boolean(account.blockedAt)}
                    protectedAccount={account.isL1 || account.isDemoAccount}
                    isSelf={account.id === current.id}
                    isL1={account.isL1}
                    isDemo={account.isDemoAccount}
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
