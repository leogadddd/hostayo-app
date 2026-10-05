import "dotenv/config";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents, memberships, organizations, user } from "@/lib/db/schema";
import { seedDemoData } from "./seed";

/**
 * Removes only organizations belonging to a persisted demo account, then
 * restores the shared baseline. Organization-level foreign keys cascade the
 * related demo records; audit events are deleted explicitly because they
 * intentionally have no organization foreign key.
 */
export async function resetDemoData() {
  const demoOrganizations = await db
    .select({ id: organizations.id })
    .from(organizations)
    .innerJoin(memberships, eq(memberships.organizationId, organizations.id))
    .innerJoin(user, eq(memberships.userId, user.id))
    .where(eq(user.isDemoAccount, true));

  for (const organization of demoOrganizations) {
    await db.transaction(async (tx) => {
      await tx
        .delete(auditEvents)
        .where(eq(auditEvents.organizationId, organization.id));
      await tx
        .delete(organizations)
        .where(eq(organizations.id, organization.id));
    });
  }

  await db.delete(user).where(eq(user.isDemoAccount, true));

  console.log("demo reset: previous shared workspace removed");
  await seedDemoData();
}

if (process.argv[1]?.endsWith("reset-demo.ts")) {
  resetDemoData()
    .catch((error) => {
      console.error("demo reset failed:", error);
      process.exitCode = 1;
    })
    .finally(() => {
      // postgres.js keeps the connection pool open; let the process exit.
      setTimeout(() => process.exit(process.exitCode ?? 0), 250);
    });
}
