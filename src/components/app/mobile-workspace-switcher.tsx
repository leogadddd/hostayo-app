"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  CaretUpDown as ChevronsUpDown,
  CircleNotch as LoaderCircle,
  MagnifyingGlass as Search,
} from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import {
  searchOrganizationsAction,
  selectActiveOrganization,
} from "@/app/(app)/organization-actions";
import type { OrganizationOption } from "./organization-selector";

function Mark({ name, imageSrc }: { name: string; imageSrc?: string | null }) {
  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary font-display text-lg text-white"
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logos are same-origin
        <img src={imageSrc} alt="" className="h-full w-full object-cover" />
      ) : (
        name.trim().slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/**
 * The workspace name on the phone dashboard, as a button: one tap opens every
 * workspace, one more switches. The row shows a spinner while the switch
 * lands, then the sheet closes on the refreshed dashboard. L1 operators also
 * get a search box that reaches every workspace in the app.
 */
export function MobileWorkspaceSwitcher({
  organizations,
  activeOrganizationId,
  l1 = false,
  className,
}: {
  organizations: OrganizationOption[];
  activeOrganizationId: string;
  l1?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [switching, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ id: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const search = useRef(0);

  const active =
    organizations.find((item) => item.id === activeOrganizationId) ??
    organizations[0]!;
  const single = organizations.length <= 1 && !l1;

  useEffect(() => {
    const text = query.trim();
    if (!l1 || !text) return;
    const ticket = ++search.current;
    const timer = setTimeout(() => {
      setSearching(true);
      searchOrganizationsAction(text)
        .then((rows) => {
          if (ticket === search.current) setFound(rows);
        })
        .finally(() => {
          if (ticket === search.current) setSearching(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, l1]);

  const choose = (id: string, name: string) => {
    if (id === activeOrganizationId) {
      setOpen(false);
      return;
    }
    setPendingId(id);
    startTransition(async () => {
      const result = await selectActiveOrganization(id);
      if (result.error) {
        setPendingId(null);
        toast.error("Couldn’t switch workspace", {
          description: result.error,
        });
        return;
      }
      // Already on the dashboard: one refresh re-reads it for the new workspace.
      router.refresh();
      setOpen(false);
      setPendingId(null);
      setQuery("");
      toast.success(`Switched to ${name}`);
    });
  };

  const owned = new Set(organizations.map((item) => item.id));
  const others = (query.trim() ? found : []).filter(
    (row) => !owned.has(row.id),
  );
  const rows: {
    id: string;
    name: string;
    meta: string;
    imageSrc?: string | null;
  }[] = [
    ...organizations
      .filter(
        (item) =>
          !query.trim() ||
          item.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        meta: item.viaL1 ? "L1 access" : roleLabel(item.role),
        imageSrc: item.imageSrc,
      })),
    ...others.map((row) => ({
      id: row.id,
      name: row.name,
      meta: "L1 access",
    })),
  ];

  if (single)
    return (
      <p className={cn("text-sm font-medium text-ink/60", className)}>
        {active.name}
      </p>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface/70 py-1.5 pl-3 pr-2.5 text-sm font-semibold text-pine ring-1 ring-pine/10 backdrop-blur active:bg-surface",
          className,
        )}
      >
        <span className="truncate">{active.name}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-pine/55" aria-hidden />
      </button>
      <Sheet
        open={open}
        onClose={() => (switching ? undefined : setOpen(false))}
        title="Switch workspace"
      >
        <div className="space-y-3 pb-2">
          {l1 ? (
            <label className="flex h-12 items-center gap-2.5 rounded-xl bg-surface px-3.5 ring-1 ring-pine/12">
              <Search className="h-5 w-5 shrink-0 text-pine/50" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search every workspace"
                aria-label="Search workspaces"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/40"
              />
              {searching ? (
                <LoaderCircle
                  className="h-4 w-4 animate-spin text-pine/50"
                  aria-hidden
                />
              ) : null}
            </label>
          ) : null}
          <ul className="space-y-2" aria-label="Workspaces">
            {rows.map((row) => {
              const selected = row.id === activeOrganizationId;
              const busy = pendingId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={switching}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => choose(row.id, row.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-3 text-left active:bg-pine-mist disabled:opacity-60",
                      selected
                        ? "bg-pine-mist ring-1 ring-pine/15"
                        : "bg-surface ring-1 ring-pine/[0.07]",
                      busy && "opacity-100!",
                    )}
                  >
                    <Mark name={row.name} imageSrc={row.imageSrc} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-pine">
                        {row.name}
                      </span>
                      <span className="block text-xs text-ink/55">
                        {row.meta}
                      </span>
                    </span>
                    {busy ? (
                      <LoaderCircle
                        className="h-5 w-5 shrink-0 animate-spin text-pine"
                        aria-hidden
                      />
                    ) : selected ? (
                      <Check
                        className="h-5 w-5 shrink-0 text-pine"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {rows.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-ink/60">
              {searching ? "Searching…" : "No workspaces match that search."}
            </p>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
