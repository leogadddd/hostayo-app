import type { ReactNode } from "react";
import { MobileBackHeader } from "@/components/app/mobile-back-header";
import { PageHeading } from "@/components/app/page-heading";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The frame of a task form page (mark ready, report or resolve damage, edit
 * notes): a round back button and soft card on a phone, the usual heading and
 * card on a wide screen.
 */
export function TaskActionPage({
  title,
  description,
  taskId,
  bodyClassName,
  children,
}: {
  title: string;
  description: string;
  taskId: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const href = `/tasks/${taskId}`;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="lg:hidden">
        <MobileBackHeader
          title={title}
          description={description}
          backHref={href}
          backLabel="Back to task"
        />
      </div>
      <div className="hidden lg:block">
        <PageHeading
          title={title}
          description={description}
          backHref={href}
          backLabel="Back to task"
        />
      </div>
      <Card className="max-lg:rounded-3xl max-lg:border-0 max-lg:shadow-[0_4px_24px_rgba(32,58,53,0.07)] max-lg:ring-1 max-lg:ring-pine/[0.06]">
        <CardBody className={cn("max-lg:p-4", bodyClassName)}>
          {children}
        </CardBody>
      </Card>
    </div>
  );
}
