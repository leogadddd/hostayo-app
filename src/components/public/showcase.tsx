import Link from "next/link";
import {
  activeChannels,
  channelHref,
  channelName,
  type ContactChannel,
} from "@/lib/contact-channels";
import { availabilityStrip } from "@/lib/public-availability";
import type { PublicBookedRange } from "@/lib/public-demo";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ChannelIcon } from "./contact-channel-list";

const OPEN_LABEL = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function shortDate(date: string) {
  return OPEN_LABEL.format(new Date(`${date}T00:00:00Z`));
}

/** The host's channels as pills over a photo; the first one is the filled one. */
export function HeroChannels({
  channels,
  className,
}: {
  channels: ContactChannel[];
  className?: string;
}) {
  const list = activeChannels(channels).slice(0, 4);
  if (!list.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {list.map((channel, index) => (
        <li key={channel.id}>
          <a
            href={channelHref(channel)}
            target={
              channel.kind === "phone" ||
              channel.kind === "sms" ||
              channel.kind === "email"
                ? undefined
                : "_blank"
            }
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-colors",
              index === 0
                ? "bg-white text-pine hover:bg-paper"
                : "border border-white/50 bg-white/15 text-white backdrop-blur hover:bg-white/25",
            )}
          >
            <ChannelIcon kind={channel.kind} className="h-7 w-7 rounded-full" />
            {channelName(channel)}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The next two weeks as squares: light for a free night, grey for a booked one. */
export function AvailabilityStrip({
  booked,
  today,
  days = 14,
}: {
  booked: PublicBookedRange[];
  today: string;
  days?: number;
}) {
  const strip = availabilityStrip(booked, today, days);
  const free = strip.filter((day) => day.free).length;
  return (
    <div>
      <div
        role="img"
        aria-label={`Free on ${free} of the next ${days} nights`}
        className="flex gap-1"
      >
        {strip.map((day) => (
          <span
            key={day.date}
            className={cn(
              "h-5 flex-1 rounded",
              day.free ? "bg-moss/45" : "bg-ink/15",
            )}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="mt-1 flex justify-between text-[11px] text-ink/50"
      >
        <span>Today</span>
        <span>{days} days</span>
      </div>
    </div>
  );
}

export function ShowcaseFooter({ location }: { location?: string }) {
  return (
    <footer className="border-t border-pine/10 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-ink/55 sm:flex-row sm:justify-between sm:px-6">
        <span>{location}</span>
        <span className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <a href={SITE_URL} className="py-1 hover:text-pine">
            Page made with Hostayo
          </a>
          <Link href="/terms" className="py-1 hover:text-pine">
            Terms
          </Link>
          <Link href="/privacy" className="py-1 hover:text-pine">
            Privacy
          </Link>
        </span>
      </div>
    </footer>
  );
}
