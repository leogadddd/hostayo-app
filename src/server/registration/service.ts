import "server-only";

import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  registrationInviteRedemptions,
  registrationInvites,
} from "@/lib/db/schema";
import { registrationInviteOnly } from "@/lib/flags";
import {
  REGISTRATION_REJECTIONS,
  type RegistrationRejection,
} from "@/lib/auth/registration-access";
import { OrgError, getInvitationForUser } from "@/server/orgs/service";

export const REGISTRATION_INVITE_VALID_DAYS = 14;
export const REGISTRATION_INVITE_LABEL_MAX = 120;
export const REGISTRATION_INVITE_MAX_USES = 1000;

export class RegistrationInviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationInviteError";
  }
}

export type RegistrationInviteStatus =
  "valid" | "invalid" | "used" | "expired" | "revoked";

/** Tokens are 32 URL-safe characters; anything far off is not one of ours. */
function usableToken(token: string | null | undefined): string | null {
  const trimmed = token?.trim();
  return trimmed && trimmed.length <= 200 ? trimmed : null;
}

export function digestRegistrationToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/** Where an invite stands at `now`. Revoked outranks expired outranks used. */
export function registrationInviteStatus(
  invite: {
    maxUses: number;
    useCount: number;
    expiresAt: Date | null;
    revokedAt: Date | null;
  },
  now: Date = new Date(),
): Exclude<RegistrationInviteStatus, "invalid"> {
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && invite.expiresAt <= now) return "expired";
  if (invite.useCount >= invite.maxUses) return "used";
  return "valid";
}

/**
 * Create an early-access link. The raw token is returned exactly once; only
 * a SHA-256 digest is stored, so a database leak can't be turned into links.
 */
export async function createRegistrationInvite(
  input: {
    label?: string | null;
    maxUses?: number;
    /** Days until it stops working; 0 means it never expires. */
    validDays?: number;
  } = {},
): Promise<{
  id: string;
  token: string;
  label: string | null;
  maxUses: number;
  expiresAt: Date | null;
}> {
  const label = input.label?.replace(/\s+/g, " ").trim() || null;
  if (label && label.length > REGISTRATION_INVITE_LABEL_MAX)
    throw new RegistrationInviteError(
      `Keep the label under ${REGISTRATION_INVITE_LABEL_MAX} characters.`,
    );
  const maxUses = input.maxUses ?? 1;
  if (
    !Number.isInteger(maxUses) ||
    maxUses < 1 ||
    maxUses > REGISTRATION_INVITE_MAX_USES
  )
    throw new RegistrationInviteError(
      `Uses must be a whole number from 1 to ${REGISTRATION_INVITE_MAX_USES}.`,
    );
  const validDays = input.validDays ?? REGISTRATION_INVITE_VALID_DAYS;
  if (!Number.isInteger(validDays) || validDays < 0 || validDays > 3650)
    throw new RegistrationInviteError(
      "Days must be a whole number from 0 (never expires) to 3650.",
    );

  const token = randomBytes(24).toString("base64url");
  const expiresAt = validDays
    ? new Date(Date.now() + validDays * 86_400_000)
    : null;
  const [invite] = await db
    .insert(registrationInvites)
    .values({
      tokenHash: digestRegistrationToken(token),
      label,
      maxUses,
      expiresAt,
    })
    .returning({ id: registrationInvites.id });
  if (!invite)
    throw new RegistrationInviteError(
      "Failed to create the invite. Try again.",
    );
  return { id: invite.id, token, label, maxUses, expiresAt };
}

/** Read-only check for the register page; `redeemRegistrationInvite` decides for real. */
export async function inspectRegistrationInvite(
  token: string | null | undefined,
): Promise<RegistrationInviteStatus> {
  const usable = usableToken(token);
  if (!usable) return "invalid";
  const [invite] = await db
    .select({
      maxUses: registrationInvites.maxUses,
      useCount: registrationInvites.useCount,
      expiresAt: registrationInvites.expiresAt,
      revokedAt: registrationInvites.revokedAt,
    })
    .from(registrationInvites)
    .where(eq(registrationInvites.tokenHash, digestRegistrationToken(usable)))
    .limit(1);
  return invite ? registrationInviteStatus(invite) : "invalid";
}

/**
 * Spend one use of an early-access link for `email`. The check and the
 * count happen in a single UPDATE, so two people racing on the last use
 * can't both get in. Returns false when the link can't admit anyone.
 */
