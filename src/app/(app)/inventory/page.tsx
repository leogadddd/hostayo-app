import type { Metadata } from "next";
import { AlertTriangle, Hammer, PackageSearch, SearchX, ShoppingCart } from "lucide-react";
import { UnderConstruction } from "@/components/app/under-construction";
import { PermissionDenied } from "@/components/app/permission-denied";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Inventory" };

/** What the inventory tracker will cover once it's built. */
const PLANNED = [
  { icon: PackageSearch, label: "Assets per unit" },
  { icon: Hammer, label: "Damaged items" },
  { icon: SearchX, label: "Missing items" },
  { icon: ShoppingCart, label: "Restock requests" },
  { icon: AlertTriangle, label: "Low stock alerts" },
];

export default async function InventoryPage() {
  const membership = await requirePermission("tasks.view");
  if (!membership) return <PermissionDenied />;
  return (
    <UnderConstruction
      title="Inventory"
      description="A tracker for each unit’s assets and supplies is on the way: what’s there, what’s damaged or missing, and what needs restocking."
    >
      <ul className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
        {PLANNED.map(({ icon: Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-pine/15 bg-surface px-3 py-1 text-xs text-pine/80">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </UnderConstruction>
  );
}
