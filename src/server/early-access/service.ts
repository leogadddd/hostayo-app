import "server-only";

import { count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mailer";
import {
  REGISTRATION_INVITE_VALID_DAYS,
  createRegistrationInvite,
  revokeRegistrationInvite,
} from "@/server/registration/service";
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

export interface EarlyAccessEntry {
  name: string;
  email: string;
  social: string;
  units: string;
  source: string;
}

/**
 * Cleans an entry typed in by an operator. Only name and email are required;
 * the rest may stay empty (stored as ""). Returns an error message otherwise.
 */
export function parseEarlyAccessEntry(
  input: Partial<Record<keyof EarlyAccessEntry, unknown>>,
): { entry: EarlyAccessEntry } | { error: string } {
  const entry = {
    name: oneLine(input.name),
    email: oneLine(input.email),
    social: oneLine(input.social),
    units: oneLine(input.units),
    source: oneLine(input.source),
  };
  if (entry.name.length < 2 || entry.name.length > NAME_MAX)
    return { error: "Enter a name (2–80 characters)." };
  if (!EMAIL_PATTERN.test(entry.email) || entry.email.length > EMAIL_MAX)
    return { error: "Enter a valid email address." };
  if (entry.social.length > SOCIAL_MAX)
    return { error: "Facebook / Instagram is too long." };
  if (entry.units.length > CHOICE_MAX || entry.source.length > CHOICE_MAX)
    return { error: "Pick one of the listed options." };
  return { entry };
}

/** Adds an entry by hand. It has been seen by definition, so it is not "new". */
export async function createEarlyAccessEntry(
  entry: EarlyAccessEntry,
): Promise<string> {
  const [row] = await db
    .insert(earlyAccessRequests)
    .values({ ...entry, readAt: new Date() })
    .returning({ id: earlyAccessRequests.id });
  if (!row) throw new Error("Could not save the entry.");
  return row.id;
}

function registerUrl(token: string): string {
  const base = (process.env.BETTER_AUTH_URL ?? "http://localhost:4001").replace(
    /\/+$/,
    "",
  );
  return `${base}/register?tk=${encodeURIComponent(token)}`;
}

function welcomeMessage(
  name: string,
  email: string,
  link: string,
  days: number,
) {
  const first = name.split(" ")[0] || name;
  const text = [
    `Hi ${first},`,
    "",
    "Welcome to Hostayo! Your early-access request is accepted.",
    "",
    "Create your account here:",
    link,
    "",
    `The link is for you only and works for ${days} days. Reply to this email if you need a hand getting started.`,
    "",
    "Hostayo",
  ].join("\n");
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;color:#203a35;line-height:1.55"><p>Hi ${escapeHtml(first)},</p><p>Welcome to Hostayo! Your early-access request is accepted.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;background:#203a35;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Create your account</a></p><p style="font-size:13px;color:#5b6b66">Or paste this into your browser:<br>${escapeHtml(link)}</p><p>The link is for you only and works for ${days} days. Reply to this email if you need a hand getting started.</p><p>Hostayo</p></div>`;
  return {
    to: email,
    replyTo: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || undefined,
    subject: "Welcome to Hostayo: your sign-up link",
    text,
    html,
  };
}

/**
 * Accepts an entry: makes a one-use sign-up link for it (replacing and
 * revoking any earlier one, so this also serves as "send again") and emails
 * it with a welcome. The entry is marked accepted even when the email fails,
 * with `welcomeSentAt` left empty, so the table can show it and the operator
 * can retry. Returns an error message when the email could not be sent.
 */
export async function acceptEarlyAccessEntry(
  id: string,
): Promise<{ error?: string }> {
  const [entry] = await db
    .select()
    .from(earlyAccessRequests)
    .where(eq(earlyAccessRequests.id, id))
    .limit(1);
  if (!entry) return { error: "That entry no longer exists." };

  const invite = await createRegistrationInvite({
    label: `Early access: ${entry.name}`,
    maxUses: 1,
  });
  if (entry.inviteId) await revokeRegistrationInvite(entry.inviteId);
  await db
    .update(earlyAccessRequests)
    .set({
      acceptedAt: entry.acceptedAt ?? new Date(),
      inviteId: invite.id,
      welcomeSentAt: null,
      readAt: entry.readAt ?? new Date(),
    })
    .where(eq(earlyAccessRequests.id, id));

  try {
    await sendMail(
      welcomeMessage(
        entry.name,
        entry.email,
        registerUrl(invite.token),
        REGISTRATION_INVITE_VALID_DAYS,
      ),
    );
  } catch (error) {
    console.error(
      "[early-access] welcome email failed:",
      error instanceof Error ? error.message : error,
    );
    return {
      error:
        error instanceof Error
          ? `Accepted, but the email was not sent: ${error.message}`
          : "Accepted, but the email was not sent.",
    };
  }
  await db
    .update(earlyAccessRequests)
    .set({ welcomeSentAt: new Date() })
    .where(eq(earlyAccessRequests.id, id));
  return {};
}

export async function updateEarlyAccessEntry(
  id: string,
  entry: EarlyAccessEntry,
): Promise<void> {
  await db
    .update(earlyAccessRequests)
    .set(entry)
    .where(eq(earlyAccessRequests.id, id));
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
