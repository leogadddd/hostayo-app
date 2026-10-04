"use client";

import { useRef, useState } from "react";
import { Check, Copy, MessageCircleQuestion, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { activeChannels, channelHref, channelName, CHANNEL_KIND_INFO, type ContactChannel } from "@/lib/contact-channels";
import type { PublicBookedRange } from "@/lib/public-demo";
import { AvailabilityCalendar } from "./availability-calendar";
import { ChannelIcon } from "./contact-channel-list";

const DATE = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmt = (date: string) => DATE.format(new Date(`${date}T00:00:00Z`));
const nightsBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

function defaultMessage(hostName: string, unitName: string, range: { checkIn: string; checkOut: string }) {
  const nights = nightsBetween(range.checkIn, range.checkOut);
  return `Hi ${hostName}! I’d like to ask if ${unitName} is available from ${fmt(range.checkIn)} to ${fmt(range.checkOut)} (${nights} ${nights === 1 ? "night" : "nights"}). How many guests: \nThank you!`;
}

/** Calendar plus the "ask about these dates" dialog, so guests can pick how to reach the host. */
export function UnitAvailability({ today, booked, nightlyRateCents, dayRates, cleaningFeeCents, channels, hostName, unitName, initialRange }: {
  today: string;
  booked: PublicBookedRange[];
  nightlyRateCents: number;
  dayRates: Record<string, number>;
  cleaningFeeCents: number | null;
  channels: ContactChannel[];
  hostName: string;
  unitName: string;
  initialRange?: { checkIn: string; checkOut: string } | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [range, setRange] = useState<{ checkIn: string; checkOut: string } | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const list = activeChannels(channels);

  function open(next: { checkIn: string; checkOut: string }) {
    setRange(next);
    setMessage(defaultMessage(hostName, unitName, next));
    setCopied(false);
    dialog.current?.showModal();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      toast.error("Couldn’t copy. Select the message and copy it instead.");
      return false;
    }
  }

  async function openChannel(channel: ContactChannel) {
    const prefill = CHANNEL_KIND_INFO[channel.kind].prefill;
    if (!prefill) await copy();
    window.open(channelHref(channel, message, `Availability: ${unitName}`), channel.kind === "phone" ? "_self" : "_blank", "noopener,noreferrer");
    if (!prefill) toast.success("Message copied. Paste it into the chat.");
  }

  return (
    <>
      <AvailabilityCalendar
        today={today}
        booked={booked}
        nightlyRateCents={nightlyRateCents}
        dayRates={dayRates}
        cleaningFeeCents={cleaningFeeCents}
        onRequest={open}
        initialRange={initialRange}
      />
      <dialog
        ref={dialog}
        aria-labelledby="inquiry-title"
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        className="fixed left-1/2 top-1/2 m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55"
      >
        <div className="flex items-start gap-4 p-6 pb-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-pine"><MessageCircleQuestion className="h-5 w-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <h2 id="inquiry-title" className="font-display text-xl text-pine">Ask {hostName} about these dates</h2>
            {range ? <p className="mt-1 text-sm text-ink/65">{unitName} · {fmt(range.checkIn)} to {fmt(range.checkOut)}</p> : null}
          </div>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="rounded-md p-1.5 text-ink/45 hover:bg-pine-mist hover:text-pine"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        <div className="space-y-5 px-6 pb-6">
          <div>
            <Label htmlFor="inquiry-message">Your message</Label>
            <Textarea id="inquiry-message" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-ink/50">Edit it however you like. Add how many guests are coming.</p>
              <Button type="button" variant="outline" size="sm" onClick={copy}>
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">Send it through</p>
            {list.length ? (
              <ul className="mt-2 space-y-2">
                {list.map((channel) => {
                  const prefill = CHANNEL_KIND_INFO[channel.kind].prefill;
                  return (
                    <li key={channel.id}>
                      <button type="button" onClick={() => openChannel(channel)} className="flex w-full items-center gap-3 rounded-lg border border-pine/15 bg-surface px-3 py-2.5 text-left transition-colors hover:border-pine/40 hover:bg-pine-mist/50">
                        <ChannelIcon kind={channel.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-pine">{channelName(channel)}</span>
                          <span className="block text-xs text-ink/55">{channel.kind === "phone" ? "Call and mention your dates" : prefill ? "Opens with your message ready" : "Copies your message, then opens the chat"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 rounded-lg bg-pine-mist px-3 py-3 text-sm text-ink/65">This host hasn’t set up a way to be reached yet. Copy your message and send it to them directly.</p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
