"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { X } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { InfoTip } from "@/components/ui/info-tip";

export interface FormResult {
  error?: string;
  success?: boolean;
  /** Toast shown when the dialog closes. */
  message?: string;
  /** A value shown once in place of the form, such as a temporary password. */
  secret?: { label: string; value: string; info: string };
}

/**
 * A native dialog around a small form, controlled by its parent so a row's
 * actions menu can open it (the menu closes first, so the dialog lives
 * outside it). `onSubmit` gets the form data and returns an error to show, a
 * secret to reveal once, or neither to close.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  info,
  submitLabel,
  destructive = false,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Helper text, shown in a tooltip beside the title. */
  info?: ReactNode;
  submitLabel: string;
  destructive?: boolean;
  onSubmit: (data: FormData) => Promise<FormResult>;
  children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<FormResult["secret"] | null>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setError(null);
      setSecret(null);
      form.current?.reset();
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const close = () => {
    if (!pending) dialog.current?.close();
  };

  const submit = (data: FormData) => {
    startTransition(async () => {
      let result: FormResult;
      try {
        result = await onSubmit(data);
      } catch {
        result = { error: "Something went wrong. Please try again." };
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.secret) {
        setSecret(result.secret);
        return;
      }
      if (result.message) toast.success(result.message);
      dialog.current?.close();
    });
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed left-1/2 top-1/2 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55"
    >
      <form ref={form} action={submit}>
        <div className="flex items-start justify-between gap-4 p-6 pb-2">
          <div className="flex items-center gap-2">
            <h2 id={titleId} className="font-display text-xl text-pine">
              {title}
            </h2>
            {secret ? (
              <InfoTip>{secret.info}</InfoTip>
            ) : info ? (
              <InfoTip>{info}</InfoTip>
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
        {secret ? (
          <div className="px-6 py-4">
            <CopyField label={secret.label} value={secret.value} />
          </div>
        ) : (
          <div className="space-y-4 px-6 py-4">
            {children}
            {error ? (
              <p
                className="rounded-lg bg-clay-mist px-3 py-2 text-sm text-clay-deep"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-pine/10 bg-paper/70 px-6 py-4 sm:flex-row sm:justify-end">
          {secret ? (
            <Button type="button" onClick={close}>
              Done
            </Button>
          ) : (
            <>
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
                variant={destructive ? "clay" : "primary"}
                disabled={pending}
              >
                {pending ? "Working…" : submitLabel}
              </Button>
            </>
          )}
        </div>
      </form>
    </dialog>
  );
}

/** A button that opens a `FormDialog`, for actions that aren't tied to a table row. */
export function FormDialogButton({
  label,
  icon,
  ...dialogProps
}: {
  label: string;
  icon?: ReactNode;
} & Omit<Parameters<typeof FormDialog>[0], "open" | "onOpenChange">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>
      <FormDialog {...dialogProps} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** A confirmation with no fields, as a `FormDialog` body. */
export function ConfirmText({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink/70">{children}</p>;
}
