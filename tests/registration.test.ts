import { afterEach, describe, expect, it } from "vitest";
import { registrationInviteOnly } from "@/lib/flags";
import {
  REGISTRATION_REJECTIONS,
  isRegistrationRejection,
} from "@/lib/auth/registration-access";
import {
  digestRegistrationToken,
  registrationInviteStatus,
} from "@/server/registration/service";

describe("registrationInviteOnly", () => {
  const original = process.env.REGISTRATION_INVITE_ONLY;
  afterEach(() => {
    if (original === undefined) delete process.env.REGISTRATION_INVITE_ONLY;
    else process.env.REGISTRATION_INVITE_ONLY = original;
  });

  it("is on only for the exact value true, and re-read on every call", () => {
    delete process.env.REGISTRATION_INVITE_ONLY;
    expect(registrationInviteOnly()).toBe(false);
    process.env.REGISTRATION_INVITE_ONLY = "false";
    expect(registrationInviteOnly()).toBe(false);
    process.env.REGISTRATION_INVITE_ONLY = "1";
    expect(registrationInviteOnly()).toBe(false);
    process.env.REGISTRATION_INVITE_ONLY = "true";
    expect(registrationInviteOnly()).toBe(true);
  });
});

describe("registrationInviteStatus", () => {
  const now = new Date("2026-10-10T00:00:00Z");
  const fresh = { maxUses: 1, useCount: 0, expiresAt: null, revokedAt: null };

  it("is valid while a use is left and it hasn't expired", () => {
    expect(registrationInviteStatus(fresh, now)).toBe("valid");
    expect(
      registrationInviteStatus(
        { ...fresh, expiresAt: new Date("2026-10-10T00:00:01Z") },
        now,
      ),
    ).toBe("valid");
    expect(
      registrationInviteStatus({ ...fresh, maxUses: 3, useCount: 2 }, now),
    ).toBe("valid");
  });

  it("is used once every use is spent", () => {
    expect(registrationInviteStatus({ ...fresh, useCount: 1 }, now)).toBe(
      "used",
    );
    expect(
      registrationInviteStatus({ ...fresh, maxUses: 3, useCount: 3 }, now),
    ).toBe("used");
  });

  it("expires at its expiry instant, not after it", () => {
    expect(registrationInviteStatus({ ...fresh, expiresAt: now }, now)).toBe(
      "expired",
    );
  });

  it("reports revoked ahead of expired and used", () => {
    expect(
      registrationInviteStatus(
        {
          maxUses: 1,
          useCount: 1,
          expiresAt: new Date("2026-01-01T00:00:00Z"),
          revokedAt: now,
        },
        now,
      ),
    ).toBe("revoked");
  });
});

describe("digestRegistrationToken", () => {
  it("is a stable SHA-256 hex digest that ignores surrounding whitespace", () => {
    const digest = digestRegistrationToken("abc");
    expect(digest).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(digestRegistrationToken("  abc\n")).toBe(digest);
    expect(digestRegistrationToken("abd")).not.toBe(digest);
  });
});

describe("isRegistrationRejection", () => {
  it("recognises only the sign-up gate's own codes", () => {
    for (const code of Object.values(REGISTRATION_REJECTIONS))
      expect(isRegistrationRejection(code)).toBe(true);
    expect(isRegistrationRejection("USER_ALREADY_EXISTS")).toBe(false);
    expect(isRegistrationRejection(undefined)).toBe(false);
  });
});
