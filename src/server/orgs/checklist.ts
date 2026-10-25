import "server-only";

import { cache } from "react";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryPhotos,
  organizations,
  properties,
  reservations,
  unitAmenities,
  units,
} from "@/lib/db/schema";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
  /** Done items that can't be checked yet because an earlier one is missing. */
  blocked?: boolean;
}

export interface GoLiveChecklist {
  items: ChecklistItem[];
  doneCount: number;
  total: number;
  live: boolean;
  /** Everything before "Go live" is done. */
  ready: boolean;
  /** The owner already went live with setup finished; the checklist is retired. */
  completed: boolean;
}

async function countOf(query: Promise<{ value: number }[]>): Promise<number> {
  return (await query)[0]?.value ?? 0;
}

/**
 * What an owner still has to set up before sharing the public page. Every item
 * is read from existing data, so nothing needs ticking off by hand and the list
 * stays right if someone finishes a step from another screen.
 */
export const getGoLiveChecklist = cache(async function getGoLiveChecklist(
  organizationId: string,
): Promise<GoLiveChecklist> {
  const organization = await db.query.organizations.findFirst({
    columns: {
      logoUrl: true,
      tagline: true,
      contactChannels: true,
      paymentInstructions: true,
      publicPageLive: true,
      setupCompletedAt: true,
    },
    where: eq(organizations.id, organizationId),
  });
  if (!organization) throw new Error("Organization not found.");

  const activeUnit = and(
    eq(units.organizationId, organizationId),
    eq(units.status, "active"),
    isNull(units.deletedAt),
  );
  const [
    propertyCount,
    describedCount,
    pricedUnitCount,
    photoCount,
    amenityCount,
    bookingCount,
  ] = await Promise.all([
    countOf(
      db
        .select({ value: count() })
        .from(properties)
        .where(
          and(
            eq(properties.organizationId, organizationId),
            isNull(properties.deletedAt),
          ),
        ),
    ),
    countOf(
      db
        .select({ value: count() })
        .from(properties)
        .where(
          and(
            eq(properties.organizationId, organizationId),
            isNull(properties.deletedAt),
            sql`length(trim(coalesce(${properties.description}, ''))) > 0`,
          ),
        ),
    ),
    countOf(
      db
        .select({ value: count() })
        .from(units)
        .where(and(activeUnit, gt(units.defaultNightlyRateCents, 0))),
    ),
    countOf(
      db
        .select({ value: count() })
        .from(inventoryPhotos)
        .where(
          and(
            eq(inventoryPhotos.organizationId, organizationId),
            isNull(inventoryPhotos.deletedAt),
          ),
        ),
    ),
    countOf(
      db
        .select({ value: count() })
        .from(unitAmenities)
        .where(eq(unitAmenities.organizationId, organizationId)),
    ),
    countOf(
      db
        .select({ value: count() })
        .from(reservations)
        .where(eq(reservations.organizationId, organizationId)),
    ),
  ]);

  const hasChannel = organization.contactChannels.some(
    (channel) => channel.enabled,
  );
  const items: ChecklistItem[] = [
    {
      id: "profile",
      title: "Finish your business profile",
      description: "A logo and a one-line tagline guests see first.",
      href: "/settings/organization/edit",
      cta: "Edit profile",
      done: Boolean(organization.logoUrl && organization.tagline?.trim()),
    },
    {
      id: "property",
      title: "Add your property",
      description: "The building or place your guests stay at.",
      href: "/properties/new",
      cta: "Add property",
      done: propertyCount > 0,
    },
    {
      id: "unit",
      title: "Add a unit with a nightly rate",
      description: "Each bookable room or house, with its price.",
      href: "/properties",
      cta: "Add unit",
      done: pricedUnitCount > 0,
    },
    {
      id: "description",
      title: "Describe your property",
      description: "A few lines on what makes the stay special.",
      href: "/properties",
      cta: "Write description",
      done: describedCount > 0,
    },
    {
      id: "photos",
      title: "Upload photos",
      description: "Good photos are what turn a visit into an inquiry.",
      href: "/properties",
      cta: "Add photos",
      done: photoCount > 0,
    },
    {
      id: "amenities",
      title: "Choose your amenities",
      description: "Wi-Fi, pool, kitchen: tick what each unit offers.",
      href: "/properties",
      cta: "Pick amenities",
      done: amenityCount > 0,
    },
    {
      id: "contact",
      title: "Set up contact channels",
      description: "How guests reach you: Messenger, Viber, phone and more.",
      href: "/settings/general",
      cta: "Add channels",
      done: hasChannel,
    },
    {
      id: "payment",
      title: "Add payment instructions",
      description: "Where guests send their down payment.",
      href: "/settings/payment-instructions/edit",
      cta: "Add instructions",
      done: Boolean(organization.paymentInstructions?.trim()),
    },
    {
      id: "bookings",
      title: "Add your current and past bookings",
      description:
        "So the calendar is accurate and your reports start with history.",
      href: "/reservations/new",
      cta: "Add booking",
      done: bookingCount > 0,
    },
  ];

  const ready = items.every((item) => item.done);
  const live = organization.publicPageLive;
  // Going live early doesn't count as progress: it only completes once the
  // steps before it are done.
  items.push({
    id: "live",
    title: "Go live",
    description: !ready
      ? live
        ? "Your page is live, but the steps above aren’t finished yet."
        : "Finish the steps above first, then turn on your public page."
      : "Turn on your public page so guests can find you.",
    href: "/settings/general",
    cta: "Go live",
    done: ready && live,
    blocked: !ready && !live,
  });

  return {
    items,
    doneCount: items.filter((item) => item.done).length,
    total: items.length,
    live: organization.publicPageLive,
    ready,
    completed: organization.setupCompletedAt !== null,
  };
});
