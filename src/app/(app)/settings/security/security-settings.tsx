"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  LogIn,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CodeInput } from "@/components/ui/code-input";
import { Input } from "@/components/ui/input";
import { startTwoFactorSetup } from "@/app/account/two-factor/pending-setup";
import { setSecurityAlertAction, type SecurityAlert } from "./actions";
import { PasswordDialog } from "./password-dialog";
import { RecoveryCodes } from "./recovery-codes";

export function SecuritySettings({
  email,
  twoFactorEnabled,
  preferences,
}: {
  email: string;
  twoFactorEnabled: boolean;
  preferences: Record<SecurityAlert, boolean>;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <TwoFactorCard enabled={twoFactorEnabled} />
      <SecurityAlerts email={email} preferences={preferences} />
    </div>
  );
}

function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const codesDialog = useRef<HTMLDialogElement>(null);

  return (
    <Card className="overflow-hidden bg-card">
      <CardHeader className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <IconTile
            icon={enabled ? ShieldCheck : ShieldOff}
            tone={enabled ? "sage" : "clay"}
          />
          <div className="min-w-0">
            <h2 className="font-display text-xl text-pine">
              Two-factor authentication
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ink/60">
              Ask for a code from your phone as well as your password when you
              sign in, so a leaked password alone can’t get into your account.
            </p>
          </div>
        </div>
        <Badge tone={enabled ? "sage" : "clay"} className="shrink-0">
          {enabled ? "On" : "Off"}
        </Badge>
      </CardHeader>

      {enabled ? (
        <div className="divide-y divide-pine/10">
          <SettingRow
            icon={Smartphone}
            title="Authenticator app"
            description="Codes come from the authenticator app you set up."
            action={<TurnOffTwoFactor onDone={() => router.refresh()} />}
          />
          <SettingRow
            icon={KeyRound}
            title="Recovery codes"
            description="One-time codes for when your phone isn’t with you. Making new ones cancels the old set."
            action={
              <PasswordDialog
                trigger={
                  <>
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    New codes
                  </>
                }
                triggerVariant="outline"
                triggerSize="sm"
                icon={KeyRound}
                title="Make new recovery codes?"
                description="Your current recovery codes will stop working. Confirm your password to continue."
                confirmLabel="Make new codes"
                pendingLabel="Making codes…"
                onConfirm={async (password) => {
                  const { data, error } =
                    await authClient.twoFactor.generateBackupCodes({
                      password,
                    });
                  if (error || !data)
                    return (
                      error?.message ?? "Couldn’t make new codes. Try again."
                    );
                  setFreshCodes(data.backupCodes);
                  window.setTimeout(() => codesDialog.current?.showModal(), 0);
                }}
              />
            }
          />
        </div>
      ) : (
        <CardBody>
          <ol className="grid gap-3 sm:grid-cols-3">
            <SetupStep
              number={1}
              title="Confirm password"
              description="So only you can change this."
            />
            <SetupStep
              number={2}
              title="Scan a QR code"
              description="With Google Authenticator, 1Password, Authy or similar."
            />
            <SetupStep
              number={3}
              title="Save recovery codes"
              description="For when your phone isn’t with you."
            />
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PasswordDialog
              trigger={
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Set up two-factor
                </>
              }
              triggerVariant="clay"
              icon={ShieldCheck}
              title="Confirm it’s you"
              description="Enter your password to start setting up two-factor authentication."
              confirmLabel="Continue"
              onConfirm={async (password) => {
                const error = await startTwoFactorSetup(password);
                if (error) return error;
                router.push("/account/two-factor");
              }}
            />
            <p className="text-xs text-ink/50">Takes about two minutes.</p>
          </div>
        </CardBody>
      )}

      <dialog
        ref={codesDialog}
        aria-label="New recovery codes"
        onClose={() => setFreshCodes(null)}
        className="fixed left-1/2 top-1/2 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55"
      >
        <div className="flex items-start gap-4 p-6">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl text-pine">
              Your new recovery codes
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              Each code works once. Save them now; they won’t be shown again.
            </p>
            <div className="mt-4">
              {freshCodes ? <RecoveryCodes codes={freshCodes} /> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => codesDialog.current?.close()}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink/45 hover:bg-pine-mist hover:text-pine"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex justify-end border-t border-pine/10 bg-paper/70 px-6 py-4">
          <Button type="button" onClick={() => codesDialog.current?.close()}>
            I’ve saved them
          </Button>
        </div>
      </dialog>
    </Card>
  );
}

