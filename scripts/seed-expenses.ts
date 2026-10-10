import "dotenv/config";

import { and, asc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditEvents,
  expenses,
  memberships,
  organizations,
  properties,
  units,
} from "@/lib/db/schema";
import { todayInTimeZone } from "@/lib/dates";
import { createExpense } from "@/server/expenses/service";
import { assertSafeDatabase } from "./lib/sample-data";
import { sampleExpenses } from "./lib/sample-expenses";

/**
 * Sample expenses for one organization, found by name, so its expenses
 * page, dashboard and reports have something to show: three months of
 * monthly bills, turnover cleans, restocks, platform fees and a few
 * one-offs (an aircon cleaning, a new TV) across its properties and units.
 *
 *   npm run seed:expenses -- "Hostayo Development"          # create or top up
 *   npm run seed:expenses -- "Hostayo Development" --clean  # remove them again
 *
 * Reruns only add entries whose description and payee aren't there yet.
 * Only a local database is allowed unless --allow-remote is passed.
 */

/** How far back --clean looks for monthly sample bills. */
const CLEAN_MONTHS = 24;

function args() {
  const flags = new Set(
    process.argv.slice(2).filter((arg) => arg.startsWith("--")),
  );
  const name = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith("--"))
    .join(" ")
    .trim();
  return { name, clean: flags.has("--clean") };
}

async function findOrganization(name: string) {
  const escaped = name.replace(/[%_\\]/g, "\\$&");
  const exact = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(ilike(organizations.name, escaped));
  if (exact.length === 1) return exact[0]!;
  const partial = exact.length
    ? exact
    : await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(ilike(organizations.name, `%${escaped}%`))
        .orderBy(asc(organizations.name));
  if (partial.length === 1) return partial[0]!;
  if (partial.length > 1) {
    throw new Error(
      `"${name}" matches ${partial.length} organizations: ${partial.map((org) => `"${org.name}"`).join(", ")}. Use the full name.`,
    );
  }
  const all = await db
    .select({ name: organizations.name })
    .from(organizations)
    .orderBy(asc(organizations.name))
    .limit(20);
  throw new Error(
    `No organization named "${name}". Available: ${all.map((org) => `"${org.name}"`).join(", ") || "none"}.`,
  );
}

async function findOwner(organizationId: string) {
  const [owner] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.role, "owner"),
      ),
    )
    .orderBy(asc(memberships.createdAt))
    .limit(1);
  return owner?.userId ?? null;
}

async function loadProperties(organizationId: string) {
  const rows = await db
    .select({
      propertyId: properties.id,
      propertyName: properties.name,
      unitId: units.id,
      unitName: units.name,
    })
    .from(properties)
    .leftJoin(
      units,
      and(
        eq(units.propertyId, properties.id),
        eq(units.organizationId, properties.organizationId),
        isNull(units.deletedAt),
      ),
    )
    .where(
      and(
        eq(properties.organizationId, organizationId),
        isNull(properties.deletedAt),
      ),
    )
    .orderBy(asc(properties.name), asc(units.name));
  const byId = new Map<
    string,
    { id: string; name: string; units: { id: string; name: string }[] }
  >();
  for (const row of rows) {
    const property = byId.get(row.propertyId) ?? {
      id: row.propertyId,
      name: row.propertyName,
      units: [],
    };
    if (row.unitId && row.unitName)
      property.units.push({ id: row.unitId, name: row.unitName });
    byId.set(row.propertyId, property);
  }
  return [...byId.values()];
}

async function existingKeys(organizationId: string) {
  const rows = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      payee: expenses.payee,
    })
    .from(expenses)
    .where(eq(expenses.organizationId, organizationId));
  return new Map(
    rows.map((row) => [`${row.description}|${row.payee ?? ""}`, row.id]),
  );
}

async function seed(organization: { id: string; name: string }) {
  const ownerId = await findOwner(organization.id);
  if (!ownerId) throw new Error("That organization has no owner.");
  const orgProperties = await loadProperties(organization.id);
  if (!orgProperties.length)
    throw new Error("That organization has no properties yet.");

  const plan = sampleExpenses({
    today: todayInTimeZone("Asia/Manila"),
    properties: orgProperties,
  });
  const existing = await existingKeys(organization.id);
  let added = 0;
  for (const expense of plan) {
    if (existing.has(`${expense.description}|${expense.payee ?? ""}`)) continue;
    await createExpense({
      organizationId: organization.id,
      actorUserId: ownerId,
      data: expense,
    });
    added++;
  }
  console.log(
    `Added ${added} sample expense(s) to "${organization.name}" (${plan.length - added} already there).`,
  );
}

async function clean(organization: { id: string; name: string }) {
  const orgProperties = await loadProperties(organization.id);
  const sampleKeys = new Set(
    sampleExpenses({
      today: todayInTimeZone("Asia/Manila"),
      properties: orgProperties,
      months: CLEAN_MONTHS,
    }).map((expense) => `${expense.description}|${expense.payee ?? ""}`),
  );
  const existing = await existingKeys(organization.id);
  const ids = [...existing]
    .filter(([key]) => sampleKeys.has(key))
    .map(([, id]) => id);
  if (ids.length) {
    await db.transaction(async (tx) => {
      await tx.delete(auditEvents).where(inArray(auditEvents.entityId, ids));
      await tx.delete(expenses).where(inArray(expenses.id, ids));
    });
  }
  console.log(
    `Removed ${ids.length} sample expense(s) from "${organization.name}".`,
  );
}

async function main() {
  const { name, clean: cleaning } = args();
  if (!name) {
    console.error(
      'Usage: npm run seed:expenses -- "<organization name>" [--clean] [--allow-remote]',
    );
    process.exit(1);
  }
  assertSafeDatabase();
  const organization = await findOrganization(name);
  console.log(`Organization: ${organization.name}`);
  if (cleaning) await clean(organization);
  else await seed(organization);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
