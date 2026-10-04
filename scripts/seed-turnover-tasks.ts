import "dotenv/config";

import { and, asc, eq, ilike, inArray, isNull, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents, memberships, organizations, properties, taskItems, tasks, units } from "@/lib/db/schema";
import { normalizeChecklistTemplate } from "@/lib/turnover";
import { assertSafeDatabase } from "./lib/sample-data";

/**
 * Open turnover tasks for one organization, found by name, so the tasks
 * page and the staff run view have something to play with. Every unit gets
 * three open tasks: untouched, halfway, and all required items done with
 * bonus items left. Tasks aren't tied to a reservation.
 *
 *   npm run seed:turnovers -- "Hostayo Development"          # add sample tasks
 *   npm run seed:turnovers -- "Hostayo Development" --reset  # also reopen every existing task
 *   npm run seed:turnovers -- "Hostayo Development" --clean  # remove the sample tasks
 *
 * Sample tasks are recognised by their notes. Only a local database is
 * allowed unless --allow-remote is passed.
 */

const NOTE_PREFIX = "Sample turnover";
/** Added when a unit's checklist has no optional items, so the bonus quests show up. */
const BONUS_ITEMS = ["Leave a welcome note", "Refill coffee and tea"];

type Stage = "fresh" | "halfway" | "required_done";
/** [stage, hours since check-out] */
const PLAN: [Stage, number][] = [
  ["fresh", 1],
  ["halfway", 4],
  ["required_done", 9],
];
const STAGE_NOTES: Record<Stage, string> = {
  fresh: `${NOTE_PREFIX}: nothing done yet.`,
  halfway: `${NOTE_PREFIX}: about half done.`,
  required_done: `${NOTE_PREFIX}: required items done, bonus left.`,
};

function args() {
  const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--")));
  const name = process.argv.slice(2).filter((arg) => !arg.startsWith("--")).join(" ").trim();
  return { name, reset: flags.has("--reset"), clean: flags.has("--clean") };
}

async function findOrganization(name: string) {
  const escaped = name.replace(/[%_\\]/g, "\\$&");
  const exact = await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(ilike(organizations.name, escaped));
  if (exact.length === 1) return exact[0]!;
  const partial = exact.length
    ? exact
    : await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(ilike(organizations.name, `%${escaped}%`)).orderBy(asc(organizations.name));
  if (partial.length === 1) return partial[0]!;
  if (partial.length > 1) {
    throw new Error(`"${name}" matches ${partial.length} organizations: ${partial.map((org) => `"${org.name}"`).join(", ")}. Use the full name.`);
  }
  const all = await db.select({ name: organizations.name }).from(organizations).orderBy(asc(organizations.name)).limit(20);
  throw new Error(`No organization named "${name}". Available: ${all.map((org) => `"${org.name}"`).join(", ") || "none"}.`);
}

async function findOwner(organizationId: string) {
  const [owner] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, "owner")))
    .orderBy(asc(memberships.createdAt))
    .limit(1);
  return owner?.userId ?? null;
}

async function seed(organization: { id: string; name: string }) {
  const ownerId = await findOwner(organization.id);
  const orgUnits = await db
    .select({ id: units.id, name: units.name, checklistTemplate: units.checklistTemplate })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(and(eq(units.organizationId, organization.id), isNull(properties.deletedAt)))
    .orderBy(asc(properties.name), asc(units.name));
  if (orgUnits.length === 0) throw new Error("That organization has no units yet.");

  const now = Date.now();
  let created = 0;
  for (const unit of orgUnits) {
    const template = normalizeChecklistTemplate(unit.checklistTemplate);
    const checklist = template.some((item) => !item.required)
      ? template
      : [...template, ...BONUS_ITEMS.map((label) => ({ label, required: false }))];

    for (const [stage, hoursAgo] of PLAN) {
      const createdAt = new Date(now - hoursAgo * 3_600_000);
      const doneCount =
        stage === "fresh" ? 0
        : stage === "halfway" ? Math.floor(checklist.length / 2)
        : checklist.length;
      await db.transaction(async (tx) => {
        const [task] = await tx
          .insert(tasks)
          .values({ organizationId: organization.id, unitId: unit.id, status: "open", checklistSnapshot: checklist, notes: STAGE_NOTES[stage], createdAt, updatedAt: createdAt })
          .returning({ id: tasks.id });
        if (!task || checklist.length === 0) return;
        // Completed items are spaced a few minutes apart, starting half an hour after check-out.
        let tick = createdAt.getTime() + 30 * 60_000;
        await tx.insert(taskItems).values(
          checklist.map((item, position) => {
            const done = stage === "required_done" ? item.required : position < doneCount;
            if (done) tick += (2 + ((position * 7) % 9)) * 60_000;
            return {
              organizationId: organization.id,
              taskId: task.id,
              label: item.label,
              required: item.required,
              position,
              completedAt: done ? new Date(tick) : null,
              completedBy: done ? ownerId : null,
            };
          }),
        );
      });
      created++;
    }
    console.log(`  ${unit.name}: ${PLAN.length} open tasks (${checklist.length} items each)`);
  }
  console.log(`Created ${created} sample turnover task(s) in "${organization.name}".`);
}

/** Reopens every task in the organization: clears ticks and the ready state. */
async function reset(organization: { id: string; name: string }) {
  const reopened = await db.transaction(async (tx) => {
    await tx
      .update(taskItems)
      .set({ completedAt: null, completedBy: null })
      .where(eq(taskItems.organizationId, organization.id));
    return tx
      .update(tasks)
      .set({ status: "open", markedReadyAt: null, markedReadyBy: null, readyOverrideReason: null, updatedAt: new Date() })
      .where(eq(tasks.organizationId, organization.id))
      .returning({ id: tasks.id });
  });
  console.log(`Reopened ${reopened.length} existing task(s) in "${organization.name}".`);
}

async function clean(organization: { id: string; name: string }) {
  const sample = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.organizationId, organization.id), like(tasks.notes, `${NOTE_PREFIX}%`)));
  const ids = sample.map((task) => task.id);
  if (ids.length) {
    await db.transaction(async (tx) => {
      await tx.delete(auditEvents).where(inArray(auditEvents.entityId, ids));
      await tx.delete(tasks).where(inArray(tasks.id, ids));
    });
  }
  console.log(`Removed ${ids.length} sample turnover task(s) from "${organization.name}".`);
}

async function main() {
  const { name, reset: resetting, clean: cleaning } = args();
  if (!name) {
    console.error('Usage: npm run seed:turnovers -- "<organization name>" [--reset] [--clean] [--allow-remote]');
    process.exit(1);
  }
  assertSafeDatabase();
  const organization = await findOrganization(name);
  console.log(`Organization: ${organization.name}`);
  if (cleaning) {
    await clean(organization);
  } else {
    if (resetting) await reset(organization);
    await seed(organization);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
