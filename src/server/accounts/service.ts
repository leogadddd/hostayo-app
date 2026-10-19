import "server-only";

import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  account,
  memberships,
  organizations,
  roles,
  session,
  systemAdmins,
  user,
} from "@/lib/db/schema";

export const ACCOUNT_NAME_MAX = 80;
export const ACCOUNT_EMAIL_MAX = 120;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** A refusal the operator can read: bad input, or an account that must not be touched. */
export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountError";
  }
}

function oneLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function parseAccountInput(input: { name: unknown; email: unknown }): {
  name: string;
  email: string;
} {
  const name = oneLine(input.name);
  const email = oneLine(input.email).toLowerCase();
  if (name.length < 2 || name.length > ACCOUNT_NAME_MAX)
    throw new AccountError("Enter a name (2–80 characters).");
  if (!EMAIL_PATTERN.test(email) || email.length > ACCOUNT_EMAIL_MAX)
    throw new AccountError("Enter a valid email address.");
  return { name, email };
}

/** 12 characters without look-alikes (0/O, 1/l/I), so it can be read out loud. */
export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 12 },
    () => alphabet[randomInt(alphabet.length)],
  ).join("");
}

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  blockedAt: Date | null;
  blockedReason: string | null;
  isL1: boolean;
  isDemoAccount: boolean;
  workspaces: { id: string; name: string; role: string }[];
}

export async function listAccounts(): Promise<AccountRow[]> {
  const [users, l1, memberOf] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        blockedAt: user.blockedAt,
        blockedReason: user.blockedReason,
        isDemoAccount: user.isDemoAccount,
      })
      .from(user)
      .orderBy(asc(user.email))
      .limit(1000),
    db.select({ userId: systemAdmins.userId }).from(systemAdmins),
    db
      .select({
        userId: memberships.userId,
        id: organizations.id,
        name: organizations.name,
        role: roles.key,
      })
      .from(memberships)
      .innerJoin(
        organizations,
        eq(memberships.organizationId, organizations.id),
      )
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .orderBy(asc(organizations.name)),
  ]);
  const l1Ids = new Set(l1.map((row) => row.userId));
  return users.map((row) => ({
    ...row,
    isL1: l1Ids.has(row.id),
    workspaces: memberOf
      .filter((member) => member.userId === row.id)
      .map(({ id, name, role }) => ({ id, name, role })),
  }));
}

async function findAccount(id: string) {
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      isDemoAccount: user.isDemoAccount,
      blockedAt: user.blockedAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!row) throw new AccountError("That account no longer exists.");
  return row;
}

async function assertNotL1(id: string): Promise<void> {
  const [row] = await db
    .select({ userId: systemAdmins.userId })
    .from(systemAdmins)
    .where(eq(systemAdmins.userId, id))
    .limit(1);
  if (row)
    throw new AccountError(
      "That account is an L1 operator. Revoke its L1 access first.",
    );
}

async function assertEmailFree(email: string, exceptId?: string) {
  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(
      exceptId
        ? and(eq(user.email, email), ne(user.id, exceptId))
        : eq(user.email, email),
    )
    .limit(1);
  if (taken) throw new AccountError("Another account already uses that email.");
}

/** Sets the sign-in password, creating the credential record when there is none. */
async function setPassword(userId: string, password: string): Promise<void> {
  const context = await auth.$context;
  const hash = await context.password.hash(password);
  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    )
    .returning({ id: account.id });
  if (updated.length) return;
  const now = new Date();
  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hash,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Creates an account with a temporary password, returned once. It bypasses
 * the sign-up gate on purpose: an operator is the one admitting this person.
 */
