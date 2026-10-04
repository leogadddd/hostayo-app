/**
 * Ways guests can reach a host. The host manages the list in Settings → Contact
 * channels; the public host page, unit pages and the guest welcome page all
 * read the same list. Order is the display order.
 */

export const CHANNEL_KINDS = ["messenger", "facebook", "instagram", "whatsapp", "viber", "telegram", "sms", "phone", "email", "website"] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export interface ContactChannel {
  id: string;
  kind: ChannelKind;
  /** Handle, number, address or URL, as the host typed it. */
  value: string;
  /** Optional text shown instead of the default name, e.g. "Front desk". */
  label?: string;
  enabled: boolean;
}

interface KindInfo {
  label: string;
  placeholder: string;
  hint: string;
  /** True when the app can open the chat with the message already typed. */
  prefill: boolean;
}

export const CHANNEL_KIND_INFO: Record<ChannelKind, KindInfo> = {
  messenger: { label: "Messenger", placeholder: "casaalon", hint: "Your page or profile username.", prefill: false },
  facebook: { label: "Facebook page", placeholder: "facebook.com/casaalon", hint: "Your page link or username.", prefill: false },
  instagram: { label: "Instagram", placeholder: "@casaalon", hint: "Your handle.", prefill: false },
  whatsapp: { label: "WhatsApp", placeholder: "+63 917 123 4567", hint: "Number with country code.", prefill: true },
  viber: { label: "Viber", placeholder: "+63 917 123 4567", hint: "Number with country code.", prefill: false },
  telegram: { label: "Telegram", placeholder: "@casaalon", hint: "Your username.", prefill: false },
  sms: { label: "Text message", placeholder: "+63 917 123 4567", hint: "Mobile number.", prefill: true },
  phone: { label: "Call", placeholder: "+63 917 123 4567", hint: "Number guests can ring.", prefill: false },
  email: { label: "Email", placeholder: "hello@casaalon.com", hint: "Address guests can write to.", prefill: true },
  website: { label: "Website", placeholder: "casaalon.com", hint: "Your own booking or info page.", prefill: false },
};

const digits = (value: string) => value.replace(/[^\d]/g, "");
const handle = (value: string) => value.trim().replace(/^https?:\/\/[^/]+\//i, "").replace(/^@/, "").replace(/\/+$/, "");
const url = (value: string) => (/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);

export function channelName(channel: ContactChannel) {
  return channel.label?.trim() || CHANNEL_KIND_INFO[channel.kind].label;
}

/** Where the channel's button points. `message` is used where the app supports it. */
export function channelHref(channel: ContactChannel, message?: string, subject?: string) {
  const value = channel.value.trim();
  const text = message ? encodeURIComponent(message) : "";
  switch (channel.kind) {
    case "messenger": return `https://m.me/${handle(value)}`;
    case "facebook": return /facebook\.com|fb\.com/i.test(value) ? url(value) : `https://facebook.com/${handle(value)}`;
    case "instagram": return `https://instagram.com/${handle(value)}`;
    case "whatsapp": return `https://wa.me/${digits(value)}${text ? `?text=${text}` : ""}`;
    case "viber": return `viber://chat?number=%2B${digits(value)}`;
    case "telegram": return `https://t.me/${handle(value)}`;
    case "sms": return `sms:${value.replace(/\s/g, "")}${text ? `?body=${text}` : ""}`;
    case "phone": return `tel:${value.replace(/\s/g, "")}`;
    case "email": return `mailto:${value}${message ? `?subject=${encodeURIComponent(subject ?? "Question about your stay")}&body=${text}` : ""}`;
    case "website": return url(value);
  }
}

export function activeChannels(channels: ContactChannel[]) {
  return channels.filter((channel) => channel.enabled && channel.value.trim());
}

/** Checks one value when a host adds it. Returns a message, or null when fine. */
export function channelValueError(kind: ChannelKind, rawValue: string) {
  const value = rawValue.trim();
  if (!value) return "Enter the handle, number or address.";
  if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "That doesn’t look like an email address.";
  if (["whatsapp", "viber", "sms", "phone"].includes(kind) && digits(value).length < 7) return "Enter the full number, with country code.";
  if (["messenger", "instagram", "telegram"].includes(kind) && /\s/.test(handle(value))) return "Handles don’t contain spaces.";
  return null;
}

export const DEMO_CHANNELS: ContactChannel[] = [
  { id: "c1", kind: "messenger", value: "casaalonvillas", enabled: true },
  { id: "c2", kind: "whatsapp", value: "+63 917 123 4567", enabled: true },
  { id: "c3", kind: "instagram", value: "@casaalon", enabled: true },
  { id: "c4", kind: "phone", value: "+63 917 123 4567", label: "Call the front desk", enabled: true },
  { id: "c5", kind: "email", value: "hello@casaalon.example", enabled: true },
];
