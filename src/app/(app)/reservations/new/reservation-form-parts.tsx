"use client";

import { type ReactNode } from "react";
import {
  CalendarCheck,
  Check,
  WarningCircle as CircleAlert,
  CheckCircle as CircleCheck,
  Clock,
  CircleNotch as LoaderCircle,
  PencilSimple as Pencil,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type StayAvailability } from "./actions";
import { dayLabel, plural } from "../../calendar/availability/stay-display";
import { InfoTip } from "@/components/ui/info-tip";

export function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl text-pine lg:text-2xl">{title}</h2>
        <InfoTip>{description}</InfoTip>
      </div>
    </div>
  );
}

export function AvailabilityBanner({
  valid,
  unitChosen,
  result,
  nights,
  checkIn,
  checkOut,
  compact,
  current,
  changed,
}: {
  valid: boolean;
  /** Editing, with the reservation's own unit and dates: they're booked by it, not "free". */
  current?: boolean;
  /** Editing, with a different unit or dates than saved. */
  changed?: boolean;
  unitChosen: boolean;
  result: StayAvailability | null;
  nights: number | null;
  checkIn: string;
  checkOut: string;
  compact?: boolean;
}) {
  const range = `${dayLabel(checkIn)} → ${dayLabel(checkOut)} · ${plural(nights ?? 0, "night")}`;
  const card =
    !unitChosen || !valid
      ? ({
          tone: "blocked",
          icon: CircleAlert,
          title: "Dates needed",
          detail: "Pick a check-out after check-in.",
        } as const)
      : current
        ? ({
            tone: "current",
            icon: CalendarCheck,
            title: "Booked for this reservation",
            detail: `${range}. Change the unit or dates to check other availability.`,
          } as const)
        : !result
          ? ({
              tone: "pending",
              icon: LoaderCircle,
              title: "Checking availability…",
              detail: range,
            } as const)
          : result.status === "available"
            ? ({
                tone: "free",
                icon: CircleCheck,
                title: changed ? "New dates are free" : "Dates are free",
                detail: range,
              } as const)
            : result.status === "unavailable"
              ? ({
                  tone: "blocked",
                  icon: CircleAlert,
                  title: "Not free",
                  detail: result.reason,
                } as const)
              : ({
                  tone: "pending",
                  icon: CircleAlert,
                  title: "Couldn’t check",
                  detail: `${result.message} Saving still runs the full check.`,
                } as const);
  const Icon = card.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-l-4 p-4",
        compact && "mt-4",
        card.tone === "free" && "border-sage border-l-pine bg-sage/30",
        card.tone === "blocked" &&
          "border-clay/25 border-l-clay bg-clay-mist/60",
        card.tone === "current" &&
          "border-pine/15 border-l-pine/60 bg-pine-mist/60",
        card.tone === "pending" && "border-pine/10 border-l-ink/25 bg-linen",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          card.tone === "free" && "bg-pine text-white",
          card.tone === "blocked" && "bg-clay text-white",
          card.tone === "current" && "bg-pine/15 text-pine",
          card.tone === "pending" && "bg-ink/10 text-ink/60",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            card.icon === LoaderCircle && "animate-spin",
          )}
          aria-hidden
        />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
          Availability
        </p>
        <p
          className={cn(
            "font-medium",
            card.tone === "blocked"
              ? "text-clay-deep"
              : card.tone === "pending"
                ? "text-ink/70"
                : "text-pine-deep",
          )}
        >
          {card.title}
        </p>
        <p className="mt-0.5 break-words text-sm text-ink/65">{card.detail}</p>
      </div>
    </div>
  );
}

export function SaveNowButton({
  pending,
  savingLabel = "Saving…",
  blocked,
  onSave,
}: {
  pending: boolean;
  savingLabel?: string;
  blocked: boolean;
  onSave: () => void;
}) {
  return (
    <Button
      type="button"
      variant="clay"
      size="lg"
      onClick={onSave}
      disabled={pending}
      aria-disabled={blocked}
      className={cn("max-lg:h-12 max-lg:flex-1", blocked && "opacity-60")}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Check className="h-4 w-4" aria-hidden />
      )}
      {pending ? savingLabel : "Save changes"}
    </Button>
  );
}

export function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-pine/10 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink/45">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-pine/70 hover:bg-pine-mist hover:text-pine"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

export function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink/50">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-pine">{value}</dd>
    </div>
  );
}

export function SaveOption({
  active,
  onSelect,
  icon: Icon,
  title,
  description,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  icon: typeof Clock;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={active}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "cursor-pointer rounded-xl border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay",
        active
          ? "border-clay bg-clay-mist/40 ring-1 ring-clay"
          : "border-pine/15 hover:border-pine/35",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            active ? "bg-clay text-white" : "bg-sage/60 text-pine",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-pine">{title}</p>
          <p className="mt-0.5 text-sm text-ink/60">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
