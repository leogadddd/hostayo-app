import Link from "next/link";
import type { Metadata } from "next";
import {
  Building2,
  Calculator,
  CalendarRange,
  Landmark,
  MessageSquareText,
  Percent,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = { title: "Tools" };

const TOOLS = [
  {
    href: "/tools/pricing-calculator",
    title: "Nightly rate calculator",
    description:
      "Work out what to charge per night from your costs, expected bookings and the profit you want.",
    icon: Calculator,
  },
  {
    href: "/tools/property-breakeven",
    title: "Property break-even",
    description:
      "See whether a whole property pays for itself, with each unit's bookings and the costs they share.",
    icon: Building2,
  },
  {
    href: "/tools/platform-fees",
    title: "Platform fee comparison",
    description:
      "What a booking leaves you on Airbnb, Booking.com, Agoda and direct, and what to charge to match.",
    icon: Percent,
  },
  {
    href: "/tools/guest-quote",
    title: "Guest quote",
    description:
      "Turn dates and rates into a message you can paste into Messenger, Viber or email.",
    icon: MessageSquareText,
  },
  {
    href: "/tools/seasonal-planner",
    title: "Seasonal rate planner",
    description:
      "Which months to raise or lower your rate, based on how full each one was.",
    icon: CalendarRange,
  },
  {
    href: "/tools/investment-payback",
    title: "Investment payback",
    description:
      "How long a unit takes to pay back what you put in, and its yearly return.",
    icon: Landmark,
  },
];

export default async function ToolsPage() {
  const membership = await requirePermission("pricing.view");
  if (!membership) return <PermissionDenied />;
  return (
    <div className="min-w-0">
      <PageHeading
        title="Tools"
        description="Calculators and helpers for running your stays. They work on the numbers you type and don't change any of your data."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full bg-card transition-colors group-hover:border-pine/30">
              <CardBody className="space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine-mist text-pine">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="font-display text-lg text-pine">{title}</h2>
                <p className="text-sm text-ink/65">{description}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
