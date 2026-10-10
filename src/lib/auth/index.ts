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
import {
  REGISTRATION_TOKEN_HEADER,
  TEAM_INVITATION_HEADER,
} from "@/lib/auth/registration-access";
import { admitSignUp } from "@/server/registration/service";

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
  user: {
    // The server-side gate for invite-only sign-up (REGISTRATION_INVITE_ONLY).
    // Better Auth calls this just before it creates a user, after it has
    // checked the email and password, and rejects the sign-up with a 403 when
    // an error is returned. Hiding the form would not stop a direct API call.
    validateUserInfo: async ({ user: candidate, source }, ctx) => {
      if (source.action !== "create-user") return;
      // Seeds, the nightly demo reset and tests call auth.api directly, with
      // no HTTP request behind them. That is our own server code: let it pass.
      if (!ctx.request) return;
      const admission = await admitSignUp({
        email: String(candidate.email ?? ""),
        registrationToken: ctx.request.headers.get(REGISTRATION_TOKEN_HEADER),
        teamInvitationCode: ctx.request.headers.get(TEAM_INVITATION_HEADER),
      });
      if (!admission.ok)
        return { error: admission.code, errorDescription: admission.message };
    },
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
