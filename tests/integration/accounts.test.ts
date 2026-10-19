import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  earlyAccessRequests,
  session,
  systemAdmins,
  user,
} from "@/lib/db/schema";
import { REGISTRATION_TOKEN_HEADER } from "@/lib/auth/registration-access";
import {
  AccountError,
  blockAccount,
  createAccount,
  deleteAccount,
  grantL1,
  revokeL1,
  resetAccountPassword,
  unblockAccount,
} from "@/server/accounts/service";
import {
  restoreEarlyAccessEntry,
  revokeEarlyAccessEntry,
} from "@/server/early-access/service";
import { createRegistrationInvite } from "@/server/registration/service";
import { createTestOrg } from "./helpers";

let counter = 0;
function email(label: string): string {
  counter += 1;
  return `${label}-${Date.now()}-${counter}@example.com`;
}

async function signIn(address: string, password: string) {
  return auth.api.signInEmail({ body: { email: address, password } });
}

async function account(id: string) {
  const [row] = await db.select().from(user).where(eq(user.id, id));
  return row!;
}

describe("accounts", () => {
  it("creates an account that signs in with its temporary password and records the login", async () => {
    const created = await createAccount({
      name: " Ana  Reyes ",
      email: email("ana").toUpperCase(),
    });
    expect(created.temporaryPassword).toHaveLength(12);
    expect((await account(created.id)).name).toBe("Ana Reyes");
    expect((await account(created.id)).lastLoginAt).toBeNull();

    await signIn(created.email, created.temporaryPassword);
    expect((await account(created.id)).lastLoginAt).toBeInstanceOf(Date);
    await expect(
      createAccount({ name: "Ana", email: created.email }),
    ).rejects.toThrow("already uses that email");
  });

  it("blocks sign-in and ends sessions, then lets the account back in", async () => {
    const created = await createAccount({ name: "Ben", email: email("ben") });
    await signIn(created.email, created.temporaryPassword);
    expect(
      await db.select().from(session).where(eq(session.userId, created.id)),
    ).toHaveLength(1);

    await blockAccount(created.id, { reason: "Test" });
    expect(
      await db.select().from(session).where(eq(session.userId, created.id)),
    ).toHaveLength(0);
    await expect(
      signIn(created.email, created.temporaryPassword),
    ).rejects.toThrow(/blocked/i);

    await unblockAccount(created.id);
    await signIn(created.email, created.temporaryPassword);
  });

  it("resets the password and signs the account out", async () => {
    const created = await createAccount({ name: "Cy", email: email("cy") });
    await signIn(created.email, created.temporaryPassword);
    const reset = await resetAccountPassword(created.id);
    expect(reset.temporaryPassword).not.toBe(created.temporaryPassword);
    expect(
      await db.select().from(session).where(eq(session.userId, created.id)),
    ).toHaveLength(0);
    await expect(
      signIn(created.email, created.temporaryPassword),
    ).rejects.toThrow();
    await signIn(created.email, reset.temporaryPassword);
  });

  it("refuses to block or delete yourself, and to delete a workspace's only owner", async () => {
    const { owner } = await createTestOrg("acct");
    await expect(
      blockAccount(owner.id, { actorUserId: owner.id }),
    ).rejects.toThrow(AccountError);
    await expect(
      deleteAccount(owner.id, { actorUserId: owner.id }),
    ).rejects.toThrow(AccountError);
    await expect(deleteAccount(owner.id)).rejects.toThrow("only owner");
  });

  it("deletes an account with no workspace", async () => {
    const created = await createAccount({ name: "Di", email: email("di") });
    await deleteAccount(created.id);
    expect(await db.select().from(user).where(eq(user.id, created.id))).toEqual(
      [],
    );
  });
});