export async function redeemRegistrationInvite(input: {
  token: string | null | undefined;
  email: string;
}): Promise<boolean> {
  const usable = usableToken(input.token);
  if (!usable) return false;
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .update(registrationInvites)
      .set({ useCount: sql`${registrationInvites.useCount} + 1` })
      .where(
        and(
          eq(registrationInvites.tokenHash, digestRegistrationToken(usable)),
          isNull(registrationInvites.revokedAt),
          or(
            isNull(registrationInvites.expiresAt),
            gt(registrationInvites.expiresAt, sql`now()`),
          ),
          lt(registrationInvites.useCount, registrationInvites.maxUses),
        ),
      )
      .returning({ id: registrationInvites.id });
    if (!invite) return false;
    await tx.insert(registrationInviteRedemptions).values({
      inviteId: invite.id,
      email: input.email.trim().toLowerCase(),
    });
    return true;
  });
}

export async function listRegistrationInvites() {
  const invites = await db
    .select()
    .from(registrationInvites)
    .orderBy(desc(registrationInvites.createdAt));
  const redemptions = await db
    .select({
      inviteId: registrationInviteRedemptions.inviteId,
      email: registrationInviteRedemptions.email,
      redeemedAt: registrationInviteRedemptions.redeemedAt,
    })
    .from(registrationInviteRedemptions)
    .orderBy(registrationInviteRedemptions.redeemedAt);
  return invites.map((invite) => ({
    id: invite.id,
    label: invite.label,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    expiresAt: invite.expiresAt,
    revokedAt: invite.revokedAt,
    createdAt: invite.createdAt,
    status: registrationInviteStatus(invite),
    redeemedBy: redemptions.filter((entry) => entry.inviteId === invite.id),
  }));
}

/** Stop a link from admitting anyone else. Accepts a full id or its first characters. */
export async function revokeRegistrationInvite(
  idOrPrefix: string,
): Promise<{ id: string; label: string | null; alreadyRevoked: boolean }> {
  const wanted = idOrPrefix.trim().toLowerCase();
  if (!/^[0-9a-f-]{4,36}$/.test(wanted))
    throw new RegistrationInviteError(
      "Give the invite's id, or at least its first 4 characters (see `npm run invite -- list`).",
    );
  const matches = (
    await db
      .select({
        id: registrationInvites.id,
        label: registrationInvites.label,
        revokedAt: registrationInvites.revokedAt,
      })
      .from(registrationInvites)
  ).filter((invite) => invite.id.startsWith(wanted));
  const [match, ...others] = matches;
  if (!match)
    throw new RegistrationInviteError(`No invite starts with ${wanted}.`);
  if (others.length)
    throw new RegistrationInviteError(
      `${matches.length} invites start with ${wanted}. Use more characters.`,
    );
  if (match.revokedAt)
    return { id: match.id, label: match.label, alreadyRevoked: true };
  await db
    .update(registrationInvites)
    .set({ revokedAt: new Date() })
    .where(eq(registrationInvites.id, match.id));
  return { id: match.id, label: match.label, alreadyRevoked: false };
}

export type SignUpAdmission =
  { ok: true } | { ok: false; code: RegistrationRejection; message: string };

/**
 * The rule for who may create an account. With sign-up open, anyone. While
 * it is invite-only, a person with a pending team invitation for their email
 * (which is not spent here: they accept it after signing in) or with an
 * early-access link that still has a use left (which is spent here).
 */
export async function admitSignUp(input: {
  email: string;
  registrationToken?: string | null;
  teamInvitationCode?: string | null;
}): Promise<SignUpAdmission> {
  if (!registrationInviteOnly()) return { ok: true };

  const code = input.teamInvitationCode?.trim();
  let teamInvitationFailed = false;
  if (code && code.length <= 200) {
    try {
      await getInvitationForUser({ code, email: input.email });
      return { ok: true };
    } catch (error) {
      if (!(error instanceof OrgError)) throw error;
      teamInvitationFailed = true;
    }
  }

  if (input.registrationToken?.trim()) {
    if (
      await redeemRegistrationInvite({
        token: input.registrationToken,
        email: input.email,
      })
    )
      return { ok: true };
    return {
      ok: false,
      code: REGISTRATION_REJECTIONS.inviteLinkInvalid,
      message:
        "This invite link has already been used or is no longer valid. Ask us for a new one.",
    };
  }

  if (teamInvitationFailed)
    return {
      ok: false,
      code: REGISTRATION_REJECTIONS.teamInvitationInvalid,
      message:
        "We couldn't find a pending invitation for that email address. Use the address your invitation was sent to, or ask the owner to invite you again.",
    };
  return {
    ok: false,
    code: REGISTRATION_REJECTIONS.inviteRequired,
    message:
      "Hostayo is invite-only for now. You need an invite link to create an account.",
  };
}
