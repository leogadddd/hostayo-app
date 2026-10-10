"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient, setTwoFactorChallengeHandler } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthLoadingOverlay } from "@/components/ui/auth-loading-overlay";
import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  KeyRound,
  MailCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { afterAuthPath, inviteQuery } from "@/lib/auth/invite-redirect";
import { Input, Label } from "@/components/ui/input";
import { CodeInput } from "@/components/ui/code-input";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";

const SESSION_RETRY_MS = 5000;

/**
 * Shown when the server couldn't look up the session (see getSession). Keeps
 * checking in the background and sends the user back into the app as soon as
 * their session is reachable again.
 */
function useSessionRecovery(active: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    toast.error("We couldn’t load your session", {
      id: "session-unavailable",
      description: "We’ll reconnect you automatically once it’s back.",
      duration: Infinity,
    });

    let stopped = false;
    let timer: number | undefined;

    async function check() {
      const { data, error } = await authClient
        .getSession()
        .catch((error: unknown) => ({ data: null, error }));
      if (stopped) return;
      if (error) {
        timer = window.setTimeout(check, SESSION_RETRY_MS);
        return;
      }
      toast.dismiss("session-unavailable");
      if (data) {
        toast.success("You’re back online.");
        router.replace("/");
        router.refresh();
      } else {
        // The service is reachable but there is no session: sign in as usual.
        router.replace("/login");
      }
    }

    timer = window.setTimeout(check, SESSION_RETRY_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [active, router]);
}

const DEMO_ACCOUNT = {
  email: "owner@hostayo.dev",
  password: "hostayo-demo-1234",
};

/** Let supporting browsers remember a successful client-side sign-in. */
function saveBrowserCredential(email: string, password: string) {
  const PasswordCredential = (
    window as Window & {
      PasswordCredential?: new (data: {
        id: string;
        name: string;
        password: string;
      }) => Credential;
    }
  ).PasswordCredential;
  if (!PasswordCredential || !navigator.credentials?.store) return;
  void navigator.credentials
    .store(new PasswordCredential({ id: email, name: email, password }))
    .catch(() => {
      // A browser may decline credential storage; sign-in has still succeeded.
    });
}

/** Whether anyone may sign up, only invited people, or nobody (the shared demo). */
type RegistrationMode = "open" | "invite-only" | "closed";