describe("revoking early access", () => {
  async function entryWithAccount() {
    const invite = await createRegistrationInvite({ label: "Test" });
    const address = email("early");
    const [entry] = await db
      .insert(earlyAccessRequests)
      .values({
        name: "Early Bird",
        email: address,
        social: "",
        units: "",
        source: "",
        acceptedAt: new Date(),
        inviteId: invite.id,
      })
      .returning();
    // Sign up the way the register page does: over HTTP, with the link's token.
    const response = await auth.handler(
      new Request("http://localhost:4001/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:4001",
          [REGISTRATION_TOKEN_HEADER]: invite.token,
        },
        body: JSON.stringify({
          name: "Early Bird",
          email: address,
          password: "a-long-enough-password",
        }),
      }),
    );
    expect(response.status).toBe(200);
    return { entry: entry!, address, password: "a-long-enough-password" };
  }

  it("links the account made with the link, blocks it on revoke, and restores it", async () => {
    const { entry, address, password } = await entryWithAccount();
    const [linked] = await db
      .select()
      .from(earlyAccessRequests)
      .where(eq(earlyAccessRequests.id, entry.id));
    expect(linked?.userId).toBeTruthy();

    expect(await revokeEarlyAccessEntry(entry.id)).toEqual({});
    await expect(signIn(address, password)).rejects.toThrow(/blocked/i);

    expect(await restoreEarlyAccessEntry(entry.id)).toEqual({});
    await signIn(address, password);
  });

  it("only kills the link when nobody has signed up with it", async () => {
    const invite = await createRegistrationInvite({ label: "Unused" });
    const [entry] = await db
      .insert(earlyAccessRequests)
      .values({
        name: "No Show",
        email: email("noshow"),
        social: "",
        units: "",
        source: "",
        acceptedAt: new Date(),
        inviteId: invite.id,
      })
      .returning();
    expect(await revokeEarlyAccessEntry(entry!.id)).toEqual({});
    const [after] = await db
      .select()
      .from(earlyAccessRequests)
      .where(eq(earlyAccessRequests.id, entry!.id));
    expect(after?.acceptedAt).toBeNull();
    expect(after?.inviteId).toBeNull();
  });
});

describe("L1 access", () => {
  async function isL1(id: string) {
    const rows = await db
      .select()
      .from(systemAdmins)
      .where(eq(systemAdmins.userId, id));
    return rows.length > 0;
  }

  it("needs the acting operator's own password to grant and revoke", async () => {
    const actor = await createAccount({ name: "Op", email: email("op") });
    await db.insert(systemAdmins).values({ userId: actor.id });
    const target = await createAccount({ name: "Tee", email: email("tee") });

    await expect(
      grantL1(target.id, { actorUserId: actor.id, actorPassword: "wrong" }),
    ).rejects.toThrow("password isn't right");
    expect(await isL1(target.id)).toBe(false);

    await grantL1(target.id, {
      actorUserId: actor.id,
      actorPassword: actor.temporaryPassword,
    });
    expect(await isL1(target.id)).toBe(true);
    // An L1 operator can't be blocked or deleted until the access is revoked.
    await expect(blockAccount(target.id)).rejects.toThrow("L1 operator");

    await expect(
      revokeL1(target.id, { actorUserId: actor.id, actorPassword: "wrong" }),
    ).rejects.toThrow("password isn't right");
    await revokeL1(target.id, {
      actorUserId: actor.id,
      actorPassword: actor.temporaryPassword,
    });
    expect(await isL1(target.id)).toBe(false);
  });

  it("refuses to revoke your own L1 access", async () => {
    const actor = await createAccount({ name: "Self", email: email("self") });
    await db.insert(systemAdmins).values({ userId: actor.id });
    await expect(
      revokeL1(actor.id, {
        actorUserId: actor.id,
        actorPassword: actor.temporaryPassword,
      }),
    ).rejects.toThrow("your own L1");
  });

  it("won't make a blocked account L1", async () => {
    const actor = await createAccount({ name: "Op2", email: email("op2") });
    await db.insert(systemAdmins).values({ userId: actor.id });
    const target = await createAccount({ name: "Blk", email: email("blk") });
    await blockAccount(target.id);
    await expect(
      grantL1(target.id, {
        actorUserId: actor.id,
        actorPassword: actor.temporaryPassword,
      }),
    ).rejects.toThrow("Unblock");
  });
});
