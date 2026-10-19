import "dotenv/config";

import {
  AccountError,
  blockAccount,
  deleteAccount,
  findAccountByEmail,
  listAccounts,
  resetAccountPassword,
  unblockAccount,
} from "@/server/accounts/service";

/**
 * Manages accounts from the command line, the same operations as the
 * Accounts page.
 *
 *   npm run accounts -- list
 *   npm run accounts -- block <email> [reason]
 *   npm run accounts -- unblock <email>
 *   npm run accounts -- reset-password <email>
 *   npm run accounts -- delete <email>
 *
 * Check the database host this prints: `.env` decides which database it touches.
 */
const USAGE =
  "Usage: npm run accounts -- list | block <email> [reason] | unblock <email> | reset-password <email> | delete <email>";

async function main() {
  const [command, email, ...reason] = process.argv.slice(2);
  const host = new URL(process.env.DATABASE_URL ?? "postgres://unknown").host;
  console.log(`Database: ${host}`);

  if (command === "list") {
    const accounts = await listAccounts();
    for (const account of accounts) {
      const flags = [
        account.blockedAt ? "BLOCKED" : null,
        account.isL1 ? "L1" : null,
        account.isDemoAccount ? "demo" : null,
      ]
        .filter(Boolean)
        .join(" ");
      console.log(
        `${account.email} (${account.name}) last login ${
          account.lastLoginAt?.toISOString() ?? "never"
        }${flags ? ` [${flags}]` : ""}`,
      );
    }
    console.log(`${accounts.length} accounts.`);
    return;
  }

  if (
    !email ||
    !["block", "unblock", "reset-password", "delete"].includes(command ?? "")
  )
    throw new AccountError(USAGE);
  const account = await findAccountByEmail(email);
  if (!account) throw new AccountError(`No account with the email ${email}.`);

  if (command === "block") {
    await blockAccount(account.id, { reason: reason.join(" ") });
    console.log(`${account.email} is blocked and signed out everywhere.`);
  } else if (command === "unblock") {
    await unblockAccount(account.id);
    console.log(`${account.email} can sign in again.`);
  } else if (command === "reset-password") {
    const reset = await resetAccountPassword(account.id);
    console.log(`New password for ${reset.email}: ${reset.temporaryPassword}`);
    console.log("Shown once. They are signed out everywhere.");
  } else {
    await deleteAccount(account.id);
    console.log(`${account.email} is deleted.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
