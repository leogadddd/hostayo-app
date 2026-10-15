import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/session";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";

/** The shell every tool page shares: permission check, heading and a link back to Tools. */
export async function ToolPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const membership = await requirePermission("pricing.view");
  if (!membership) return <PermissionDenied />;
  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeading
        title={title}
        description={description}
        backHref="/tools"
        backLabel="Tools"
      />
      {children}
    </div>
  );
}
