import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  registrationInviteRedemptions,
  registrationInvites,
  user,
} from "@/lib/db/schema";
import {
  REGISTRATION_REJECTIONS,
  REGISTRATION_TOKEN_HEADER,
  TEAM_INVITATION_HEADER,
} from "@/lib/auth/registration-access";
import { inviteStaff } from "@/server/orgs/service";
import {
  RegistrationInviteError,
  createRegistrationInvite,
  digestRegistrationToken,
  inspectRegistrationInvite,
  listRegistrationInvites,
  redeemRegistrationInvite,
  revokeRegistrationInvite,
} from "@/server/registration/service";
import { createTestOrg } from "./helpers";

let counter = 0;
function email(label: string): string {
  counter += 1;
  return `${label}-${Date.now()}-${counter}@example.com`;
}

async function inviteRow(id: string) {
  const [row] = await db
    .select()
    .from(registrationInvites)
    .where(eq(registrationInvites.id, id));
  return row;
}

describe("early-access links", () => {
  it("stores only the token's digest and admits exactly one sign-up", async () => {
    const invite = await createRegistrationInvite({ label: " Maria  Santos " });
    expect(invite.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(invite.label).toBe("Maria Santos");
    const stored = await inviteRow(invite.id);
    expect(stored?.tokenHash).toBe(digestRegistrationToken(invite.token));
    expect(JSON.stringify(stored)).not.toContain(invite.token);
    // 14 days by default.
    const days = (invite.expiresAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThan(14.1);

    expect(await inspectRegistrationInvite(invite.token)).toBe("valid");
    expect(
      await redeemRegistrationInvite({
        token: invite.token,
        email: "First@Example.com ",
      }),
    ).toBe(true);
    expect(await inspectRegistrationInvite(invite.token)).toBe("used");
    expect(
      await redeemRegistrationInvite({
        token: invite.token,
        email: "second@example.com",
      }),
    ).toBe(false);

    const redemptions = await db
      .select({ email: registrationInviteRedemptions.email })
      .from(registrationInviteRedemptions)
      .where(eq(registrationInviteRedemptions.inviteId, invite.id));
    expect(redemptions).toEqual([{ email: "first@example.com" }]);
    expect((await inviteRow(invite.id))?.useCount).toBe(1);
  });

  it("lets only one of several simultaneous sign-ups through", async () => {
    const invite = await createRegistrationInvite();
    const attempts = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        redeemRegistrationInvite({
          token: invite.token,
          email: `racer-${index}@example.com`,
        }),
      ),
    );
    expect(attempts.filter(Boolean)).toHaveLength(1);
    expect((await inviteRow(invite.id))?.useCount).toBe(1);
    const redemptions = await db
      .select()
      .from(registrationInviteRedemptions)
      .where(eq(registrationInviteRedemptions.inviteId, invite.id));
    expect(redemptions).toHaveLength(1);
  });

  it("admits as many sign-ups as the link was created for, and no more", async () => {
    const invite = await createRegistrationInvite({ maxUses: 3, validDays: 0 });
    expect(invite.expiresAt).toBeNull();
    const attempts = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        redeemRegistrationInvite({
          token: invite.token,
          email: `guest-${index}@example.com`,
        }),
      ),
    );
    expect(attempts.filter(Boolean)).toHaveLength(3);
    expect(await inspectRegistrationInvite(invite.token)).toBe("used");
  });

  it("refuses expired, revoked and unknown links", async () => {
    const expired = await createRegistrationInvite();
    await db
      .update(registrationInvites)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(registrationInvites.id, expired.id));
    expect(await inspectRegistrationInvite(expired.token)).toBe("expired");
    expect(
      await redeemRegistrationInvite({
        token: expired.token,
        email: email("x"),
      }),
    ).toBe(false);

    const revoked = await createRegistrationInvite({ label: "Revoke me" });
    expect(
      await revokeRegistrationInvite(revoked.id.slice(0, 8)),
    ).toMatchObject({ id: revoked.id, alreadyRevoked: false });
    expect(await revokeRegistrationInvite(revoked.id)).toMatchObject({
      alreadyRevoked: true,
    });
    expect(await inspectRegistrationInvite(revoked.token)).toBe("revoked");
    expect(
      await redeemRegistrationInvite({
        token: revoked.token,
        email: email("x"),
      }),
    ).toBe(false);

    for (const token of ["not-a-real-token", "", "   ", "x".repeat(5000), null])
      expect(await inspectRegistrationInvite(token)).toBe("invalid");
    expect(
      await redeemRegistrationInvite({
        token: "not-a-real-token",
        email: email("x"),
      }),
    ).toBe(false);
    expect((await inviteRow(expired.id))?.useCount).toBe(0);
    expect((await inviteRow(revoked.id))?.useCount).toBe(0);
  });

  it("refuses to count past the limit even with a direct database write", async () => {
    const invite = await createRegistrationInvite();
    await expect(
      db
        .update(registrationInvites)
        .set({ useCount: 2 })
        .where(eq(registrationInvites.id, invite.id)),
    ).rejects.toThrow();
  });

  it("validates what it is asked to create, and lists who used a link", async () => {
    await expect(createRegistrationInvite({ maxUses: 0 })).rejects.toThrow(
      RegistrationInviteError,
    );
    await expect(createRegistrationInvite({ maxUses: 1.5 })).rejects.toThrow(
      RegistrationInviteError,
    );
    await expect(createRegistrationInvite({ validDays: -1 })).rejects.toThrow(
      RegistrationInviteError,
    );
    await expect(revokeRegistrationInvite("zz")).rejects.toThrow(
      RegistrationInviteError,
    );

    const invite = await createRegistrationInvite({ label: "Listed" });
    await redeemRegistrationInvite({
      token: invite.token,
      email: "who@example.com",
    });
    const listed = (await listRegistrationInvites()).find(
      (entry) => entry.id === invite.id,
    );
    expect(listed).toMatchObject({
      label: "Listed",
      status: "used",
      useCount: 1,
      maxUses: 1,
    });
    expect(listed?.redeemedBy.map((entry) => entry.email)).toEqual([
      "who@example.com",
    ]);
  });
});

