"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Buildings as Building2,
  ClipboardText as ClipboardList,
  DoorOpen,
  Receipt,
  MagnifyingGlass as Search,
  Users,
  X,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { matchPages } from "@/lib/search-pages";
import type { ReservationStatus } from "@/lib/db/schema";
import { ReservationStatusBadge } from "@/components/app/reservation-status-badge";
import type {
  SearchGroup,
  SearchResult,
  SearchResultKind,
} from "@/server/search/service";

type IconType = typeof Search;

export interface GlobalSearchPage {
  href: string;
  label: string;
  group?: string;
  keywords?: string;
  icon: IconType;
}

type ItemKind = SearchResultKind | "page";

interface Item {
  id: string;
  kind: ItemKind;
  href: string;
  title: string;
  subtitle: string;
  badge?: string;
  status?: string;
  icon: IconType;
}

interface Section {
  key: string;
  label: string;
  items: Item[];
}

const KIND_ICONS: Record<SearchResultKind, IconType> = {
  reservation: BookOpen,
  guest: Users,
  property: Building2,
  unit: DoorOpen,
  task: ClipboardList,
  expense: Receipt,
};

/** Shortcuts that fill the box with a query the parser understands. */
const QUICK_SEARCHES = [
  { label: "Arriving today", query: "checkin" },
  { label: "Departing today", query: "checkout" },
  { label: "In-house", query: "in-house" },
  { label: "Holds", query: "holds" },
] as const;

const RECENTS_LIMIT = 6;
const JUMP_LIMIT = 6;

interface Recent {
  kind: ItemKind;
  href: string;
  title: string;
  subtitle: string;
  badge?: string;
  status?: string;
}

function readRecents(key: string): Recent[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(key) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is Recent =>
          typeof entry?.href === "string" &&
          typeof entry?.title === "string" &&
          typeof entry?.subtitle === "string" &&
          typeof entry?.kind === "string",
      )
      .slice(0, RECENTS_LIMIT);
  } catch {
    return [];
  }
}

function writeRecents(key: string, recents: Recent[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(recents));
  } catch {
    // Storage can be blocked; recents are a convenience.
  }
}

const noopSubscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform);

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