function LoginContent({ registration }: { registration: RegistrationMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demoRequested = searchParams.get("demo") === "1";
  const invite = searchParams.get("invite");
  useSessionRecovery(searchParams.get("session") === "unavailable");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoStarting, setDemoStarting] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [codeShake, setCodeShake] = useState(0);
  const twoFactorRequired = useRef(false);

  useEffect(() => {
    setTwoFactorChallengeHandler(() => {
      twoFactorRequired.current = true;
      setTwoFactorChallenge(true);
    });
    return () => setTwoFactorChallengeHandler(null);
  }, []);

  async function signIn(emailAddress: string, passwordValue: string) {
    setError(null);
    setPending(true);
    twoFactorRequired.current = false;
    const { error } = await authClient.signIn.email({
      email: emailAddress,
      password: passwordValue,
    });
    setPending(false);
    if (error) {
      const message = "That email and password combination didn't work.";
      setError(message);
      toast.error("Couldn’t sign in", { description: message });
      return false;
    }
    // Better Auth signs in over JavaScript rather than an HTML form post, so
    // explicitly hand the successful credentials to Chrome's password manager.
    if (emailAddress !== DEMO_ACCOUNT.email) {
      saveBrowserCredential(emailAddress, passwordValue);
    }
    if (twoFactorRequired.current) return true;
    toast.success("Welcome back.");
    router.push(afterAuthPath(invite, "/"));
    router.refresh();
    return true;
  }

  async function verifyTwoFactor(code = twoFactorCode) {
    setError(null);
    setPending(true);
    const result = useRecoveryCode
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
      : await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (result.error) {
      setError(
        useRecoveryCode
          ? "That recovery code didn’t work. Check it and try again."
          : "That code didn’t work. Codes change every 30 seconds, so try the one showing now.",
      );
      setCodeShake((count) => count + 1);
      if (!useRecoveryCode) setTwoFactorCode("");
      return;
    }
    router.push(afterAuthPath(invite, "/"));
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read the native fields so browser/password-manager autofill works even
    // when it fills after React has mounted and does not fire an input event.
    const form = new FormData(event.currentTarget);
    await signIn(
      String(form.get("username") ?? ""),
      String(form.get("password") ?? ""),
    );
  }

  function continueWithDemo() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setDemoStarting(true);
    window.setTimeout(async () => {
      const signedIn = await signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
      if (!signedIn) setDemoStarting(false);
    }, 1000);
  }

  const leaveChallenge = () => {
    setTwoFactorChallenge(false);
    setTwoFactorCode("");
    setUseRecoveryCode(false);
    setCodeShake(0);
    setError(null);
  };

  if (twoFactorChallenge) {
    const codeReady = useRecoveryCode
      ? Boolean(twoFactorCode.trim())
      : twoFactorCode.length === 6;
    return (
      <div className="animate-rise">
        <button
          type="button"
          onClick={leaveChallenge}
          className="-ml-1 inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm text-pine/70 hover:text-clay"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
        </button>

        <h1 className="mt-10 font-display text-3xl text-pine sm:mt-8">
          {useRecoveryCode ? "Use a recovery code" : "Enter your code"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          {useRecoveryCode ? (
            <>
              Enter one of the recovery codes you saved when you turned on
              two-factor. Each code works once.
            </>
          ) : (
            <>
              Open your authenticator app and enter the 6-digit code for Hostayo
              {email ? (
                <>
                  {" "}
                  (<span className="font-medium text-pine">{email}</span>)
                </>
              ) : null}
              .
            </>
          )}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void verifyTwoFactor();
          }}
          className="mt-8 space-y-6"
        >
          {error ? <AuthErrorBanner message={error} /> : null}
          {useRecoveryCode ? (
            <div
              key={codeShake}
              className={cn(codeShake > 0 && "animate-shake")}
            >
              <Label htmlFor="two-factor-code">Recovery code</Label>
              <Input
                id="two-factor-code"
                value={twoFactorCode}
                onChange={(event) => {
                  setTwoFactorCode(event.target.value);
                  setError(null);
                }}
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                placeholder="xxxxx-xxxxx"
                className="h-12 bg-white px-4 font-mono text-base tracking-widest text-[#22312d] placeholder:text-[#22312d]/35"
                required
              />
            </div>
          ) : (
            <div
              key={codeShake}
              className={cn(codeShake > 0 && "animate-shake")}
            >
              <CodeInput
                id="two-factor-code"
                label="Authenticator code"
                value={twoFactorCode}
                invalid={Boolean(error)}
                disabled={pending}
                onChange={(next) => {
                  setTwoFactorCode(next);
                  setError(null);
                  if (next.length === 6) void verifyTwoFactor(next);
                }}
              />
              <p className="mt-3 text-center text-xs text-ink/50">
                Signs you in as soon as all six digits are in. Codes refresh
                every 30 seconds.
              </p>
            </div>
          )}
          <Button
            type="submit"
            className="h-12 w-full text-base sm:h-11"
            disabled={pending || !codeReady}
          >
            {pending ? "Verifying…" : "Verify and sign in"}
          </Button>
        </form>

        <div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-ink/40">
          <span className="h-px flex-1 bg-pine/10" />
          or
          <span className="h-px flex-1 bg-pine/10" />
        </div>
        <button
          type="button"
          onClick={() => {
            setUseRecoveryCode(!useRecoveryCode);
            setTwoFactorCode("");
            setError(null);
            setCodeShake(0);
          }}
          className="mt-6 flex w-full items-center gap-3.5 rounded-xl border border-pine/12 bg-surface p-4 text-left transition-colors hover:border-pine/30"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine/[0.06] text-pine">
            {useRecoveryCode ? (
              <Smartphone className="h-5 w-5" aria-hidden />
            ) : (
              <KeyRound className="h-5 w-5" aria-hidden />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-pine">
              {useRecoveryCode
                ? "Use your authenticator app"
                : "Use a recovery code instead"}
            </span>
            <span className="mt-0.5 block text-xs text-ink/55">
              {useRecoveryCode
                ? "Enter the 6-digit code from your phone."
                : "If you don’t have your phone with you."}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-pine/40" aria-hidden />
        </button>

        {pending ? <AuthLoadingOverlay label="Signing you in…" /> : null}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-pine">Welcome back</h1>
      <p className="mt-2 text-sm text-ink/60">
        Sign in to your Hostayo account.
      </p>
      {invite ? <InvitationNotice /> : null}

      <form
        onSubmit={onSubmit}
        className="mt-10 space-y-6 sm:mt-8 sm:space-y-5"
        noValidate={false}
        autoComplete="on"
        method="post"
      >
        {error ? <AuthErrorBanner message={error} /> : null}
        <div>
          <Label htmlFor="username">Email address</Label>
          <Input
            id="username"
            name="username"
            type="email"
            autoComplete="username"
            required
            placeholder="you@yourproperty.ph"
            className="h-12 bg-white px-4 text-base text-[#22312d] placeholder:text-[#22312d]/35 sm:h-10 sm:px-3 sm:text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-12 bg-white px-4 text-base text-[#22312d] placeholder:text-[#22312d]/35 sm:h-10 sm:px-3 sm:text-sm"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-base sm:h-10 sm:text-sm"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {registration === "open" || (registration === "invite-only" && invite) ? (
        <p className="mt-8 text-center text-sm text-ink/60">
          Don&apos;t have an account?{" "}
          <Link
            href={`/register${inviteQuery(invite)}`}
            className="font-medium text-pine underline underline-offset-4 hover:text-pine-soft"
          >
            Create one
          </Link>
        </p>
      ) : registration === "invite-only" ? (
        <p className="mt-8 text-center text-sm text-ink/60">
          Don&apos;t have an account?{" "}
          <a
            href={`${SITE_URL.replace(/\/$/, "")}/#early-access`}
            className="font-medium text-pine underline underline-offset-4 hover:text-pine-soft"
          >
            Get early access
          </a>
        </p>
      ) : null}

      <div className="mt-10 flex items-start gap-3 rounded-xl bg-sage/40 p-4 text-xs leading-relaxed text-ink/70">
        <Users className="mt-px h-4 w-4 shrink-0 text-pine" aria-hidden />
        <p>
          For hosts and their teams. Manage. Coordinate. Keep things moving.
        </p>
      </div>

      {demoRequested && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/55 px-6 py-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-mode-title"
            className="w-full max-w-md rounded-2xl bg-paper p-6 shadow-2xl sm:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/60">
              Hostayo demo
            </p>
            <h2
              id="demo-mode-title"
              className="mt-3 font-display text-3xl text-pine"
            >
              You&apos;re entering demo mode.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              You&apos;ll be signed in to our shared sample workspace. Please do
              not add personal, guest, or payment information.
            </p>
            {error && (
              <div className="mt-4">
                <AuthErrorBanner message={error} />
              </div>
            )}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <a
                href={SITE_URL}
                className="inline-flex h-12 items-center justify-center rounded-lg px-4 text-sm font-medium text-pine hover:bg-pine-mist/70 sm:h-10"
              >
                Go back
              </a>
              <Button
                type="button"
                className="h-12 text-base sm:h-10 sm:text-sm"
                onClick={continueWithDemo}
                disabled={demoStarting || pending}
              >
                {demoStarting || pending ? "Opening demo…" : "Continue to demo"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {pending || demoStarting ? (
        <AuthLoadingOverlay
          label={
            demoStarting ? "Opening your demo workspace…" : "Signing you in…"
          }
        />
      ) : null}
    </div>
  );
}

function InvitationNotice() {
  return (
    <p className="mt-6 flex items-start gap-2 rounded-xl border border-pine/15 bg-sage/35 px-4 py-3 text-sm text-pine">
      <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Sign in with the email address your invitation was sent to. You’ll
        review it before joining.
      </span>
    </p>
  );
}

function AuthErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-clay/25 bg-clay-mist/70 px-4 py-3 text-sm text-clay-deep"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export default function LoginPage({
  registration = "open",
}: {
  registration?: RegistrationMode;
}) {
  return (
    <Suspense>
      <LoginContent registration={registration} />
    </Suspense>
  );
}
