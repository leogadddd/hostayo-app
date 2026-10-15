"use client";

import { useState, type ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Input, Label } from "@/components/ui/input";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";

export function parse(value: string): number {
  const number = Number(value.replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/** Whole pesos; these are planning figures. */
export function pesos(value: number) {
  return formatPHP(Math.round(value) * 100);
}

export function NumberField({
  id,
  label,
  info,
  value,
  onChange,
  unit,
  placeholder = "0",
}: {
  id: string;
  label: string;
  info?: string;
  value: string;
  onChange: (value: string) => void;
  unit: "₱" | "%" | "nights" | "days" | "bookings" | "guests";
  placeholder?: string;
}) {
  const prefix = unit === "₱";
  return (
    <div>
      <Label htmlFor={id} info={info}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={prefix ? "pl-8" : "pr-16"}
        />
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-ink/45",
            prefix ? "left-3" : "right-3",
          )}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

export function Section({
  title,
  info,
  children,
}: {
  title: string;
  info?: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card">
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg text-pine">{title}</h2>
          {info ? <InfoTip>{info}</InfoTip> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </CardBody>
    </Card>
  );
}

export function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ink/65">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          strong && "font-semibold",
          tone === "good" && "text-pine",
          tone === "bad" && "text-clay-deep",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Inputs on the left, a sticky results card on the right. */
export function ToolLayout({
  inputs,
  results,
}: {
  inputs: ReactNode;
  results: ReactNode;
}) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0 space-y-5">{inputs}</div>
      <div className="min-w-0 xl:sticky xl:top-0">{results}</div>
    </div>
  );
}

/** The results card; `note` is the "estimate only" tooltip. */
export function ResultsCard({
  title = "Results",
  note = "An estimate for planning. Nothing here is saved or connected to your units.",
  children,
}: {
  title?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card">
      <CardBody className="space-y-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg text-pine">{title}</h2>
          <InfoTip>{note}</InfoTip>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

export function EmptyResults({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-ink/60">{children}</p>;
}

/**
 * Form state for a tool: values stay as typed strings (so a half-typed number
 * isn't rewritten) and `num` reads one as a non-negative number.
 */
export function useFields<K extends string>(initial: Record<K, string>) {
  const [draft, setDraft] = useState(initial);
  const set = (field: K) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const num = (field: K) => parse(draft[field]);
  return { draft, set, num };
}