function fold(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function GlobalSearch({
  organizationId,
  userEmail,
  pages,
}: {
  organizationId: string;
  userEmail: string;
  pages: readonly GlobalSearchPage[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const recentsKey = `hostayo:search-recents:${organizationId}:${userEmail}`;
  // The shortcut hint can't be known on the server without a hydration mismatch.
  const apple = useSyncExternalStore(noopSubscribe, isApple, () => false);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<{
    query: string;
    groups: SearchGroup[];
  }>({ query: "", groups: [] });
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<Recent[]>([]);

  const trimmed = query.trim();

  const openSearch = useCallback(() => {
    const element = dialog.current;
    if (!element || element.open) return;
    setQuery("");
    setActive(0);
    setFailed(false);
    setRecents(readRecents(recentsKey));
    element.showModal();
    setOpen(true);
    input.current?.focus();
  }, [recentsKey]);

  const closeSearch = useCallback(() => {
    if (dialog.current?.open) dialog.current.close();
    setOpen(false);
  }, []);

  // Ctrl/⌘ K anywhere, or "/" when not typing in a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        openSearch();
      } else if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  // Ask the server a moment after typing stops; a newer keystroke cancels the old request.
  useEffect(() => {
    if (!open || !trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { groups: SearchGroup[] };
        setRemote({ query: trimmed, groups: data.groups });
        setFailed(false);
        setActive(0);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmed]);

  const pageItem = useCallback(
    (page: GlobalSearchPage): Item => ({
      id: `page:${page.href}`,
      kind: "page",
      href: page.href,
      title: page.label,
      subtitle: page.group ?? "Page",
      icon: page.icon,
    }),
    [],
  );

  const sections = useMemo<Section[]>(() => {
    if (!trimmed) {
      const result: Section[] = [];
      if (recents.length) {
        result.push({
          key: "recent",
          label: "Recent",
          items: recents.map((recent) => ({
            id: `recent:${recent.href}`,
            kind: recent.kind,
            href: recent.href,
            title: recent.title,
            subtitle: recent.subtitle,
            badge: recent.badge,
            status: recent.status,
            icon:
              recent.kind === "page"
                ? (pages.find((page) => page.href === recent.href)?.icon ??
                  ArrowRight)
                : KIND_ICONS[recent.kind],
          })),
        });
      }
      result.push({
        key: "jump",
        label: "Jump to",
        items: pages.slice(0, JUMP_LIMIT).map(pageItem),
      });
      return result;
    }
    const matchedPages = matchPages(pages, trimmed).map(pageItem);
    const pageSection: Section = {
      key: "pages",
      label: "Pages & tools",
      items: matchedPages,
    };
    const data: Section[] = remote.groups.map((group) => ({
      key: group.kind,
      label: group.label,
      items: group.results.map((result: SearchResult) => ({
        id: `${result.kind}:${result.id}`,
        kind: result.kind,
        href: result.href,
        title: result.title,
        subtitle: result.subtitle,
        badge: result.badge,
        status: result.status,
        icon: KIND_ICONS[result.kind],
      })),
    }));
    // A page whose name starts with what was typed ("tools", "guests") leads.
    const pageFirst =
      matchedPages[0] && fold(matchedPages[0].title).startsWith(fold(trimmed));
    return (pageFirst ? [pageSection, ...data] : [...data, pageSection]).filter(
      (section) => section.items.length > 0,
    );
  }, [trimmed, recents, pages, pageItem, remote.groups]);

  const items = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
  const activeIndex = Math.min(active, Math.max(items.length - 1, 0));
  const activeId = items[activeIndex]
    ? `${baseId}-${items[activeIndex].id}`
    : undefined;
  const settled = !trimmed || remote.query === trimmed;

  useEffect(() => {
    if (activeId) {
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeId]);

  const choose = (item: Item) => {
    const entry: Recent = {
      kind: item.kind,
      href: item.href,
      title: item.title,
      subtitle: item.subtitle,
      badge: item.badge,
      status: item.status,
    };
    writeRecents(
      recentsKey,
      [
        entry,
        ...readRecents(recentsKey).filter((r) => r.href !== item.href),
      ].slice(0, RECENTS_LIMIT),
    );
    closeSearch();
    router.push(item.href);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!items.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) choose(item);
    }
  };

  const total = items.length;

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search"
        aria-haspopup="dialog"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-pine/15 text-pine hover:border-pine/30 md:hidden"
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={openSearch}
        aria-haspopup="dialog"
        data-testid="global-search-trigger"
        className="hidden h-10 w-full max-w-md items-center gap-2.5 rounded-lg border border-pine/15 bg-paper px-3 text-left text-sm text-ink/55 hover:border-pine/30 md:flex"
      >
        <Search className="h-4 w-4 shrink-0 text-ink/45" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          Search reservations, guests, pages…
        </span>
        <kbd className="shrink-0 rounded border border-pine/15 bg-linen px-1.5 py-0.5 text-[11px] font-medium text-ink/55">
          {apple ? "⌘ K" : "Ctrl K"}
        </kbd>
      </button>

      <dialog
        ref={dialog}
        aria-label="Search"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSearch();
        }}
        className="fixed left-1/2 top-[10vh] m-0 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55 max-sm:inset-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:rounded-none max-sm:border-0"
      >
        <div className="flex max-h-[80vh] flex-col max-sm:h-full max-sm:max-h-none">
          <div className="flex items-center gap-2 border-b border-pine/10 px-4">
            <Search className="h-4 w-4 shrink-0 text-ink/45" aria-hidden />
            <input
              ref={input}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              maxLength={100}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="Search reservations, guests, properties, pages…"
              className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink/40 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  input.current?.focus();
                }}
                aria-label="Clear search"
                className="rounded-md p-1.5 text-ink/45 hover:bg-pine-mist hover:text-pine"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeSearch}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink/55 hover:bg-pine-mist hover:text-pine"
            >
              Esc
            </button>
          </div>

          {!trimmed ? (
            <div className="flex flex-wrap gap-2 border-b border-pine/10 px-4 py-3">
              {QUICK_SEARCHES.map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => {
                    setQuery(quick.query);
                    setActive(0);
                    input.current?.focus();
                  }}
                  className="rounded-full border border-pine/15 bg-paper px-3 py-1 text-xs font-medium text-pine hover:border-pine/35"
                >
                  {quick.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <p className="sr-only" aria-live="polite">
              {!settled
                ? "Searching"
                : trimmed
                  ? `${total} ${total === 1 ? "result" : "results"}`
                  : ""}
            </p>
            {failed ? (
              <p className="px-4 py-6 text-sm text-clay-deep">
                Search isn’t available right now. Check your connection and try
                again.
              </p>
            ) : null}
            {trimmed && settled && !failed && total === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink/55">
                No matches for “{trimmed}”.
              </p>
            ) : null}
            <ul
              id={listId}
              role="listbox"
              aria-label="Results"
              className={cn("pb-2", !total && "hidden")}
            >
              {sections.map((section) => (
                <li key={section.key} role="presentation">
                  <p
                    role="presentation"
                    className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink/45"
                  >
                    {section.label}
                  </p>
                  <ul role="presentation">
                    {section.items.map((item) => {
                      const index = items.indexOf(item);
                      const selected = index === activeIndex;
                      const Icon = item.icon;
                      return (
                        <li
                          key={item.id}
                          id={`${baseId}-${item.id}`}
                          role="option"
                          aria-selected={selected}
                          onClick={() => choose(item)}
                          onMouseMove={() => {
                            if (!selected) setActive(index);
                          }}
                          className={cn(
                            "mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
                            selected && "bg-pine-mist",
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-bark">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">
                              {item.title}
                            </span>
                            {item.subtitle ? (
                              <span className="block truncate text-xs text-ink/55">
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                          {item.status ? (
                            <ReservationStatusBadge
                              status={item.status as ReservationStatus}
                            />
                          ) : item.badge ? (
                            <span className="shrink-0 rounded-full bg-pine-mist px-2.5 py-1 text-xs font-semibold text-pine">
                              {item.badge}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </dialog>
    </>
  );
}