export async function createAccount(input: {
  name: unknown;
  email: unknown;
}): Promise<{ id: string; email: string; temporaryPassword: string }> {
  const { name, email } = parseAccountInput(input);
  await assertEmailFree(email);
  const temporaryPassword = generateTemporaryPassword();
  const now = new Date();
  const id = randomBytes(16).toString("hex");
  await db.insert(user).values({
    id,
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  await setPassword(id, temporaryPassword);
  return { id, email, temporaryPassword };
}

export async function updateAccount(
  id: string,
  input: { name: unknown; email: unknown },
): Promise<void> {
  const { name, email } = parseAccountInput(input);
  const existing = await findAccount(id);
  if (existing.isDemoAccount)
    throw new AccountError("The shared demo account can't be edited.");
  await assertEmailFree(email, id);
  await db
    .update(user)
    .set({ name, email, updatedAt: new Date() })
    .where(eq(user.id, id));
}

/** Sets a new temporary password (returned once) and signs the account out everywhere. */
export async function resetAccountPassword(
  id: string,
): Promise<{ email: string; temporaryPassword: string }> {
  const existing = await findAccount(id);
  if (existing.isDemoAccount)
    throw new AccountError("The shared demo password can't be changed.");
  const temporaryPassword = generateTemporaryPassword();
  await setPassword(id, temporaryPassword);
  await db.delete(session).where(eq(session.userId, id));
  return { email: existing.email, temporaryPassword };
}

/** Locks the account and signs it out everywhere. Safe to repeat. */
export async function blockAccount(
  id: string,
  options: { reason?: string; actorUserId?: string } = {},
): Promise<void> {
  if (options.actorUserId === id)
    throw new AccountError("You can't block your own account.");
  const existing = await findAccount(id);
  if (existing.isDemoAccount)
    throw new AccountError("The shared demo account can't be blocked.");
  await assertNotL1(id);
  await db
    .update(user)
    .set({
      blockedAt: existing.blockedAt ?? new Date(),
      blockedReason: oneLine(options.reason).slice(0, 200) || null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, id));
  await db.delete(session).where(eq(session.userId, id));
}

export async function unblockAccount(id: string): Promise<void> {
  await findAccount(id);
  await db
    .update(user)
    .set({ blockedAt: null, blockedReason: null, updatedAt: new Date() })
    .where(eq(user.id, id));
}

/**
 * Deletes the account for good, with its sessions and memberships. Refused
 * for yourself, L1 operators, the demo, and the only owner of a workspace
 * (it would be left with nobody in charge).
 */
export async function deleteAccount(
  id: string,
  options: { actorUserId?: string } = {},
): Promise<void> {
  if (options.actorUserId === id)
    throw new AccountError("You can't delete your own account.");
  const existing = await findAccount(id);
  if (existing.isDemoAccount)
    throw new AccountError("The shared demo account can't be deleted.");
  await assertNotL1(id);

  const owned = await db
    .select({ organizationId: memberships.organizationId })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(and(eq(memberships.userId, id), eq(roles.key, "owner")));
  if (owned.length) {
    const others = await db
      .select({
        organizationId: memberships.organizationId,
        count: sql<number>`count(*)::int`,
      })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          inArray(
            memberships.organizationId,
            owned.map((row) => row.organizationId),
          ),
          eq(roles.key, "owner"),
          ne(memberships.userId, id),
        ),
      )
      .groupBy(memberships.organizationId);
    const covered = new Set(others.map((row) => row.organizationId));
    const sole = owned.filter((row) => !covered.has(row.organizationId));
    if (sole.length)
      throw new AccountError(
        "They are the only owner of a workspace. Delete that workspace or give it another owner first.",
      );
  }

  try {
    await db.delete(user).where(eq(user.id, id));
  } catch {
    throw new AccountError(
      "This account has records that still point to it (such as sent invitations). Block it instead.",
    );
  }
}

/** Finds an account by email, for the command line. */
export async function findAccountByEmail(email: string) {
  const [row] = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.email, oneLine(email).toLowerCase()))
    .limit(1);
  return row ?? null;
}

/** Re-checks the acting operator's own password before a sensitive change. */
async function assertActorPassword(
  actorUserId: string,
  password: string,
): Promise<void> {
  const [credential] = await db
    .select({ hash: account.password })
    .from(account)
    .where(
      and(
        eq(account.userId, actorUserId),
        eq(account.providerId, "credential"),
      ),
    )
    .limit(1);
  const context = await auth.$context;
  const ok =
    credential?.hash &&
    password.length > 0 &&
    password.length <= 128 &&
    (await context.password.verify({ hash: credential.hash, password }));
  if (!ok) throw new AccountError("That password isn't right.");
}

/** Makes the account an L1 operator: owner access to every workspace. */
export async function grantL1(
  id: string,
  options: { actorUserId: string; actorPassword: string },
): Promise<void> {
  await assertActorPassword(options.actorUserId, options.actorPassword);
  const target = await findAccount(id);
  if (target.isDemoAccount)
    throw new AccountError("The shared demo account can't be L1.");
  if (target.blockedAt)
    throw new AccountError("Unblock the account before making it L1.");
  await db.insert(systemAdmins).values({ userId: id }).onConflictDoNothing();
}

/** Removes L1 access. Never your own, and never the last operator left. */
export async function revokeL1(
  id: string,
  options: { actorUserId: string; actorPassword: string },
): Promise<void> {
  await assertActorPassword(options.actorUserId, options.actorPassword);
  if (id === options.actorUserId)
    throw new AccountError("You can't revoke your own L1 access.");
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(systemAdmins);
  if (total <= 1) throw new AccountError("That is the last L1 operator.");
  await db.delete(systemAdmins).where(eq(systemAdmins.userId, id));
}
