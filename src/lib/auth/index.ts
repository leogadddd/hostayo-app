import { registrationDisabled } from "@/lib/flags";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db";
import {
  account,
  session,
  twoFactor as twoFactorTable,
  user,
  verification,
} from "@/lib/db/schema";

const configuredBaseUrl =
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const configuredHost = new URL(configuredBaseUrl).host;

export const auth = betterAuth({
  appName: "Hostayo",
  secret: process.env.BETTER_AUTH_SECRET,
  // Vercel preview deployments receive a unique vercel.app hostname. A static
  // base URL rejects that origin during Better Auth's CSRF/origin validation,
  // which makes email/password sign-in fail on previews. Keep the allowlist
  // explicit while allowing Vercel's generated preview URLs. The fallback also
  // lets direct auth.api calls (such as the seed script) run without request
  // headers from which to resolve a host.
  baseURL: {
    fallback: configuredBaseUrl,
    allowedHosts: [
      "localhost:3000",
      configuredHost,
      // Same deployment on two hosts: the official app and the public demo.
      "app.hostayo.casa",
      "demo.hostayo.casa",
      "*.vercel.app",
    ],
    protocol: process.env.NODE_ENV === "development" ? "http" : "https",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, twoFactor: twoFactorTable },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: registrationDisabled(),
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [
    twoFactor({
      issuer: "Hostayo",
      backupCodeOptions: {
        amount: 10,
        length: 10,
        storeBackupCodes: "encrypted",
      },
      accountLockout: {
        enabled: true,
        maxFailedAttempts: 10,
        durationSeconds: 900,
      },
    }),
  ],
});
