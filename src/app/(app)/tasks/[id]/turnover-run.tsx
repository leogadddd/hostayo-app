"use client";

import { useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, CalendarClock, Check, CheckCircle2, Circle, Flame, Hammer, Info, ListChecks, NotebookPen,
  Play, ReceiptText, RotateCcw, SkipForward, Sparkles, Star, Timer, Trophy, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPHP } from "@/lib/money";
import { fireCelebration, fireConfetti } from "@/lib/confetti";
import { buttonClassName } from "@/components/ui/button";
import { markTaskReadyAction, setTaskItemCompletedAction } from "../actions";

export interface RunItem {
  id: string;
  label: string;
  required: boolean;
  completedAt: string | null;
}

interface RunProps {
  task: {
    id: string;
    status: "open" | "ready";
    notes: string | null;
    reservationId: string | null;
    markedReadyAt: string | null;
    readyOverrideReason: string | null;
  };
  unitName: string;
  propertyName: string;
  guestName: string | null;
  items: RunItem[];
  openDamage: { id: string; description: string; estimatedAmountCents: number | null }[];
  canMarkReady: boolean;
  nextCheckIn: { guestName: string | null; checkInDate: string } | null;
  permissions: { work: boolean; reportDamage: boolean; resolveDamage: boolean; viewReservation: boolean };
}

const REQUIRED_XP = 100;
const BONUS_XP = 50;
/** Finishing the next item within this long of the last one keeps the streak. */
const STREAK_WINDOW_MS = 5 * 60_000;

const CHECK_IN_LABEL = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const READY_LABEL = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

