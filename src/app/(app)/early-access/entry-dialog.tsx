"use client";

import { useId } from "react";
import { Plus } from "@/components/ui/icons";
import {
  FormDialog,
  FormDialogButton,
  type FormResult,
} from "@/components/app/form-dialog";
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

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

/** Name and email, the only details needed to add someone. */
function BasicFields({ entry }: { entry?: EntryValues }) {
  const id = useId();
  return (
    <>
      <div>
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          autoComplete="off"
          defaultValue={entry?.name}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          maxLength={120}
          autoComplete="off"
          defaultValue={entry?.email}
        />
      </div>
    </>
  );
}

/** Adds an entry. It is accepted straight away: link made, welcome emailed. */
export function NewEntryDialog() {
  return (
    <FormDialogButton
      label="Add entry"
      icon={<Plus className="h-4 w-4" aria-hidden />}
      title="Add entry"
      info="The entry is accepted right away: a sign-up link is made and emailed to them with a welcome."
      submitLabel="Add and send invite"
      onSubmit={async (data): Promise<FormResult> => {
        const result = await createEntry({
          name: text(data, "name"),
          email: text(data, "email"),
        });
        return result.error
          ? { error: result.error }
          : { message: "Entry added. Welcome email sent." };
      }}
    >
      <BasicFields />
    </FormDialogButton>
  );
}

/** Edits every field of an entry. */
export function EditEntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: EntryValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit entry"
      submitLabel="Save changes"
      onSubmit={async (data): Promise<FormResult> => {
        const result = await updateEntry(entry.id, {
          name: text(data, "name"),
          email: text(data, "email"),
          social: text(data, "social"),
          units: text(data, "units"),
          source: text(data, "source"),
        });
        return result.error
          ? { error: result.error }
          : { message: "Entry updated." };
      }}
    >
      <BasicFields entry={entry} />
      <div>
        <Label htmlFor={`${id}-social`}>Facebook / Instagram</Label>
        <Input
          id={`${id}-social`}
          name="social"
          maxLength={200}
          autoComplete="off"
          defaultValue={entry.social}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-units`}>Hosts</Label>
        <Select id={`${id}-units`} name="units" defaultValue={entry.units}>
          <option value="">Not set</option>
          {UNIT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`${id}-source`}>Bookings from</Label>
        <Select id={`${id}-source`} name="source" defaultValue={entry.source}>
          <option value="">Not set</option>
          {SOURCE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </FormDialog>
  );
}
