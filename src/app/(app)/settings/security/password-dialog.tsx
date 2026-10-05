"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";

/**
 * Asks for the current password in a modal before a sensitive account change.
 * `onConfirm` returns an error message to keep the dialog open, or nothing
 * to close it. `children` adds fields below the password (e.g. a 2FA code).
 */
export function PasswordDialog({
  trigger,
  triggerVariant = "primary",
  triggerSize = "md",
  triggerClassName,
  icon: Icon,
  tone = "pine",
  title,
  description,
  confirmLabel,
  pendingLabel = "Checking…",
  onConfirm,
  onOpen,
  ready = true,
  children,
}: {
  trigger: ReactNode;
  triggerVariant?: "primary" | "clay" | "outline" | "ghost";
  triggerSize?: "sm" | "md" | "lg";
  triggerClassName?: string;
  icon: ComponentType<{ className?: string }>;
  /** Clay for changes that lower protection. */
  tone?: "pine" | "clay";
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: (password: string) => Promise<string | void>;
  onOpen?: () => void;
  /** Extra fields are complete. */
  ready?: boolean;
  children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const passwordId = useId();

  const close = () => {
    if (!pending) dialog.current?.close();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const message = await onConfirm(password).catch((cause: unknown) =>
      cause instanceof Error ? cause.message : "That didn’t work. Try again.",
    );
    setPending(false);
    if (message) {
      setError(message);
      return;
    }
    setPassword("");
    dialog.current?.close();
  };

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => {
          setError(null);
          setPassword("");
          onOpen?.();
          dialog.current?.showModal();
        }}
      >
        {trigger}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed left-1/2 top-1/2 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55"
      >
        <form onSubmit={submit}>
          <div className="flex items-start gap-4 p-6">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                tone === "clay"
                  ? "bg-clay-mist text-clay-deep"
                  : "bg-sage/70 text-pine",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-xl text-pine">
                {title}
              </h2>
              <p
                id={descriptionId}
                className="mt-2 text-sm leading-relaxed text-ink/65"
              >
                {description}
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor={passwordId}>Current password</Label>
                  <PasswordInput
                    id={passwordId}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    required
                    disabled={pending}
                  />
                </div>
                {children}
              </div>
              {error ? (
                <p
                  className="mt-3 rounded-lg bg-clay-mist px-3 py-2 text-sm text-clay-deep"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={close}
              disabled={pending}
              aria-label="Close"
              className="rounded-md p-1.5 text-ink/45 hover:bg-pine-mist hover:text-pine disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-pine/10 bg-paper/70 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={tone === "clay" ? "clay" : "primary"}
              disabled={pending || !password || !ready}
            >
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
