"use client";

import { useId, useRef, useState } from "react";
import { Check, CircleCheck, Compass, Copy, CreditCard, Eye, EyeOff, Hammer, KeyRound, LogOut, MapPin, Phone, ScrollText, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Label, Select, Textarea } from "@/components/ui/input";
import { guestCheckOutAction, guestDamageReportAction } from "./actions";

const DAMAGE_AREAS = ["Bedroom", "Bathroom", "Kitchen", "Living area", "Outdoor or terrace", "Appliance or fixture", "Something else"];

export function WifiCard({ name, password }: { name: string; password: string | null }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState<"name" | "password" | null>(null);

  async function copy(kind: "name" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Couldn’t copy. Select the text and copy it instead.");
    }
  }

  const rows = [
    { kind: "name" as const, label: "Network", value: name, display: name },
    ...(password ? [{ kind: "password" as const, label: "Password", value: password, display: shown ? password : "•".repeat(Math.min(password.length, 14)) }] : []),
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.kind} className="flex items-center gap-3 rounded-lg border border-pine/12 bg-surface px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink/55">{row.label}</p>
            <p className="truncate font-mono text-base text-pine">{row.display}</p>
          </div>
          {row.kind === "password" ? (
            <button type="button" onClick={() => setShown((value) => !value)} aria-label={shown ? "Hide password" : "Show password"} className="rounded-md p-2 text-ink/55 hover:bg-pine-mist hover:text-pine">
              {shown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => copy(row.kind, row.value)} aria-label={`Copy ${row.label.toLowerCase()}`}>
            {copied === row.kind ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied === row.kind ? "Copied" : "Copy"}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function StayActions({ token, unitName, checkoutTime, initiallyCheckedOut }: {
  token: string;
  unitName: string;
  checkoutTime: string;
  initiallyCheckedOut: boolean;
}) {
  const [checkedOut, setCheckedOut] = useState(initiallyCheckedOut);

  return (
    <div className="space-y-4">
      {checkedOut ? (
        <div role="status" className="rounded-xl border border-moss/40 bg-sage/50 p-6 text-center">
          <CircleCheck className="mx-auto h-9 w-9 text-moss" aria-hidden />
          <h2 className="mt-3 font-display text-2xl text-pine">You’re checked out</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/70">Thank you for staying at {unitName}. Your host has been told, and the cleaning team is getting the unit ready. Safe travels.</p>
        </div>
      ) : (
        <section aria-labelledby="actions-heading" className="rounded-xl border border-pine/12 bg-linen p-5 shadow-[0_2px_8px_rgba(32,58,53,0.035)]">
          <h2 id="actions-heading" className="font-display text-xl text-pine">Need something?</h2>
          <p className="mt-1 text-sm text-ink/60">Checkout is at {checkoutTime}.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ReportDamage token={token} unitName={unitName} />
            <ConfirmationDialog
              trigger={<><LogOut className="h-4 w-4" aria-hidden />Check out</>}
              triggerVariant="clay"
              triggerSize="lg"
              triggerClassName="w-full"
              title="Check out of your stay?"
              description={`This ends your stay at ${unitName} and tells your host you have left. The cleaning team will start getting the unit ready right away, so please make sure you have everything and the door is locked. This can’t be undone.`}
              confirmLabel="Yes, check me out"
              cancelLabel="Not yet"
              successMessage="You’re checked out. Thank you for staying with us."
              onConfirm={async () => {
                const result = await guestCheckOutAction(token);
                if (result.error) throw new Error(result.error);
                setCheckedOut(true);
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function ReportDamage({ token, unitName }: { token: string; unitName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { area: useId(), description: useId(), title: useId() };

  const close = () => { if (!pending) dialog.current?.close(); };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "").trim();
    if (description.length < 10) {
      setError("Tell us a little more, at least a short sentence.");
      return;
    }
    setError(null);
    setPending(true);
    const result = await guestDamageReportAction(token, `${String(data.get("area") ?? "Something else")}: ${description}`);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    form.current?.reset();
    dialog.current?.close();
    toast.success("Report sent. Your host has been notified.");
  }

  return (
    <>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => { setError(null); dialog.current?.showModal(); }}>
        <Hammer className="h-4 w-4" aria-hidden />Report a damage
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={ids.title}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
        className="fixed left-1/2 top-1/2 m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55"
      >
        <form ref={form} onSubmit={submit} noValidate>
          <div className="flex items-start gap-4 p-6 pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-mist text-clay-deep"><Hammer className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <h2 id={ids.title} className="font-display text-xl text-pine">Report a damage</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink/65">Let us know about anything broken or damaged in {unitName}. Reporting early helps us fix it fast.</p>
            </div>
            <button type="button" onClick={close} disabled={pending} aria-label="Close" className="rounded-md p-1.5 text-ink/45 hover:bg-pine-mist hover:text-pine"><X className="h-4 w-4" aria-hidden /></button>
          </div>
          <div className="space-y-4 px-6 pb-6">
            <div>
              <Label htmlFor={ids.area}>Where is it?</Label>
              <Select id={ids.area} name="area" defaultValue={DAMAGE_AREAS[0]}>
                {DAMAGE_AREAS.map((area) => <option key={area}>{area}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor={ids.description}>What happened?</Label>
              <Textarea id={ids.description} name="description" rows={4} placeholder="For example: the shower head came loose and cracked." aria-invalid={!!error} aria-describedby={error ? `${ids.description}-error` : undefined} />
              {error ? <p id={`${ids.description}-error`} role="alert" className="mt-1.5 text-sm text-clay-deep">{error}</p> : null}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-pine/10 bg-paper/70 px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="clay" disabled={pending}>{pending ? "Sending…" : "Send report"}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

const QUICK_LINK_ICONS = { directions: MapPin, booking: CreditCard, wifi: Wifi, arrival: KeyRound, rules: ScrollText, area: Compass, phone: Phone } as const;

export type QuickLinkKey = keyof typeof QUICK_LINK_ICONS;

export function QuickLinks({ items }: { items: { key: QuickLinkKey; href: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Quick links" className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {items.map(({ key, href, label }) => {
        const Icon = QUICK_LINK_ICONS[key];
        return (
          <a key={key} href={href} className="flex flex-col items-center gap-1.5 rounded-xl border border-pine/12 bg-linen px-2 py-3.5 text-center text-xs font-medium text-pine shadow-[0_2px_8px_rgba(32,58,53,0.035)] transition hover:border-pine/30 hover:bg-pine-mist/50 sm:text-sm">
            <Icon className="h-5 w-5" aria-hidden />{label}
          </a>
        );
      })}
    </nav>
  );
}