/** A sign-up as the browser makes it: through the auth HTTP handler. */
async function signUp(
  address: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: { code?: string; message?: string } }> {
  const response = await auth.handler(
    new Request("https://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://localhost:3000",
        ...headers,
      },
      body: JSON.stringify({
        name: "Test Host",
        email: address,
        password: "correct-horse-battery",
      }),
    }),
  );
  return {
    status: response.status,
    body: (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    },
  };
}

async function accountExists(address: string): Promise<boolean> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, address));
  return rows.length > 0;
}

describe("invite-only sign-up (REGISTRATION_INVITE_ONLY)", () => {
  const original = process.env.REGISTRATION_INVITE_ONLY;
  beforeEach(() => {
    process.env.REGISTRATION_INVITE_ONLY = "true";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.REGISTRATION_INVITE_ONLY;
    else process.env.REGISTRATION_INVITE_ONLY = original;
  });

  it("leaves sign-up open when the switch is off", async () => {
    process.env.REGISTRATION_INVITE_ONLY = "false";
    const address = email("open");
    expect((await signUp(address)).status).toBe(200);
    expect(await accountExists(address)).toBe(true);
  });

  it("rejects a sign-up with no invite, even straight at the API", async () => {
    const address = email("uninvited");
    const result = await signUp(address);
    expect(result.status).toBe(403);
    expect(result.body.code).toBe(REGISTRATION_REJECTIONS.inviteRequired);
    expect(await accountExists(address)).toBe(false);
  });

  it("rejects a made-up token", async () => {
    const address = email("forged");
    const result = await signUp(address, {
      [REGISTRATION_TOKEN_HEADER]: "A".repeat(32),
    });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe(REGISTRATION_REJECTIONS.inviteLinkInvalid);
    expect(await accountExists(address)).toBe(false);
  });

  it("creates one account per link, then refuses the next person", async () => {
    const invite = await createRegistrationInvite({ label: "One host" });
    const headers = { [REGISTRATION_TOKEN_HEADER]: invite.token };

    const first = email("invited");
    expect((await signUp(first, headers)).status).toBe(200);
    expect(await accountExists(first)).toBe(true);

    const second = email("forwarded");
    const refused = await signUp(second, headers);
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe(REGISTRATION_REJECTIONS.inviteLinkInvalid);
    expect(await accountExists(second)).toBe(false);

    const listed = (await listRegistrationInvites()).find(
      (entry) => entry.id === invite.id,
    );
    expect(listed?.redeemedBy.map((entry) => entry.email)).toEqual([first]);
  });

  it("doesn't spend the link when the sign-up fails for another reason", async () => {
    const invite = await createRegistrationInvite();
    const headers = { [REGISTRATION_TOKEN_HEADER]: invite.token };
    const taken = email("taken");
    process.env.REGISTRATION_INVITE_ONLY = "false";
    expect((await signUp(taken)).status).toBe(200);
    process.env.REGISTRATION_INVITE_ONLY = "true";

    // An email that already has an account is turned away before the gate runs.
    const duplicate = await signUp(taken, headers);
    expect(duplicate.status).toBe(422);
    expect(await inspectRegistrationInvite(invite.token)).toBe("valid");

    const fresh = email("fresh");
    expect((await signUp(fresh, headers)).status).toBe(200);
  });

  it("admits a person with a pending team invitation for their email, without an early-access link", async () => {
    const { org, owner } = await createTestOrg("invite-only");
    const invited = email("staff");
    const invitation = await inviteStaff({
      organizationId: org.id,
      actorUserId: owner.id,
      email: invited,
    });
    const headers = { [TEAM_INVITATION_HEADER]: invitation.code };

    // The invitation is bound to an email: someone else can't ride on its code.
    const stranger = email("stranger");
    const refused = await signUp(stranger, headers);
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe(
      REGISTRATION_REJECTIONS.teamInvitationInvalid,
    );
    expect(await accountExists(stranger)).toBe(false);

    expect((await signUp(invited, headers)).status).toBe(200);
    expect(await accountExists(invited)).toBe(true);
  });

  it("still lets our own server code create accounts (seeds, demo reset)", async () => {
    const address = email("seeded");
    const created = await auth.api.signUpEmail({
      body: {
        name: "Seeded",
        email: address,
        password: "correct-horse-battery",
      },
    });
    expect(created.user.email).toBe(address);
  });
});
