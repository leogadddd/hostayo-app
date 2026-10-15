import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { PricingCalculator } from "./calculator";

export const metadata: Metadata = { title: "Nightly rate calculator" };

export default async function PricingCalculatorPage() {
  const membership = await requirePermission("pricing.view");
  if (!membership) return <PermissionDenied />;
  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeading
        title="Nightly rate calculator"
        description="Work out what to charge per night from your costs, how often you expect to be booked and the profit you want."
        backHref="/tools"
        backLabel="Tools"
      />
      <PricingCalculator />
    </div>
  );
}
