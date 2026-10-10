import "server-only";

import { count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { earlyAccessRequests } from "@/lib/db/schema";

const NAME_MAX = 80;
const EMAIL_MAX = 120;
const SOCIAL_MAX = 200;
const CHOICE_MAX = 20;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export interface NewEarlyAccessRequest {
  name: string;
  email: string;
  social: string;
  units: string;
  source: string;
}

function oneLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Cleans a request body from the marketing site; null when a field is missing or too long. */
export function parseEarlyAccessBody(
  body: unknown,
): NewEarlyAccessRequest | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const request = {
    name: oneLine(input.name),
    email: oneLine(input.email),
    social: oneLine(input.social),
    units: oneLine(input.units),
    source: oneLine(input.source),
  };
  if (request.name.length < 2 || request.name.length > NAME_MAX) return null;
  if (!EMAIL_PATTERN.test(request.email) || request.email.length > EMAIL_MAX)
    return null;
  if (request.social.length < 3 || request.social.length > SOCIAL_MAX)
    return null;
  if (!request.units || request.units.length > CHOICE_MAX) return null;
  if (!request.source || request.source.length > CHOICE_MAX) return null;
  return request;
}

export async function createEarlyAccessRequest(
  request: NewEarlyAccessRequest,
): Promise<void> {
  await db.insert(earlyAccessRequests).values(request);
}

export async function listEarlyAccessRequests() {
  return db
    .select()
    .from(earlyAccessRequests)
    .orderBy(desc(earlyAccessRequests.createdAt))
    .limit(500);
}

export async function countUnreadEarlyAccessRequests(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(earlyAccessRequests)
    .where(isNull(earlyAccessRequests.readAt));
  return row?.value ?? 0;
}

export async function setEarlyAccessRead(
  id: string,
  read: boolean,
): Promise<void> {
  await db
    .update(earlyAccessRequests)
    .set({ readAt: read ? new Date() : null })
    .where(eq(earlyAccessRequests.id, id));
}

export async function markAllEarlyAccessRead(): Promise<void> {
  await db
    .update(earlyAccessRequests)
    .set({ readAt: new Date() })
    .where(isNull(earlyAccessRequests.readAt));
}

export async function deleteEarlyAccessRequest(id: string): Promise<void> {
  await db.delete(earlyAccessRequests).where(eq(earlyAccessRequests.id, id));
}
