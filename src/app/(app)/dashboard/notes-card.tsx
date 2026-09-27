"use client";

import { useEffect, useRef, useState } from "react";
import { Check, NotebookPen, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const MAX_LENGTH = 2000;

function read(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * A scratchpad for the day. It lives in this browser only (per organization
 * and person), never on the server, and saves itself a moment after typing.
 */
export function NotesCard({ organizationId, userId, className }: { organizationId: string; userId: string; className?: string }) {
  const key = `stayops:dashboard-notes:${organizationId}:${userId}`;
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "unavailable">("idle");
  const timer = useRef<number | null>(null);

  // Browser storage only exists on the client, so the saved note loads after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setText(read(key));
    setLoaded(true);
  }, [key]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const save = (value: string) => {
    try {
      if (value) window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
      setStatus("saved");
    } catch {
      setStatus("unavailable");
    }
  };

  const change = (value: string) => {
    setText(value);
    setStatus("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(value), 500);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-bark">
            <NotebookPen className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-xl text-pine">Notes</h2>
            <p className="text-xs text-ink/50">Only on this browser. Saves as you type.</p>
          </div>
        </div>
        {text ? (
          <button
            type="button"
            onClick={() => change("")}
            className="rounded-md p-1.5 text-ink/40 hover:bg-pine-mist hover:text-clay-deep"
            aria-label="Clear notes"
            title="Clear notes"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </CardHeader>
      <CardBody className="flex flex-1 flex-col">
        <label htmlFor="dashboard-notes" className="sr-only">Notes</label>
        <textarea
          id="dashboard-notes"
          value={text}
          onChange={(event) => change(event.target.value)}
          onBlur={() => {
            if (status === "saving") {
              if (timer.current) window.clearTimeout(timer.current);
              save(text);
            }
          }}
          disabled={!loaded}
          maxLength={MAX_LENGTH}
          placeholder={"Jot down reminders for today…\n\n• Ask 12B guest about late check-out\n• Buy extra towels"}
          className="min-h-48 w-full flex-1 resize-none rounded-lg border border-pine/10 bg-local bg-[position:0_0.5rem] bg-[repeating-linear-gradient(to_bottom,transparent,transparent_1.6rem,color-mix(in_oklab,var(--color-pine)_7%,transparent)_1.6rem,color-mix(in_oklab,var(--color-pine)_7%,transparent)_calc(1.6rem+1px))] bg-surface px-3 py-2 text-sm leading-[1.6rem] text-ink placeholder:text-ink/35 focus:border-pine focus:outline-none focus:ring-2 focus:ring-sage"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-ink/45" aria-live="polite">
          <span>
            {status === "saving" ? "Saving…" : status === "saved" ? <span className="inline-flex items-center gap-1 text-moss"><Check className="h-3 w-3" aria-hidden />Saved</span> : status === "unavailable" ? <span className="text-clay-deep">This browser isn’t letting StayOps save notes.</span> : null}
          </span>
          <span className="tabular-nums">{text.length}/{MAX_LENGTH}</span>
        </div>
      </CardBody>
    </Card>
  );
}