function TurnOffTwoFactor({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const codeValid = useRecovery ? code.trim().length >= 6 : code.length === 6;

  return (
    <PasswordDialog
      trigger="Turn off"
      triggerVariant="outline"
      triggerSize="sm"
      triggerClassName="text-clay-deep hover:border-clay/40 hover:bg-clay-mist/60"
      icon={ShieldOff}
      tone="clay"
      title="Turn off two-factor?"
      description="Your account will only be protected by your password. Confirm your password and a code to continue."
      confirmLabel="Turn off two-factor"
      pendingLabel="Turning off…"
      ready={codeValid}
      onOpen={() => {
        setCode("");
        setUseRecovery(false);
      }}
      onConfirm={async (password) => {
        const verification = useRecovery
          ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
          : await authClient.twoFactor.verifyTotp({ code });
        if (verification.error)
          return "That code didn’t work. Check it and try again.";
        const { error } = await authClient.twoFactor.disable({ password });
        if (error)
          return error.status === 400 || error.status === 401
            ? "That password isn’t right."
            : (error.message ?? "Couldn’t turn off two-factor.");
        toast.success("Two-factor authentication is off.");
        onDone();
      }}
    >
      <div className="border-t border-pine/10 pt-4">
        <p
          id="disable-code-label"
          className="mb-2 text-sm font-medium text-ink"
        >
          {useRecovery ? "Recovery code" : "Code from your authenticator app"}
        </p>
        {useRecovery ? (
          <Input
            id="disable-code"
            aria-labelledby="disable-code-label"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="xxxxx-xxxxx"
            className="h-11 font-mono tracking-widest"
          />
        ) : (
          <CodeInput
            id="disable-code"
            label="Code from your authenticator app"
            value={code}
            onChange={setCode}
            size="sm"
            autoFocus={false}
          />
        )}
        <button
          type="button"
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode("");
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-pine/75 underline-offset-4 hover:text-pine hover:underline"
        >
          {useRecovery ? (
            <Smartphone className="h-4 w-4" aria-hidden />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden />
          )}
          {useRecovery
            ? "Use your authenticator app instead"
            : "Use a recovery code instead"}
        </button>
      </div>
    </PasswordDialog>
  );
}

const ALERTS: {
  key: SecurityAlert;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}[] = [
  {
    key: "newSignInAlerts",
    icon: LogIn,
    title: "New sign-in",
    description:
      "When your account is signed in to from a new device or browser.",
  },
  {
    key: "twoFactorChangeAlerts",
    icon: ShieldAlert,
    title: "Two-factor changes",
    description:
      "When two-factor is turned on or off, or new recovery codes are made.",
  },
];

function SecurityAlerts({
  email,
  preferences,
}: {
  email: string;
  preferences: Record<SecurityAlert, boolean>;
}) {
  const [, startTransition] = useTransition();
  const [values, setOptimistic] = useOptimistic(
    preferences,
    (state, change: { key: SecurityAlert; enabled: boolean }) => ({
      ...state,
      [change.key]: change.enabled,
    }),
  );

  const toggle = (key: SecurityAlert, enabled: boolean) => {
    startTransition(async () => {
      setOptimistic({ key, enabled });
      const result = await setSecurityAlertAction(key, enabled);
      if (result.error)
        toast.error("Alert setting wasn’t saved", {
          description: result.error,
        });
      else toast.success(enabled ? "Alert turned on." : "Alert turned off.");
    });
  };

  return (
    <Card className="overflow-hidden bg-card">
      <CardHeader>
        <h2 className="font-display text-xl text-pine">Security alerts</h2>
        <p className="mt-1 max-w-xl text-sm text-ink/60">
          Choose what we tell you about. Alerts go to{" "}
          <span className="font-medium text-pine">{email}</span> once email
          alerts are switched on for Hostayo.
        </p>
      </CardHeader>
      <CardBody className="grid gap-3 sm:grid-cols-2">
        {ALERTS.map((alert) => {
          const on = values[alert.key];
          return (
            <label
              key={alert.key}
              className={cn(
                "flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-colors",
                on
                  ? "border-pine/25 bg-surface"
                  : "border-pine/10 bg-paper/60 hover:border-pine/20",
              )}
            >
              <IconTile
                icon={alert.icon}
                tone={on ? "sage" : "neutral"}
                small
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-pine">
                  {alert.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-ink/60">
                  {alert.description}
                </span>
              </span>
              <Switch
                checked={on}
                onChange={(next) => toggle(alert.key, next)}
                label={`${alert.title} alerts`}
              />
            </label>
          );
        })}
      </CardBody>
    </Card>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        checked ? "bg-primary" : "bg-pine/20",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function IconTile({
  icon: Icon,
  tone,
  small = false,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: "sage" | "clay" | "neutral";
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        small ? "h-9 w-9" : "h-11 w-11",
        tone === "sage"
          ? "bg-sage/70 text-pine"
          : tone === "clay"
            ? "bg-clay-mist text-clay-deep"
            : "bg-pine/[0.06] text-pine/55",
      )}
    >
      <Icon className={small ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
    </span>
  );
}

function SettingRow({
  icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
      <IconTile icon={icon} tone="neutral" small />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-pine">{title}</p>
        <p className="mt-0.5 text-sm text-ink/60">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function SetupStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <li className="rounded-xl border border-pine/10 bg-paper/60 p-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
        {number}
      </span>
      <p className="mt-3 text-sm font-semibold text-pine">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink/60">{description}</p>
    </li>
  );
}
