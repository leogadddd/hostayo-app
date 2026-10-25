import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";

/** Where each status sits on the way through a stay, so "already past it" can be told. */
const STAY_ORDER = ["checked_in", "checked_out"] as const;

/**
 * True when the reservation is at `target` or already beyond it. A replayed
 * check-in or check-out that finds this is a repeat of something done, not a
 * conflict.
 */
export async function hasReached(
  organizationId: string,
  reservationId: string,
  target: (typeof STAY_ORDER)[number],
): Promise<boolean> {
  const [row] = await db
    .select({ status: reservations.status })
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!row) return false;
  const at = STAY_ORDER.indexOf(row.status as (typeof STAY_ORDER)[number]);
  return at !== -1 && at >= STAY_ORDER.indexOf(target);
}
