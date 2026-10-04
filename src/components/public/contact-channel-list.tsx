import { Globe, Mail, MessageCircle, MessageSquare, Phone, Send } from "lucide-react";
import { activeChannels, channelHref, channelName, type ChannelKind, type ContactChannel } from "@/lib/contact-channels";
import { cn } from "@/lib/utils";

const BRAND_LOGO: Partial<Record<ChannelKind, string>> = {
  messenger: "/platforms/messenger.svg",
  facebook: "/platforms/facebook.svg",
  instagram: "/platforms/instagram.svg",
};

const LUCIDE_ICON = {
  whatsapp: MessageCircle, viber: Phone, telegram: Send, sms: MessageSquare, phone: Phone, email: Mail, website: Globe,
} as const;

const TILE_TONE: Partial<Record<ChannelKind, string>> = {
  whatsapp: "bg-[#25D366] text-white",
  viber: "bg-[#7360F2] text-white",
  telegram: "bg-[#229ED9] text-white",
};

export function ChannelIcon({ kind, className }: { kind: ChannelKind; className?: string }) {
  const logo = BRAND_LOGO[kind];
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" aria-hidden className={cn("h-9 w-9 shrink-0 rounded-lg", className)} />;
  }
  const Icon = LUCIDE_ICON[kind as keyof typeof LUCIDE_ICON];
  return (
    <span aria-hidden className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TILE_TONE[kind] ?? "bg-pine-mist text-pine", className)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/** The host's enabled channels as tappable rows. Used on every public page. */
export function ChannelList({ channels, className, compact = false }: { channels: ContactChannel[]; className?: string; compact?: boolean }) {
  const list = activeChannels(channels);
  if (!list.length) return <p className="text-sm text-ink/55">The host hasn’t added a way to reach them yet.</p>;
  return (
    <ul className={cn("space-y-2", className)}>
      {list.map((channel) => (
        <li key={channel.id}>
          <a
            href={channelHref(channel)}
            target={channel.kind === "phone" || channel.kind === "sms" || channel.kind === "email" ? undefined : "_blank"}
            rel="noopener noreferrer"
            className={cn("flex items-center gap-3 rounded-lg border border-pine/12 bg-surface px-3 text-sm transition-colors hover:border-pine/30 hover:bg-pine-mist/50", compact ? "py-2" : "py-2.5")}
          >
            <ChannelIcon kind={channel.kind} className={compact ? "h-7 w-7 rounded-md" : undefined} />
            <span className="min-w-0">
              <span className="block font-medium text-pine">{channelName(channel)}</span>
              {channel.label ? null : <span className="block truncate text-xs text-ink/50">{channel.value}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