// When this device started the run. The checklist itself lives on the
// server; only the stopwatch start is local.
const startListeners = new Set<() => void>();
const startKey = (taskId: string) => `stayops:turnover-start:${taskId}`;
function readStart(taskId: string): string | null {
  try {
    return window.localStorage.getItem(startKey(taskId));
  } catch {
    return null;
  }
}
function writeStart(taskId: string, value: number) {
  try {
    window.localStorage.setItem(startKey(taskId), String(value));
  } catch {
    // Private mode: the run still works, just without a remembered start.
  }
  memoryStarts.set(taskId, String(value));
  startListeners.forEach((listener) => listener());
}
const memoryStarts = new Map<string, string>();
function subscribeStart(listener: () => void) {
  startListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    startListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Time each item took: from the previous completion (or the start) to its own. */
function itemDurations(items: RunItem[], startedAt: number | null) {
  const done = items
    .filter((item) => item.completedAt)
    .map((item) => ({ id: item.id, at: Date.parse(item.completedAt!) }))
    .sort((a, b) => a.at - b.at);
  const durations = new Map<string, number | null>();
  let previous: number | null = null;
  for (const { id, at } of done) {
    const from: number | null = startedAt !== null && startedAt <= at ? Math.max(previous ?? startedAt, startedAt) : previous;
    durations.set(id, from !== null ? at - from : null);
    previous = at;
  }
  return { durations, firstAt: done[0]?.at ?? null, lastAt: done.at(-1)?.at ?? null };
}

/** How many items in a row were finished within the streak window, ending with the latest; 0 once it lapses. */
function currentStreak(items: RunItem[], now: number) {
  const times = items.filter((item) => item.completedAt).map((item) => Date.parse(item.completedAt!)).sort((a, b) => a - b);
  if (times.length === 0 || now - times.at(-1)! > STREAK_WINDOW_MS) return 0;
  let streak = 1;
  for (let index = times.length - 1; index > 0; index--) {
    if (times[index]! - times[index - 1]! <= STREAK_WINDOW_MS) streak++;
    else break;
  }
  return streak;
}

export function TurnoverRun(props: RunProps) {
  const { task, unitName, propertyName, permissions } = props;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setOptimistic] = useOptimistic(props.items, (state, change: { id: string; completedAt: string | null }) =>
    state.map((item) => (item.id === change.id ? { ...item, completedAt: change.completedAt } : item)),
  );
  const storedStart = useSyncExternalStore(
    subscribeStart,
    () => memoryStarts.get(task.id) ?? readStart(task.id),
    () => "ssr",
  );
  const hydrated = storedStart !== "ssr";
  const startedAt = hydrated && storedStart ? Number(storedStart) : null;

  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ key: number; label: string; ms: number | null; xp: number } | null>(null);
  const [marking, setMarking] = useState(false);
  /** Phone drawers; desktop shows both panels beside the stage. */
  const [sheet, setSheet] = useState<"log" | "details" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const locked = useRef(false);
  const doneButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const doneCount = items.filter((item) => item.completedAt).length;
  const requiredLeft = items.filter((item) => item.required && !item.completedAt).length;
  const remaining = items.filter((item) => !item.completedAt && !skipped.has(item.id));
  const finished = requiredLeft === 0 && remaining.length === 0;
  const xp = items.reduce((total, item) => total + (item.completedAt ? (item.required ? REQUIRED_XP : BONUS_XP) : 0), 0);
  const maxXp = items.reduce((total, item) => total + (item.required ? REQUIRED_XP : BONUS_XP), 0);
  const streak = currentStreak(items, now);
  const { durations, firstAt, lastAt } = itemDurations(items, startedAt);
  const current = remaining.find((item) => item.id === selectedId) ?? remaining[0] ?? null;
  const upNext = remaining.find((item) => item !== current) ?? null;
  const currentIndex = current ? items.indexOf(current) : -1;

  const lastTick = Math.max(startedAt ?? 0, ...items.filter((item) => item.completedAt).map((item) => Date.parse(item.completedAt!)));
  const runStart = startedAt ?? firstAt;
  const totalMs = runStart !== null ? (finished || task.status === "ready" ? (lastAt ?? now) : now) - runStart : null;

  const phase: "complete" | "view" | "intro" | "finish" | "play" =
    task.status === "ready" ? "complete"
    : !permissions.work ? "view"
    : hydrated && startedAt === null ? "intro"
    : finished ? "finish"
    : "play";

  const setCompleted = (item: RunItem, completed: boolean) => {
    const completedAt = completed ? new Date().toISOString() : null;
    startTransition(async () => {
      setOptimistic({ id: item.id, completedAt });
      const result = await setTaskItemCompletedAction(task.id, item.id, completed);
      if (result.error) toast.error("Checklist wasn’t updated", { description: result.error });
    });
  };

  const start = () => {
    writeStart(task.id, Date.now());
    fireConfetti({ particleCount: 40, spread: 50, origin: { x: 0.5, y: 0.7 } });
  };

  const complete = (item: RunItem) => {
    if (locked.current) return;
    locked.current = true;
    window.setTimeout(() => { locked.current = false; }, 450);

    const at = Date.now();
    const from = Math.max(lastTick, 0) || null;
    const gained = item.required ? REQUIRED_XP : BONUS_XP;
    setFlash({ key: at, label: item.label, ms: from ? at - from : null, xp: gained });
    setSelectedId(null);
    setCompleted(item, true);

    const willFinish = items.every((other) => other.id === item.id || other.completedAt || (!other.required && skipped.has(other.id)));
    if (willFinish) {
      window.setTimeout(fireCelebration, 150);
    } else {
      const rect = doneButton.current?.getBoundingClientRect();
      fireConfetti({
        particleCount: 60,
        origin: rect ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: rect.top / window.innerHeight } : undefined,
      });
    }
  };

  const skip = (item: RunItem) => {
    const next = new Set(skipped).add(item.id);
    setSkipped(next);
    setSelectedId(null);
    if (requiredLeft === 0 && items.every((other) => other.completedAt || next.has(other.id))) {
      fireCelebration();
    }
  };

  const finishNow = () => {
    setSkipped(new Set(items.filter((item) => !item.completedAt).map((item) => item.id)));
    fireCelebration();
  };

  const markReady = async () => {
    setMarking(true);
    const result = await markTaskReadyAction(task.id, {}, new FormData());
    setMarking(false);
    if (result.error) {
      toast.error("Unit wasn’t marked ready", { description: result.error });
      return;
    }
    fireCelebration();
    toast.success("Unit marked ready.");
    router.refresh();
  };

  // Desktop: Enter completes the current item, S skips a bonus one.
  useEffect(() => {
    if (phase !== "play" || !current) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable]") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        complete(current);
      } else if ((event.key === "s" || event.key === "S") && !current.required) {
        skip(current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const percent = items.length ? (doneCount / items.length) * 100 : 100;

  const questLog = (
    <>
    {items.length === 0 ? <p className="px-3 pb-3 text-sm text-ink/60">This checklist has no items.</p> : null}
    <ul className="space-y-0.5">
      {items.map((item, index) => {
        const done = Boolean(item.completedAt);
        const active = phase === "play" && item.id === current?.id;
        const duration = durations.get(item.id);
        return (
          <li key={item.id} className={cn("group flex items-center gap-2 rounded-xl px-2 py-1.5", active && "bg-clay-mist/70")}>
            <button
              type="button"
              disabled={!permissions.work || done || phase !== "play"}
              onClick={() => { setSelectedId(item.id); setSheet(null); }}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left text-sm disabled:cursor-default"
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-moss" aria-hidden />
              ) : active ? (
                <Play className="h-5 w-5 shrink-0 fill-clay text-clay" aria-hidden />
              ) : (
                <Circle className={cn("h-5 w-5 shrink-0", item.required ? "text-clay/60" : "text-pine/25")} aria-hidden />
              )}
              <span className="sr-only">{index + 1}.</span>
              <span className={cn("min-w-0 flex-1 truncate", done ? "text-ink/50 line-through" : skipped.has(item.id) ? "text-ink/40" : "text-pine")}>
                {item.label}
                {!item.required ? <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-sand-deep">bonus</span> : null}
              </span>
            </button>
            {done ? (
              <span className="whitespace-nowrap text-xs tabular-nums text-ink/45">{duration != null ? formatDuration(duration) : "✓"}</span>
            ) : null}
            {done && permissions.work ? (
              <button type="button" onClick={() => setCompleted(item, false)} aria-label={`Reopen ${item.label}`} title="Reopen" className="rounded-md p-1 text-ink/35 opacity-100 hover:bg-pine-mist hover:text-pine lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
    </>
  );

  const details = (
    <>
  {props.nextCheckIn && task.status === "open" ? (
    <div className="rounded-2xl border border-pine/10 bg-sage/40 p-4 text-sm text-pine">
      <p className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" aria-hidden />Beat the clock</p>
      <p className="mt-1 text-pine/80">
        {props.nextCheckIn.guestName ? `${props.nextCheckIn.guestName} checks in` : "Next check-in"}{" "}
        {CHECK_IN_LABEL.format(new Date(`${props.nextCheckIn.checkInDate}T00:00:00Z`))}.
      </p>
    </div>
  ) : null}

  <div className="rounded-2xl border border-pine/10 bg-surface p-4">
    <div className="grid grid-cols-2 gap-3">
      <MiniStat label="XP" value={`${xp}`} sub={`of ${maxXp}`} />
      <MiniStat label="Required left" value={`${requiredLeft}`} sub={requiredLeft === 0 ? "all clear" : "to go"} />
    </div>
  </div>

  <div className="rounded-2xl border border-pine/10 bg-surface p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-pine"><AlertTriangle className="h-4 w-4 text-clay" aria-hidden />Damage</h2>
      {permissions.reportDamage ? <Link href={`/tasks/${task.id}/damage/new`} className="text-sm font-medium text-clay hover:underline">Report</Link> : null}
    </div>
    {props.openDamage.length === 0 ? (
      <p className="mt-2 text-sm text-ink/55">No open damage.{permissions.reportDamage ? " Spot something broken? Report it." : ""}</p>
    ) : (
      <ul className="mt-2 space-y-2">
        {props.openDamage.map((report) => (
          <li key={report.id} className="rounded-xl bg-clay-mist/60 p-3 text-sm">
            <p className="line-clamp-3 whitespace-pre-line text-clay-deep">{report.description}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-ink/55">{report.estimatedAmountCents !== null ? `Est. ${formatPHP(report.estimatedAmountCents)}` : "No estimate"}</span>
              {permissions.resolveDamage && task.status === "open" ? <Link href={`/tasks/${task.id}/damage/${report.id}/resolve`} className="font-medium text-clay hover:underline">Resolve</Link> : null}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>

  <div className="rounded-2xl border border-pine/10 bg-surface p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-pine"><NotebookPen className="h-4 w-4" aria-hidden />Notes</h2>
      {permissions.work ? <Link href={`/tasks/${task.id}/edit`} className="text-sm font-medium text-clay hover:underline">Edit</Link> : null}
    </div>
    <p className="mt-2 whitespace-pre-line text-sm text-ink/65">{task.notes || "No turnover notes yet."}</p>
  </div>

  {task.reservationId && permissions.viewReservation ? (
    <Link href={`/reservations/${task.reservationId}`} className="flex items-center gap-2 px-1 text-sm font-medium text-pine underline-offset-4 hover:underline">
      <ReceiptText className="h-4 w-4" aria-hidden />
      Checked-out reservation{props.guestName ? ` · ${props.guestName}` : ""}
    </Link>
  ) : null}
    </>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-paper text-ink" role="region" aria-label={`Turnover for ${unitName}`}>
      {/* Phone top bar: quest log on the left, exit on the right, like a game HUD. */}
      <header className="flex h-16 shrink-0 items-center gap-2 bg-chrome px-3 lg:hidden">
        <button type="button" onClick={() => setSheet("log")} aria-label={`Open quest log, ${doneCount} of ${items.length} done`} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-pine/15 bg-surface px-3 text-sm font-semibold text-pine shadow-sm active:scale-95">
          <ListChecks className="h-5 w-5" aria-hidden />
          <span className="tabular-nums">{doneCount}/{items.length}</span>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-lg leading-tight text-pine">{unitName}</p>
          <p className="truncate text-[11px] text-ink/55">{propertyName}</p>
        </div>
        <button type="button" onClick={() => setSheet("details")} aria-label="Turnover details" className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-pine/15 bg-surface text-pine shadow-sm active:scale-95">
          <Info className="h-5 w-5" aria-hidden />
          {props.openDamage.length > 0 ? <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-clay ring-2 ring-surface" aria-hidden /> : null}
        </button>
        <Link href="/tasks" aria-label="Exit to tasks" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-pine/15 bg-surface text-pine shadow-sm active:scale-95">
          <X className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      {/* Desktop top bar */}
      <header className="hidden h-16 shrink-0 items-center gap-3 border-b border-pine/10 bg-chrome px-3 sm:px-6 lg:flex">
        <Link href="/tasks" className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-pine hover:bg-pine-mist/70" aria-label="Back to tasks">
          <ArrowLeft className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">Tasks</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight text-pine sm:text-xl">{unitName}</p>
          <p className="truncate text-xs text-ink/55">{propertyName} · Turnover</p>
        </div>
        {hydrated && totalMs !== null && phase !== "intro" ? (
          <StatChip icon={<Timer className="h-4 w-4" aria-hidden />} label="Time" value={formatDuration(totalMs)} />
        ) : null}
        <StatChip icon={<Star className="h-4 w-4" aria-hidden />} label="XP" value={`${xp}`} className="hidden sm:flex" />
        {streak >= 2 && phase === "play" ? (
          <StatChip icon={<Flame className="h-4 w-4" aria-hidden />} label="Streak" value={`×${streak}`} className="hidden border-clay/30 bg-clay-mist text-clay-deep md:flex" />
        ) : null}
      </header>

      {/* Progress */}
      <div className="shrink-0 bg-chrome px-3 pb-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-2.5 flex-1 gap-1" role="progressbar" aria-label="Turnover progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneCount}>
            {items.length === 0 ? <div className="h-full flex-1 rounded-full bg-moss" /> : items.map((item) => (
              <div key={item.id} className={cn(
                "h-full flex-1 rounded-full transition-colors duration-500",
                item.completedAt ? "bg-moss" : item.id === current?.id && phase === "play" ? "animate-pulse bg-clay/60" : skipped.has(item.id) ? "bg-pine/20" : "bg-pine/10",
              )} />
            ))}
          </div>
          <span className="whitespace-nowrap text-xs font-medium tabular-nums text-pine/70">{Math.round(percent)}%</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 lg:hidden">
          {hydrated && totalMs !== null && phase !== "intro" ? (
            <StatChip icon={<Timer className="h-4 w-4" aria-hidden />} label="Time" value={formatDuration(totalMs)} />
          ) : null}
          <StatChip icon={<Star className="h-4 w-4" aria-hidden />} label="XP" value={`${xp}`} />
          {streak >= 2 && phase === "play" ? (
            <StatChip icon={<Flame className="h-4 w-4" aria-hidden />} label="Streak" value={`×${streak}`} className="border-clay/30 bg-clay-mist text-clay-deep" />
          ) : null}
        </div>
      </div>

      <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:grid lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)_18rem] lg:gap-8 lg:py-10">
          {/* Stage */}
          <section className="flex flex-1 flex-col lg:col-start-2 lg:row-start-1 lg:block" aria-live="polite">
            {!hydrated ? (
              <div className="min-h-80 flex-1 animate-pulse rounded-3xl bg-pine/5 lg:h-80 lg:flex-none" />
            ) : phase === "intro" ? (
              <Intro {...props} doneCount={doneCount} maxXp={maxXp} onStart={start} />
            ) : phase === "play" && current ? (
              <div className="flex flex-1 flex-col lg:block">
                <div key={current.id} className="animate-rise relative overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-[0_24px_60px_-20px_rgba(22,41,37,0.55)] sm:p-10 flex flex-1 flex-col lg:min-h-[28rem]">
                  <Sparkles className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/[0.06]" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                    <span className="rounded-full bg-white/15 px-3 py-1">Quest {currentIndex + 1} of {items.length}</span>
                    {current.required ? (
                      <span className="rounded-full bg-clay px-3 py-1">Required</span>
                    ) : (
                      <span className="rounded-full bg-sand-deep px-3 py-1 text-pine-deep">Bonus</span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 text-white/70"><Zap className="h-3.5 w-3.5" aria-hidden />+{current.required ? REQUIRED_XP : BONUS_XP} XP</span>
                  </div>
                  <h1 className="mt-8 font-display text-4xl leading-tight sm:text-5xl">{current.label}</h1>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/65 tabular-nums">
                    <Timer className="h-4 w-4" aria-hidden />
                    {lastTick > 0 ? `On this one for ${formatDuration(now - lastTick)}` : "Timer starts now"}
                  </p>
                  <div className="mt-auto flex flex-col gap-3 pt-10 sm:flex-row">
                    <button
                      ref={doneButton}
                      type="button"
                      onClick={() => complete(current)}
                      className="inline-flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-clay text-lg font-semibold text-white shadow-lg transition hover:bg-clay-strong active:scale-[0.98]"
                    >
                      <Check className="h-6 w-6" aria-hidden />
                      Done
                      <kbd className="ml-1 hidden rounded border border-white/30 px-1.5 py-0.5 font-sans text-[11px] font-medium text-white/70 lg:inline">Enter</kbd>
                    </button>
                    {!current.required ? (
                      <button type="button" onClick={() => skip(current)} className="inline-flex h-16 items-center justify-center gap-2 rounded-2xl border border-white/25 px-6 font-medium text-white/85 transition hover:bg-white/10">
                        <SkipForward className="h-5 w-5" aria-hidden />
                        Skip bonus
                      </button>
                    ) : null}
                  </div>
                </div>

                {flash ? (
                  <p key={flash.key} className="animate-rise mt-4 flex items-center justify-center gap-2 text-center text-sm font-medium text-pine" role="status">
                    <CheckCircle2 className="h-4 w-4 text-moss" aria-hidden />
                    Nice! “{flash.label}” {flash.ms !== null ? `in ${formatDuration(flash.ms)}` : "done"} · +{flash.xp} XP
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="min-w-0 truncate text-ink/60">{upNext ? <>Up next: <span className="font-medium text-pine">{upNext.label}</span></> : "Last one — finish strong!"}</p>
                  {requiredLeft === 0 && remaining.length > 0 ? (
                    <button type="button" onClick={finishNow} className={buttonClassName("outline", "sm")}>Finish without bonus</button>
                  ) : null}
                </div>
              </div>
            ) : phase === "finish" || phase === "play" ? (
              <Finish
                {...props}
                items={items}
                durations={durations}
                totalMs={totalMs}
                xp={xp}
                maxXp={maxXp}
                marking={marking}
                onMarkReady={markReady}
                onReview={remaining.length === 0 && doneCount < items.length ? () => setSkipped(new Set()) : undefined}
              />
            ) : phase === "complete" ? (
              <Complete {...props} items={items} durations={durations} totalMs={totalMs} xp={xp} maxXp={maxXp} />
            ) : (
              <div className="rounded-3xl border border-pine/10 bg-surface p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-pine/55">View only</p>
                <h1 className="mt-2 font-display text-3xl text-pine">{doneCount} of {items.length} done</h1>
                <p className="mt-2 text-sm text-ink/65">Your role can view this turnover but not tick items off.</p>
              </div>
            )}
          </section>

          {/* Quest log */}
          <aside className="hidden lg:col-start-1 lg:row-start-1 lg:block" aria-label="Checklist">
            <div className="rounded-2xl border border-pine/10 bg-surface p-2 lg:sticky lg:top-0">
              <div className="flex items-center justify-between px-3 pb-2 pt-3">
                <h2 className="font-display text-lg text-pine">Quest log</h2>
                <span className="text-xs tabular-nums text-ink/55">{doneCount}/{items.length}</span>
              </div>
              {questLog}
            </div>
          </aside>

          {/* Side info */}
          <aside className="hidden space-y-4 lg:col-start-3 lg:row-start-1 lg:block" aria-label="Turnover details">
            {details}
          </aside>
        </div>
      </div>

      <Sheet side="left" title={`Quest log · ${doneCount}/${items.length}`} open={sheet === "log"} onClose={() => setSheet(null)}>
        <div className="rounded-2xl border border-pine/10 bg-surface p-2">{questLog}</div>
      </Sheet>
      <Sheet side="right" title="Turnover details" open={sheet === "details"} onClose={() => setSheet(null)}>
        <div className="space-y-4">{details}</div>
      </Sheet>
    </div>
  );
}

/** A phone drawer over the run view: the quest log slides in from the left, details from the right. */
function Sheet({ side, title, open, onClose, children }: { side: "left" | "right"; title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className={cn(
        "fixed inset-y-0 m-0 h-dvh max-h-none w-[22rem] max-w-[88vw] border-0 bg-paper p-0 text-ink shadow-2xl backdrop:bg-scrim/55 lg:hidden",
        side === "left" ? "left-0 right-auto animate-sheet-left rounded-r-3xl" : "left-auto right-0 animate-sheet-right rounded-l-3xl",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-pine/10 px-4">
          <h2 className="font-display text-xl text-pine">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-pine hover:bg-pine-mist">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </dialog>
  );
}

function StatChip({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex h-9 items-center gap-1.5 rounded-full border border-pine/15 bg-surface px-3 text-sm font-semibold tabular-nums text-pine", className)} title={label}>
      {icon}
      <span className="sr-only">{label}:</span>
      {value}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-pine/55">{label}</p>
      <p className="mt-0.5 font-display text-2xl tabular-nums text-pine">{value}</p>
      {sub ? <p className="text-xs text-ink/50">{sub}</p> : null}
    </div>
  );
}

function Intro({ items, unitName, nextCheckIn, doneCount, maxXp, onStart }: RunProps & { doneCount: number; maxXp: number; onStart: () => void }) {
  const required = items.filter((item) => item.required).length;
  return (
    <div className="animate-rise flex flex-1 flex-col justify-center rounded-3xl bg-primary p-8 text-center text-white lg:block shadow-[0_24px_60px_-20px_rgba(22,41,37,0.55)] sm:p-14">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
        <Sparkles className="h-10 w-10 text-sand" aria-hidden />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Turnover</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{unitName}</h1>
      <p className="mx-auto mt-4 max-w-md text-white/75">
        {items.length} {items.length === 1 ? "quest" : "quests"} · {required} required · {items.length - required} bonus · up to {maxXp} XP
      </p>
      {nextCheckIn ? (
        <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/85">
          <CalendarClock className="h-4 w-4" aria-hidden />
          Next guest {CHECK_IN_LABEL.format(new Date(`${nextCheckIn.checkInDate}T00:00:00Z`))}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onStart}
        autoFocus
        className="mx-auto mt-10 flex h-16 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-clay text-lg font-semibold text-white shadow-lg transition hover:bg-clay-strong active:scale-[0.98]"
      >
        <Play className="h-6 w-6 fill-white" aria-hidden />
        {doneCount > 0 ? `Resume (${doneCount} done)` : "Start turnover"}
      </button>
      <p className="mt-4 text-xs text-white/50">The timer starts when you tap start.</p>
    </div>
  );
}

function Summary({ items, durations, totalMs, xp, maxXp }: { items: RunItem[]; durations: Map<string, number | null>; totalMs: number | null; xp: number; maxXp: number }) {
  const done = items.filter((item) => item.completedAt);
  const timed = done.map((item) => ({ item, ms: durations.get(item.id) })).filter((entry): entry is { item: RunItem; ms: number } => entry.ms != null);
  const fastest = timed.reduce<(typeof timed)[number] | null>((best, entry) => (!best || entry.ms < best.ms ? entry : best), null);
  const longest = Math.max(1, ...timed.map((entry) => entry.ms));
  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
        <SummaryStat label="Total time" value={totalMs !== null ? formatDuration(totalMs) : "—"} />
        <SummaryStat label="Quests" value={`${done.length}/${items.length}`} />
        <SummaryStat label="XP" value={`${xp}`} sub={`of ${maxXp}`} />
        <SummaryStat label="Fastest" value={fastest ? formatDuration(fastest.ms) : "—"} sub={fastest?.item.label} />
      </div>
      {done.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-pine/10 bg-surface p-4 text-left sm:p-5">
          <h2 className="text-sm font-semibold text-pine">Time per task</h2>
          <ol className="mt-3 space-y-2.5">
            {done.map((item) => {
              const ms = durations.get(item.id);
              return (
                <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_4rem]">
                  <span className="truncate text-ink/75">{item.label}</span>
                  <div className="order-3 col-span-2 h-1.5 overflow-hidden rounded-full bg-pine/10 sm:order-none sm:col-span-1" aria-hidden>
                    <div className={cn("h-full rounded-full", fastest?.item.id === item.id ? "bg-clay" : "bg-moss")} style={{ width: ms != null ? `${Math.max(4, (ms / longest) * 100)}%` : "0%" }} />
                  </div>
                  <span className="text-right font-medium tabular-nums text-pine">{ms != null ? formatDuration(ms) : "—"}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-pine/10 bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-pine/55">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums text-pine sm:text-3xl">{value}</p>
      {sub ? <p className="truncate text-xs text-ink/50">{sub}</p> : null}
    </div>
  );
}

function Finish(props: RunProps & {
  durations: Map<string, number | null>;
  totalMs: number | null;
  xp: number;
  maxXp: number;
  marking: boolean;
  onMarkReady: () => void;
  /** Brings skipped bonus items back. */
  onReview?: () => void;
}) {
  const { task, canMarkReady, openDamage, permissions } = props;
  return (
    <div className="animate-rise text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sand shadow-[0_0_0_10px_color-mix(in_oklab,var(--color-sand)_45%,transparent)]">
        <Trophy className="h-12 w-12 text-sand-deep" aria-hidden />
      </div>
      <h1 className="mt-6 font-display text-4xl text-pine sm:text-5xl">Congratulations!</h1>
      <p className="mx-auto mt-3 max-w-md text-ink/65">Checklist cleared for {props.unitName}. One last step: mark the unit ready for the next guest.</p>

      <div className="mx-auto mt-8 max-w-md">
        {canMarkReady ? (
          <button type="button" onClick={props.onMarkReady} disabled={props.marking} className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-clay text-lg font-semibold text-white shadow-lg transition hover:bg-clay-strong active:scale-[0.98] disabled:opacity-60">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
            {props.marking ? "Marking ready…" : "Mark unit ready"}
          </button>
        ) : permissions.resolveDamage ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-clay-mist p-3 text-sm text-clay-deep">{openDamage.length} open damage {openDamage.length === 1 ? "report" : "reports"}. Resolve {openDamage.length === 1 ? "it" : "them"}, or mark ready with a reason.</p>
            <Link href={`/tasks/${task.id}/ready`} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-clay font-semibold text-white hover:bg-clay-strong">
              <Hammer className="h-5 w-5" aria-hidden />
              Review ready override
            </Link>
          </div>
        ) : (
          <p className="rounded-xl bg-clay-mist p-3 text-sm text-clay-deep">Open damage needs review before this unit can be marked ready. Ask someone who can resolve damage.</p>
        )}
        {props.onReview ? <button type="button" onClick={props.onReview} className="mt-3 text-sm font-medium text-pine/70 underline-offset-4 hover:text-pine hover:underline">Go back for the bonus quests</button> : null}
      </div>

      <Summary items={props.items} durations={props.durations} totalMs={props.totalMs} xp={props.xp} maxXp={props.maxXp} />
    </div>
  );
}

function Complete(props: RunProps & { durations: Map<string, number | null>; totalMs: number | null; xp: number; maxXp: number }) {
  const { task } = props;
  return (
    <div className="animate-rise text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sage shadow-[0_0_0_10px_color-mix(in_oklab,var(--color-sage)_45%,transparent)]">
        <CheckCircle2 className="h-12 w-12 text-pine" aria-hidden />
      </div>
      <h1 className="mt-6 font-display text-4xl text-pine sm:text-5xl">Unit ready!</h1>
      <p className="mx-auto mt-3 max-w-md text-ink/65">
        {props.unitName} is ready for the next guest{task.markedReadyAt ? ` · ${READY_LABEL.format(new Date(task.markedReadyAt))}` : ""}.
      </p>
      {task.readyOverrideReason ? <p className="mx-auto mt-4 max-w-md rounded-xl bg-clay-mist p-3 text-sm text-clay-deep">Marked ready despite open damage: {task.readyOverrideReason}</p> : null}
      <div className="mt-6 flex justify-center">
        <Link href="/tasks" className={buttonClassName("primary", "lg")}>Back to tasks</Link>
      </div>
      <Summary items={props.items} durations={props.durations} totalMs={props.totalMs} xp={props.xp} maxXp={props.maxXp} />
    </div>
  );
}
