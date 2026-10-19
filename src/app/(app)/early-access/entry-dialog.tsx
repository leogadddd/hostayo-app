"use client";

import { useId, useRef, useState, useTransition } from "react";
import { PencilSimple, Plus, X } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { Input, Label, Select } from "@/components/ui/input";
import { createEntry, updateEntry } from "./actions";

export interface EntryValues {
  id: string;
  name: string;
  email: string;
  social: string;
  units: string;
  source: string;
}

const UNIT_OPTIONS = [
  ["1", "1 unit"],
  ["2-5", "2–5 units"],
  ["6-20", "6–20 units"],
  ["20+", "More than 20"],
] as const;
const SOURCE_OPTIONS = [
  ["messenger", "Messenger / Facebook"],
  ["ota", "Airbnb / Booking.com"],
  ["both", "Both"],
  ["starting", "Just starting out"],
] as const;

/**
 * Adds an entry (name and email only) or, given `entry`, edits every field of
 * one. The same dialog serves both so the two never drift apart.
 */
export function EntryDialog({ entry }: { entry?: EntryValues }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const editing = Boolean(entry);

  const close = () => {
    if (!pending) dialog.current?.close();
  };

  const submit = (data: FormData) => {
    const value = (key: string) => String(data.get(key) ?? "");
    const input = {
      name: value("name"),
      email: value("email"),
      social: value("social"),
      units: value("units"),
      source: value("source"),
    };
    startTransition(async () => {
      const result = entry
        ? await updateEntry(entry.id, input)
        : await createEntry({ name: input.name, email: input.email });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(
        editing ? "Entry updated." : "Entry added. Welcome email sent.",
      );
      dialog.current?.close();
    });
  };

  return (
    <>
      {editing ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Edit ${entry?.name}`}
          title="Edit"
          onClick={() => {
            setError(null);
            dialog.current?.showModal();
          }}
        >
          <PencilSimple className="h-4 w-4" aria-hidden />
        </Button>
      ) : (
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => {
            setError(null);
            form.current?.reset();
            dialog.current?.showModal();
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add entry
        </Button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed left-1/2 top-1/2 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55"
      >
        <form ref={form} action={submit}>
          <div className="flex items-start justify-between gap-4 p-6 pb-2">
            <div className="flex items-center gap-2">
              <h2 id={titleId} className="font-display text-xl text-pine">
                {editing ? "Edit entry" : "Add entry"}
              </h2>
              {editing ? null : (
                <InfoTip>
                  The entry is accepted right away: a sign-up link is made and
                  emailed to them with a welcome.
                </InfoTip>
              )}
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
          <div className="space-y-4 px-6 py-4">
            <div>
              <Label htmlFor={`${titleId}-name`}>Name</Label>
              <Input
                id={`${titleId}-name`}
                name="name"
                required
                maxLength={80}
                autoComplete="off"
                defaultValue={entry?.name}
              />
            </div>
            <div>
              <Label htmlFor={`${titleId}-email`}>Email</Label>
              <Input
                id={`${titleId}-email`}
                name="email"
                type="email"
                required
                maxLength={120}
                autoComplete="off"
                defaultValue={entry?.email}
              />
            </div>
            {entry ? (
              <>
                <div>
                  <Label htmlFor={`${titleId}-social`}>
                    Facebook / Instagram
                  </Label>
                  <Input
                    id={`${titleId}-social`}
                    name="social"
                    maxLength={200}
                    autoComplete="off"
                    defaultValue={entry.social}
                  />
                </div>
                <div>
                  <Label htmlFor={`${titleId}-units`}>Hosts</Label>
                  <Select
                    id={`${titleId}-units`}
                    name="units"
                    defaultValue={entry.units}
                  >
                    <option value="">Not set</option>
                    {UNIT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`${titleId}-source`}>Bookings from</Label>
                  <Select
                    id={`${titleId}-source`}
                    name="source"
                    defaultValue={entry.source}
                  >
                    <option value="">Not set</option>
                    {SOURCE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ) : null}
            {error ? (
              <p
                className="rounded-lg bg-clay-mist px-3 py-2 text-sm text-clay-deep"
                role="alert"
              >
                {error}
              </p>
            ) : null}
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
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add and send invite"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
