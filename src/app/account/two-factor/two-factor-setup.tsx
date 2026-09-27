"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, ArrowRight, Check, ChevronDown, KeyRound, Lock, QrCode, ShieldCheck, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { fireCelebration } from "@/lib/confetti";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/logo";
import { Button, buttonClassName } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { CopyField } from "@/components/ui/copy-field";
import { PasswordDialog } from "@/app/(app)/settings/security/password-dialog";
import { RecoveryCodes } from "@/app/(app)/settings/security/recovery-codes";
import { clearPendingSetup, startTwoFactorSetup, usePendingSetup } from "./pending-setup";

const STEPS = [
  { title: "Scan the QR code", hint: "Add StayOps to your authenticator app.", icon: QrCode },
  { title: "Enter a code", hint: "Prove the app is set up right.", icon: Smartphone },
  { title: "Save recovery codes", hint: "Your way in if you lose your phone.", icon: KeyRound },
] as const;

const APPS = ["Google Authenticator", "1Password", "Authy", "Microsoft Authenticator"];

export function TwoFactorSetup({ email }: { email: string }) {
  const setup = usePendingSetup();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  // Without a pending setup the flow waits at the start; after finishing, every step is done.
  const activeStep = done ? STEPS.length : setup ? step : -1;

  const reset = () => {
    setStep(0);
    setDone(false);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(22rem,0.8fr)_1.2fr]">
      {/* Brand panel with the step list */}
      <aside className="theme-keep-light relative hidden flex-col overflow-hidden bg-pine p-10 text-paper lg:flex">
        <Logo className="text-paper" />
        <div className="relative z-10 mt-16 max-w-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper/10">
            <Lock className="h-7 w-7 text-sand" aria-hidden />
          </span>
          <h1 className="mt-6 font-display text-4xl leading-tight xl:text-5xl">Lock the door behind you.</h1>
          <p className="mt-4 text-sm leading-relaxed text-paper/70">
            Two-factor authentication asks for a code from your phone after your password, so a leaked password alone can’t open {email}.
          </p>
        </div>

        <ol className="relative z-10 mt-12 space-y-1" aria-label="Setup steps">
          {STEPS.map((item, index) => {
            const state = index < activeStep ? "done" : index === activeStep ? "current" : "todo";
            return (
              <li key={item.title} aria-current={state === "current" ? "step" : undefined} className="relative flex gap-4 pb-6 last:pb-0">
                {index < STEPS.length - 1 ? (
                  <span aria-hidden className={cn("absolute left-[1.1875rem] top-11 h-[calc(100%-2.75rem)] w-0.5 rounded-full", state === "done" ? "bg-sage" : "bg-paper/15")} />
                ) : null}
                <span className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  state === "done" ? "bg-sage text-pine-deep" : state === "current" ? "bg-clay text-white ring-4 ring-clay/25" : "border border-paper/25 text-paper/60",
                )}>
                  {state === "done" ? <Check className="h-5 w-5" aria-hidden /> : index + 1}
                </span>
                <span className="pt-1.5">
                  <span className={cn("block text-sm font-semibold", state === "todo" ? "text-paper/60" : "text-paper")}>{item.title}</span>
                  <span className="mt-0.5 block text-sm text-paper/55">{item.hint}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <LogoMark className="pointer-events-none absolute -bottom-16 -right-16 h-96 w-96 text-paper/5" />
      </aside>

      {/* Step */}
      <main className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Logo className="h-8 w-32 lg:invisible" />
          <Link href="/settings/security" className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-pine/75 hover:bg-pine-mist/70 hover:text-pine">
            <X className="h-4 w-4" aria-hidden />
            {done ? "Close" : "Exit setup"}
          </Link>
        </header>

        {/* Phone progress */}
        {activeStep >= 0 && !done ? (
          <div className="px-5 sm:px-8 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-pine/55">Step {activeStep + 1} of {STEPS.length}</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {STEPS.map((item, index) => (
                <span key={item.title} className={cn("h-1.5 rounded-full", index < activeStep ? "bg-moss" : index === activeStep ? "bg-clay" : "bg-pine/10")} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-1 items-start justify-center px-5 pb-12 pt-8 sm:px-8 lg:items-center lg:pt-0">
          <div className="w-full max-w-lg">
            {done ? (
              <Finished />
            ) : !setup ? (
              <Start onStarted={reset} />
            ) : step === 0 ? (
              <ScanStep totpURI={setup.totpURI} onNext={() => setStep(1)} />
            ) : step === 1 ? (
              <VerifyStep onBack={() => setStep(0)} onVerified={() => setStep(2)} />
            ) : (
              <RecoveryStep
                codes={setup.backupCodes}
                onFinish={() => {
                  clearPendingSetup();
                  setDone(true);
                  fireCelebration();
                  toast.success("Two-factor authentication is on.");
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StepHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl leading-tight tracking-tight text-pine sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink/65">{children}</p>
    </div>
  );
}

function Start({ onStarted }: { onStarted: () => void }) {
  return (
    <div className="animate-rise">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/70 text-pine">
        <ShieldCheck className="h-7 w-7" aria-hidden />
      </span>
      <div className="mt-6">
        <StepHeading eyebrow="Two-factor authentication" title="Confirm it’s you to begin">
          For your safety the setup code is never saved, so reloading this page starts over. It takes about two minutes.
        </StepHeading>
      </div>
      <PasswordDialog
        trigger={<>Start setup<ArrowRight className="h-4 w-4" aria-hidden /></>}
        triggerVariant="clay"
        triggerSize="lg"
        triggerClassName="mt-8"
        icon={ShieldCheck}
        title="Confirm it’s you"
        description="Enter your password to start setting up two-factor authentication."
        confirmLabel="Continue"
        onConfirm={async (password) => {
          const error = await startTwoFactorSetup(password);
          if (error) return error;
          onStarted();
        }}
      />
    </div>
  );
}

function ScanStep({ totpURI, onNext }: { totpURI: string; onNext: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const secret = new URL(totpURI).searchParams.get("secret") ?? "";

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(totpURI, { margin: 0, width: 480, color: { dark: "#203a35", light: "#ffffff" } })
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => { if (!cancelled) setQr(null); });
    return () => { cancelled = true; };
  }, [totpURI]);

  return (
    <div className="animate-rise">
      <StepHeading eyebrow="Step 1 of 3" title="Scan with your authenticator app">
        Open your authenticator app, tap <span className="font-medium text-pine">+</span> or <span className="font-medium text-pine">Add account</span>, and point your camera at the code.
      </StepHeading>

      <div className="relative mx-auto mt-8 w-fit p-3">
        {/* Viewfinder corners */}
        {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl"].map((corner) => (
          <span key={corner} aria-hidden className={cn("absolute h-8 w-8 border-clay", corner)} />
        ))}
        <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-white p-4 shadow-[0_18px_40px_-18px_rgba(22,41,37,0.45)] sm:h-60 sm:w-60">
          {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL */}
          {qr ? <img src={qr} alt="QR code for your authenticator app" className="h-full w-full" /> : <div className="h-full w-full animate-pulse rounded-lg bg-pine/5" />}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {APPS.map((app) => (
          <span key={app} className="rounded-full border border-pine/12 bg-surface px-2.5 py-1 text-xs text-ink/60">{app}</span>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-pine/10 bg-surface">
        <button type="button" onClick={() => setShowKey(!showKey)} aria-expanded={showKey} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-pine">
          Can’t scan it? Enter a setup key instead
          <ChevronDown className={cn("h-4 w-4 transition-transform", showKey && "rotate-180")} aria-hidden />
        </button>
        {showKey ? (
          <div className="border-t border-pine/10 px-4 pb-4 pt-3">
            <p className="mb-3 text-sm text-ink/60">Choose “Enter a setup key” in your app, name it StayOps, and pick “Time based”.</p>
            <CopyField label="Setup key" value={secret.replace(/(.{4})/g, "$1 ").trim()} />
          </div>
        ) : null}
      </div>

      <Button type="button" size="lg" className="mt-8 w-full" onClick={onNext}>
        I’ve added it
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}

function VerifyStep({ onBack, onVerified }: { onBack: () => void; onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const verify = async (value: string) => {
    setPending(true);
    setError(null);
    const { error: failure } = await authClient.twoFactor.verifyTotp({ code: value });
    setPending(false);
    if (failure) {
      setError("That code didn’t work. Codes change every 30 seconds, so try the one showing now.");
      setShake((count) => count + 1);
      setCode("");
      return;
    }
    onVerified();
  };

  return (
    <form
      className="animate-rise"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) void verify(code);
      }}
    >
      <StepHeading eyebrow="Step 2 of 3" title="Enter the 6-digit code">
        Type the code your app shows for StayOps. It checks as soon as all six digits are in.
      </StepHeading>

      <div key={shake} className={cn("mt-10", shake > 0 && "animate-shake")}>
        <CodeInput
          value={code}
          invalid={Boolean(error)}
          disabled={pending}
          onChange={(next) => {
            setCode(next);
            setError(null);
            if (next.length === 6) void verify(next);
          }}
        />
      </div>
      <p className={cn("mt-4 min-h-10 text-center text-sm", error ? "text-clay-deep" : "text-ink/50")} role={error ? "alert" : "status"}>
        {pending ? "Checking…" : error ?? ""}
      </p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to the QR code
        </Button>
        <Button type="submit" disabled={code.length !== 6 || pending}>Verify</Button>
      </div>
    </form>
  );
}

function RecoveryStep({ codes, onFinish }: { codes: string[]; onFinish: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="animate-rise">
      <StepHeading eyebrow="Step 3 of 3" title="Save your recovery codes">
        Lost your phone? Each code gets you in once. Keep them in a password manager or somewhere safe. They won’t be shown again.
      </StepHeading>
      <div className="mt-8">
        <RecoveryCodes codes={codes} />
      </div>
      <label className={cn(
        "mt-6 flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors",
        saved ? "border-moss/50 bg-sage/30 text-pine" : "border-pine/12 bg-surface text-ink/75",
      )}>
        <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="mt-0.5 h-4 w-4 accent-pine" />
        I’ve saved my recovery codes somewhere safe.
      </label>
      <Button type="button" variant="clay" size="lg" className="mt-6 w-full" disabled={!saved} onClick={onFinish}>
        <ShieldCheck className="h-5 w-5" aria-hidden />
        Finish setup
      </Button>
    </div>
  );
}

function Finished() {
  return (
    <div className="animate-rise text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sage text-pine shadow-[0_0_0_10px_color-mix(in_oklab,var(--color-sage)_40%,transparent)]">
        <ShieldCheck className="h-10 w-10" aria-hidden />
      </span>
      <h2 className="mt-8 font-display text-4xl tracking-tight text-pine">You’re protected</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink/65">
        Next time you sign in, StayOps will ask for a code from your authenticator app after your password.
      </p>
      <Link href="/settings/security" className={buttonClassName("primary", "lg", "mt-8")}>
        Back to security settings
      </Link>
    </div>
  );
}
