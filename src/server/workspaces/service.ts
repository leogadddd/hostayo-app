import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  memberships,
  organizations,
  properties,
  roles,
  user,
} from "@/lib/db/schema";
import {
  ORG_SLUG_MAX,
  OrgError,
  createOrganization,
  slugify,
  validateOrgName,
} from "@/server/orgs/service";

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  blockedAt: Date | null;
  memberCount: number;
  propertyCount: number;
  owners: { id: string; name: string; email: string }[];
}

export async function listWorkspaces(): Promise<WorkspaceRow[]> {
  const [orgs, owners] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        blockedAt: organizations.blockedAt,
        memberCount: sql<number>`(select count(*)::int from ${memberships} where ${memberships.organizationId} = ${organizations.id})`,
        propertyCount: sql<number>`(select count(*)::int from ${properties} where ${properties.organizationId} = ${organizations.id})`,
      })
      .from(organizations)
      .orderBy(asc(organizations.name))
      .limit(1000),
    db
      .select({
        organizationId: memberships.organizationId,
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .innerJoin(user, eq(memberships.userId, user.id))
      .where(eq(roles.key, "owner")),
  ]);
  return orgs.map((org) => ({
    ...org,
    owners: owners
      .filter((owner) => owner.organizationId === org.id)
      .map(({ id, name, email }) => ({ id, name, email })),
  }));
}

/** A new workspace owned by an existing account. */
export async function createWorkspace(input: {
  name: string;
  ownerEmail: string;
  actorUserId: string;
}): Promise<{ id: string }> {
  const email = input.ownerEmail.trim().toLowerCase();
  const [owner] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!owner)
    throw new OrgError(
      "No account has that email. Create the account first.",
      "ownerEmail",
    );
  const created = await createOrganization({
    name: input.name,
    ownerUserId: owner.id,
  });
  return { id: created.id };
}

export async function updateWorkspace(
  id: string,
  input: { name: string; slug: string },
): Promise<void> {
  const name = validateOrgName(input.name);
  const slug = slugify(input.slug);
  if (slug.length < 2)
    throw new OrgError(
      "Use a slug with at least 2 letters or numbers.",
      "slug",
    );
  const [taken] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  if (taken && taken.id !== id)
    throw new OrgError("Another workspace already uses that slug.", "slug");
  const updated = await db
    .update(organizations)
    .set({ name, slug: slug.slice(0, ORG_SLUG_MAX), updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });
  if (!updated.length) throw new OrgError("That workspace no longer exists.");
}

export async function setWorkspaceBlocked(
  id: string,
  blocked: boolean,
): Promise<void> {
  const updated = await db
    .update(organizations)
    .set({ blockedAt: blocked ? new Date() : null, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });
  if (!updated.length) throw new OrgError("That workspace no longer exists.");
}

/**
 * Deletes the workspace and everything in it (properties, reservations,
 * guests, payments, team) for good. The caller must type its exact name.
 * Files already uploaded to storage are not removed.
 */
export async function deleteWorkspace(
  id: string,
  confirmName: string,
): Promise<void> {
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  if (!org) throw new OrgError("That workspace no longer exists.");
  if (confirmName.trim() !== org.name)
    throw new OrgError("Type the workspace name exactly to confirm.");
  await db.delete(organizations).where(eq(organizations.id, id));
}
