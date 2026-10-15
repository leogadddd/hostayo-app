"use client";

import { useState } from "react";
import { Plus, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

export interface AreaTip {
  title: string;
  detail: string;
}

const MAX_TIPS = 12;

/**
 * Nearby places and tips for guests, as title and detail rows. Submits as
 * paired `areaTipTitle` and `areaTipDetail` fields; blank rows are ignored.
 */
export function AreaTipsField({ defaultTips }: { defaultTips: AreaTip[] }) {
  // Keys keep a row's typed text in place when another row is removed.
  const [rows, setRows] = useState(() =>
    defaultTips.map((tip, index) => ({ ...tip, key: index })),
  );
  const [nextKey, setNextKey] = useState(defaultTips.length);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="rounded-lg bg-pine-mist px-3 py-3 text-sm text-ink/65">
          No tips yet. Add places guests will want to know about, like the
          nearest convenience store, a good restaurant or how to get around.
        </p>
      ) : null}
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="grid gap-2 rounded-xl border border-pine/12 bg-paper/50 p-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
        >
          <Input
            name="areaTipTitle"
            defaultValue={row.title}
            maxLength={80}
            placeholder="e.g. 7-Eleven"
            aria-label={`Tip ${index + 1} title`}
          />
          <Input
            name="areaTipDetail"
            defaultValue={row.detail}
            maxLength={300}
            placeholder="e.g. 2 minutes' walk, open 24 hours"
            aria-label={`Tip ${index + 1} detail`}
          />
          <button
            type="button"
            onClick={() =>
              setRows((current) => current.filter((r) => r.key !== row.key))
            }
            aria-label={`Remove tip ${index + 1}`}
            className="grid h-10 w-10 place-items-center justify-self-end rounded-lg text-ink/45 transition-colors hover:bg-clay-mist hover:text-clay-deep"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={rows.length >= MAX_TIPS}
        onClick={() => {
          setRows((current) => [
            ...current,
            { title: "", detail: "", key: nextKey },
          ]);
          setNextKey((key) => key + 1);
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-pine/30 px-3 text-sm font-medium text-pine transition-colors hover:border-pine/55 hover:bg-pine-mist/50 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add a tip
      </button>
    </div>
  );
}
