import "dotenv/config";

import {
  REGISTRATION_INVITE_VALID_DAYS,
  createRegistrationInvite,
  listRegistrationInvites,
  revokeRegistrationInvite,
} from "@/server/registration/service";

/**
 * Manages early-access links for invite-only sign-up
 * (REGISTRATION_INVITE_ONLY=true).
 *
 *   npm run invite -- create [who it's for] [--uses N] [--days N]
 *   npm run invite -- list
 *   npm run invite -- revoke <id>
 *
 * A link admits one sign-up and lasts 14 days unless told otherwise
 * (`--days 0` never expires). The link is printed once: only its digest is
 * stored. Check the database host this prints: `.env` decides which database
 * it touches, and BETTER_AUTH_URL which site the link points at.
 */
const USAGE =
  "Usage: npm run invite -- create [who it's for] [--uses N] [--days N] | list | revoke <id>";

function date(value: Date): string {
  return value.toLocaleDateString("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  });
}

function expiry(value: Date | null): string {
  return value ? `expires ${date(value)}` : "never expires";
}

/** Splits `--uses 3 --days=30 Maria Santos` into flags and the remaining words. */
function parseCreate(args: string[]): {
  label: string;
  uses?: number;
  days?: number;
} {
  const words: string[] = [];
  const flags: Record<string, number> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    const match = /^--(uses|days)(?:=(.*))?$/.exec(arg);
    if (!match) {
      if (arg.startsWith("--"))
        throw new Error(`Unknown option ${arg}.\n${USAGE}`);
      words.push(arg);
      continue;
    }
    const raw = match[2] ?? args[(index += 1)];
    if (raw === undefined || !/^\d+$/.test(raw))
      throw new Error(`--${match[1]} needs a whole number.`);
    flags[match[1] as "uses" | "days"] = Number(raw);
  }
  return { label: words.join(" "), uses: flags.uses, days: flags.days };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const host = new URL(process.env.DATABASE_URL ?? "postgres://unknown").host;
  console.log(`Database: ${host}`);

  if (command === "list") {
    const invites = await listRegistrationInvites();
    if (!invites.length) console.log("No early-access links yet.");
    for (const invite of invites) {
      console.log(
        `${invite.id.slice(0, 8)}  ${invite.status.padEnd(7)}  ${invite.useCount}/${invite.maxUses} used  ${expiry(invite.expiresAt)}  ${invite.label ?? "(no label)"}`,
      );
      for (const entry of invite.redeemedBy)
        console.log(`          ${entry.email} on ${date(entry.redeemedAt)}`);
    }
    return;
  }

  if (command === "revoke") {
    const [id] = rest;
    if (!id) throw new Error(USAGE);
    const revoked = await revokeRegistrationInvite(id);
    console.log(
      `${revoked.id.slice(0, 8)} (${revoked.label ?? "no label"}) ${revoked.alreadyRevoked ? "was already revoked" : "is revoked"}. Accounts already created with it are not affected.`,
    );
    return;
  }

  if (command !== "create") throw new Error(USAGE);
  const { label, uses, days } = parseCreate(rest);
  const invite = await createRegistrationInvite({
    label,
    maxUses: uses,
    validDays: days,
  });
  const base = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  console.log(
    `${invite.label ? `For ${invite.label}: ` : ""}${invite.maxUses} sign-up${invite.maxUses === 1 ? "" : "s"}, ${expiry(invite.expiresAt)}${days === undefined ? ` (${REGISTRATION_INVITE_VALID_DAYS} days)` : ""}.`,
  );
  console.log(`${base}/register?tk=${invite.token}`);
  console.log(
    "Copy it now: the link is shown once and only its digest is stored.",
  );
  if (process.env.REGISTRATION_INVITE_ONLY !== "true")
    console.log(
      "Note: REGISTRATION_INVITE_ONLY is not true in this .env, so sign-up here is open to everyone and the link isn't needed.",
    );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
