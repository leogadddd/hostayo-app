import "dotenv/config";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { earlyAccessRequests, user } from "@/lib/db/schema";
import {
  restoreEarlyAccessEntry,
  revokeEarlyAccessEntry,
} from "@/server/early-access/service";

/**
 * Manages early-access entries, the same operations as the Early access page.
 *
 *   npm run early-access -- list
 *   npm run early-access -- revoke <email>
 *   npm run early-access -- restore <email>
 *
 * Revoking blocks the account the person created with their link (and kills
 * the link if they haven't used it yet). Restoring unblocks that account.
 * Check the database host this prints: `.env` decides which database it touches.
 */
const USAGE =
  "Usage: npm run early-access -- list | revoke <email> | restore <email>";

async function main() {
  const [command, email] = process.argv.slice(2);
  const host = new URL(process.env.DATABASE_URL ?? "postgres://unknown").host;
  console.log(`Database: ${host}`);

  if (command === "list") {
    const rows = await db
      .select({
        email: earlyAccessRequests.email,
        name: earlyAccessRequests.name,
        acceptedAt: earlyAccessRequests.acceptedAt,
        userId: earlyAccessRequests.userId,
        blockedAt: user.blockedAt,
      })
      .from(earlyAccessRequests)
      .leftJoin(user, eq(earlyAccessRequests.userId, user.id))
      .orderBy(desc(earlyAccessRequests.createdAt));
    for (const row of rows)
      console.log(
        `${row.email} (${row.name}) ${
          row.blockedAt
            ? "BLOCKED"
            : row.userId
              ? "registered"
              : row.acceptedAt
                ? "accepted"
                : "pending"
        }`,
      );
    console.log(`${rows.length} entries.`);
    return;
  }

  if ((command !== "revoke" && command !== "restore") || !email)
    throw new Error(USAGE);
  const [entry] = await db
    .select({ id: earlyAccessRequests.id })
    .from(earlyAccessRequests)
    .where(eq(earlyAccessRequests.email, email.trim()))
    .orderBy(desc(earlyAccessRequests.createdAt))
    .limit(1);
  if (!entry) throw new Error(`No early-access entry for ${email}.`);

  const result =
    command === "revoke"
      ? await revokeEarlyAccessEntry(entry.id)
      : await restoreEarlyAccessEntry(entry.id);
  if (result.error) throw new Error(result.error);
  console.log(
    command === "revoke"
      ? `Early access revoked for ${email}.`
      : `Access restored for ${email}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
