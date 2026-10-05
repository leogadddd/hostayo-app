"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  ChannelIcon,
  ChannelList,
} from "@/components/public/contact-channel-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import {
  CHANNEL_KINDS,
  CHANNEL_KIND_INFO,
  channelName,
  channelValueError,
  type ChannelKind,
  type ContactChannel,
} from "@/lib/contact-channels";
import { cn } from "@/lib/utils";
import { SettingsSaveBar } from "../settings-save-bar";
import { saveContactChannelsAction } from "../actions";

interface Draft {
  id: string | null;
  kind: ChannelKind;
  value: string;
  label: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  kind: "messenger",
  value: "",
  label: "",
};

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

export function ContactChannelsEditor({
  organizationName,
  initialChannels,
}: {
  organizationName: string;
  initialChannels: ContactChannel[];
}) {
  const [saved, setSaved] = useState(initialChannels);
  const [channels, setChannels] = useState(initialChannels);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const valueId = useId();
  const labelId = useId();

  const dirty = JSON.stringify(channels) !== JSON.stringify(saved);
  const enabledCount = channels.filter((channel) => channel.enabled).length;

  function move(index: number, delta: -1 | 1) {
    setChannels((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function commitDraft() {
    if (!draft) return;
    const error = channelValueError(draft.kind, draft.value);
    if (error) {
      setDraftError(error);
      return;
    }
    const clean = {
      kind: draft.kind,
      value: draft.value.trim(),
      label: draft.label.trim() || undefined,
    };
    setChannels((current) =>
      draft.id
        ? current.map((channel) =>
            channel.id === draft.id ? { ...channel, ...clean } : channel,
          )
        : [...current, { id: crypto.randomUUID(), enabled: true, ...clean }],
    );
    setDraft(null);
    setDraftError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await saveContactChannelsAction(channels);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSaved(channels);
      toast.success("Contact channels saved.");
    } catch {
      toast.error("Couldn’t save contact channels. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const info = draft ? CHANNEL_KIND_INFO[draft.kind] : null;

  return (
    <form
      onSubmit={save}
      className={cn("min-w-0 space-y-6", (dirty || pending) && "pb-24")}
    >
      <Card className="overflow-hidden bg-card">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-pine">Contact channels</h2>
            <p className="mt-1 max-w-xl text-sm text-ink/60">
              How guests reach {organizationName}. They appear on your public
              page, on every unit page and on each guest’s welcome page. Guests
              also pick one when they ask about dates.
            </p>
          </div>
          {!draft ? (
            <Button
              type="button"
              variant="clay"
              size="sm"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setDraftError(null);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add channel
            </Button>
          ) : null}
        </CardHeader>

        {draft ? (
          <div className="border-b border-pine/10 bg-paper/50 px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg text-pine">
                {draft.id ? "Edit channel" : "Add a channel"}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Cancel"
                className="rounded-md p-1.5 text-ink/45 hover:bg-pine-mist hover:text-pine"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <fieldset className="mt-3">
              <legend className="mb-2 text-sm font-medium text-ink">
                Type
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {CHANNEL_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={draft.kind === kind}
                    onClick={() => {
                      setDraft({ ...draft, kind });
                      setDraftError(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                      draft.kind === kind
                        ? "border-pine bg-pine-mist ring-2 ring-sage"
                        : "border-pine/15 bg-surface hover:border-pine/40",
                    )}
                  >
                    <ChannelIcon kind={kind} className="h-7 w-7 rounded-md" />
                    <span className="truncate text-pine">
                      {CHANNEL_KIND_INFO[kind].label}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={valueId}>{info?.hint ?? "Details"}</Label>
                <Input
                  id={valueId}
                  value={draft.value}
                  placeholder={info?.placeholder}
                  aria-invalid={!!draftError}
                  onChange={(event) => {
                    setDraft({ ...draft, value: event.target.value });
                    setDraftError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitDraft();
                    }
                  }}
                />
                {draftError ? (
                  <p role="alert" className="mt-1.5 text-sm text-clay-deep">
                    {draftError}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor={labelId}>
                  Name shown to guests{" "}
                  <span className="font-normal text-ink/45">(optional)</span>
                </Label>
                <Input
                  id={labelId}
                  value={draft.label}
                  placeholder={info?.label}
                  maxLength={40}
                  onChange={(event) =>
                    setDraft({ ...draft, label: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft(null)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={commitDraft}>
                {draft.id ? "Update channel" : "Add channel"}
              </Button>
            </div>
          </div>
        ) : null}

        {channels.length ? (
          <ul className="divide-y divide-pine/10">
            {channels.map((channel, index) => (
              <li
                key={channel.id}
                className="flex flex-wrap items-center gap-3 px-6 py-4"
              >
                <ChannelIcon kind={channel.kind} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium text-pine">
                    <span className="truncate">{channelName(channel)}</span>
                    {!channel.enabled ? <Badge>Hidden</Badge> : null}
                    {index === 0 && channel.enabled ? (
                      <Badge tone="sage">First choice</Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-ink/55">
                    {channel.value}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${channelName(channel)} up`}
                    className="rounded-md p-2 text-ink/55 hover:bg-pine-mist hover:text-pine disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === channels.length - 1}
                    aria-label={`Move ${channelName(channel)} down`}
                    className="rounded-md p-2 text-ink/55 hover:bg-pine-mist hover:text-pine disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({
                        id: channel.id,
                        kind: channel.kind,
                        value: channel.value,
                        label: channel.label ?? "",
                      });
                      setDraftError(null);
                    }}
                    aria-label={`Edit ${channelName(channel)}`}
                    className="rounded-md p-2 text-ink/55 hover:bg-pine-mist hover:text-pine"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setChannels((current) =>
                        current.filter((item) => item.id !== channel.id),
                      )
                    }
                    aria-label={`Remove ${channelName(channel)}`}
                    className="rounded-md p-2 text-ink/55 hover:bg-clay-mist hover:text-clay-deep"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="ml-2">
                    <Switch
                      checked={channel.enabled}
                      label={`Show ${channelName(channel)} to guests`}
                      onChange={(enabled) =>
                        setChannels((current) =>
                          current.map((item) =>
                            item.id === channel.id
                              ? { ...item, enabled }
                              : item,
                          ),
                        )
                      }
                    />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <CardBody>
            <EmptyState
              title="No contact channels yet"
              description="Add Messenger, WhatsApp, Instagram, a phone number or email so guests can reach you."
            />
          </CardBody>
        )}
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <h2 className="font-display text-xl text-pine">How guests see it</h2>
          <p className="mt-1 text-sm text-ink/60">
            {enabledCount} {enabledCount === 1 ? "channel" : "channels"} shown,
            in this order.
          </p>
        </CardHeader>
        <CardBody className="max-w-sm">
          <ChannelList channels={channels} />
        </CardBody>
      </Card>

      <SettingsSaveBar visible={dirty || pending} pending={pending} />
    </form>
  );
}
