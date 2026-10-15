import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  expenses,
  guests,
  organizations,
  properties,
  reservations,
  tasks,
  units,
} from "@/lib/db/schema";
import type { MembershipContext } from "@/lib/auth/session";
import { todayInTimeZone } from "@/lib/dates";
import { phoneDigits } from "@/lib/guest-search";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { parseSearchQuery, type ParsedSearch } from "@/lib/search-query";

export const SEARCH_GROUP_LIMIT = 5;
const MAX_QUERY_LENGTH = 100;
const MAX_TOKENS = 6;

export type SearchResultKind =
  "reservation" | "guest" | "property" | "unit" | "task" | "expense";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  href: string;
  /** Short status text, e.g. "Confirmed". */
  badge?: string;
  /** Set for reservations so the row can colour its badge like the list does. */
  status?: string;
}

export interface SearchGroup {
  kind: SearchResultKind;
  label: string;
  results: SearchResult[];
}

export interface SearchResponse {
  groups: SearchGroup[];
}

/** `%` and `_` in what someone typed are characters, not wildcards. */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * One typed word against a column: a substring match, plus a typo-tolerant
 * trigram match for words long enough to mean something. Both use the
 * pg_trgm GIN indexes.
 */
function wordMatch(column: SQLWrapper, token: string) {
  const contains = ilike(
    column as Parameters<typeof ilike>[0],
    `%${escapeLike(token)}%`,
  );
  if (token.length < 4) return contains;
  return or(contains, sql`${token} <% ${column}`)!;
}

/** Every word must match at least one of the columns. */
function allWords(tokens: string[], columns: SQLWrapper[]) {
  return and(
    ...tokens.map((token) =>
      or(...columns.map((column) => wordMatch(column, token)))!,
    ),
  )!;
}

function guestWordMatch(token: string) {
  const conditions = [
    wordMatch(guests.name, token),
    wordMatch(guests.email, token),
  ];
  // "0917 555", "+63 917 555" and "917555" all find the same guest.
  if (/^[\d\s()+-]+$/.test(token)) {
    const digits = phoneDigits(token);
    if (digits.length >= 3) {
      conditions.push(ilike(guests.phoneDigits, `%${digits}%`));
    }
  }
  return or(...conditions)!;
}

/** The "#AB12CD34" reference shown on reservations is the start of their id. */
function referenceMatch(token: string) {
  const reference = token.replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f-]{4,}$/.test(reference)) return null;
  return sql`${reservations.id}::text like ${`${escapeLike(reference)}%`}`;
}

function tokenize(text: string) {
  return text.split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS);
}

function formatShort(date: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

async function searchReservations(
  organizationId: string,
  parsed: ParsedSearch,
  tokens: string[],
  today: string,
): Promise<SearchResult[]> {
  const conditions: (SQL | undefined)[] = [
    eq(reservations.organizationId, organizationId),
  ];
  for (const token of tokens) {
    const reference = referenceMatch(token);
    conditions.push(
      or(
        guestWordMatch(token),
        wordMatch(reservations.platformReference, token),
        wordMatch(units.name, token),
        wordMatch(properties.name, token),
        ...(reference ? [reference] : []),
      ),
    );
  }
  // Cancelled and expired bookings only turn up when asked for.
  conditions.push(
    parsed.statuses.length
      ? inArray(reservations.status, parsed.statuses)
      : sql`${reservations.status} not in ('cancelled', 'expired')`,
  );
  const { date } = parsed;
  if (date?.kind === "arriving") {
    conditions.push(
      gte(reservations.checkInDate, date.from),
      lte(reservations.checkInDate, date.to),
    );
  } else if (date?.kind === "departing") {
    conditions.push(
      gte(reservations.checkOutDate, date.from),
      lte(reservations.checkOutDate, date.to),
    );
  } else if (date) {
    // Staying: occupying at least one night in the range (check-out exclusive).
    conditions.push(
      lte(reservations.checkInDate, date.to),
      sql`${reservations.checkOutDate} > ${date.from}`,
    );
  }

  const rows = await db
    .select({
      id: reservations.id,
      status: reservations.status,
      checkInDate: reservations.checkInDate,
      checkOutDate: reservations.checkOutDate,
      guestName: guests.name,
      unitName: units.name,
      propertyName: properties.name,
    })
    .from(reservations)
    .innerJoin(
      guests,
      and(
        eq(guests.organizationId, reservations.organizationId),
        eq(guests.id, reservations.guestId),
      ),
    )
    .innerJoin(
      units,
      and(
        eq(units.organizationId, reservations.organizationId),
        eq(units.id, reservations.unitId),
      ),
    )
    .innerJoin(
      properties,
      and(
        eq(properties.organizationId, units.organizationId),
        eq(properties.id, units.propertyId),
      ),
    )
    .where(and(...conditions))
    // Stays that haven't ended come first, soonest first; past ones follow,
    // most recent first.
    .orderBy(
      sql`(${reservations.checkOutDate} < ${today})`,
      sql`case when ${reservations.checkOutDate} >= ${today} then ${reservations.checkInDate} end asc`,
      desc(reservations.checkInDate),
    )
    .limit(SEARCH_GROUP_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    kind: "reservation",
    title: row.guestName,
    subtitle: `${formatShort(row.checkInDate)} – ${formatShort(row.checkOutDate)} · ${row.unitName}, ${row.propertyName} · #${row.id.slice(0, 8).toUpperCase()}`,
    href: `/reservations/${row.id}`,
    badge: RESERVATION_STATUS_LABELS[row.status],
    status: row.status,
  }));
}

async function searchGuests(
  organizationId: string,
  tokens: string[],
): Promise<SearchResult[]> {
  const rows = await db
    .select({
      id: guests.id,
      name: guests.name,
      email: guests.email,
      phone: guests.phone,
    })
    .from(guests)
    .where(
      and(
        eq(guests.organizationId, organizationId),
        ...tokens.map(guestWordMatch),
      ),
    )
    .orderBy(
      sql`similarity(${guests.name}, ${tokens.join(" ")}) desc`,
      asc(guests.name),
    )
    .limit(SEARCH_GROUP_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    kind: "guest",
    title: row.name,
    subtitle: [row.phone, row.email].filter(Boolean).join(" · "),
    href: `/guests/${row.id}`,
  }));
}

async function searchProperties(
  organizationId: string,
  tokens: string[],
): Promise<SearchResult[]> {
  const rows = await db
    .select({
      id: properties.id,
      name: properties.name,
      address: properties.address,
    })
    .from(properties)
    .where(
      and(
        eq(properties.organizationId, organizationId),
        isNull(properties.deletedAt),
        allWords(tokens, [
          properties.name,
          sql`coalesce(${properties.address}, '')`,
        ]),
      ),
    )
    .orderBy(asc(properties.name))
    .limit(SEARCH_GROUP_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    kind: "property",
    title: row.name,
    subtitle: row.address ?? "",
    href: `/properties/${row.id}`,
  }));
}

async function searchUnits(
  organizationId: string,
  tokens: string[],
): Promise<SearchResult[]> {
  const rows = await db
    .select({
      id: units.id,
      name: units.name,
      propertyId: units.propertyId,
      propertyName: properties.name,
    })
    .from(units)
    .innerJoin(
      properties,
      and(
        eq(properties.organizationId, units.organizationId),
        eq(properties.id, units.propertyId),
      ),
    )
    .where(
      and(
        eq(units.organizationId, organizationId),
        isNull(units.deletedAt),
        isNull(properties.deletedAt),
        allWords(tokens, [units.name, properties.name]),
      ),
    )
    .orderBy(asc(properties.name), asc(units.name))
    .limit(SEARCH_GROUP_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    kind: "unit",
    title: row.name,
    subtitle: row.propertyName,
    href: `/properties/${row.propertyId}/units/${row.id}`,
  }));
}

async function searchTasks(
  organizationId: string,
  tokens: string[],
): Promise<SearchResult[]> {
  const rows = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      unitName: units.name,
      propertyName: properties.name,
    })
    .from(tasks)
    .innerJoin(
      units,
      and(
        eq(units.organizationId, tasks.organizationId),
        eq(units.id, tasks.unitId),
      ),
    )
    .innerJoin(
      properties,
      and(
        eq(properties.organizationId, units.organizationId),
        eq(properties.id, units.propertyId),
      ),
    )
    .where(
      and(
        eq(tasks.organizationId, organizationId),
        allWords(tokens, [units.name, properties.name]),
      ),
    )
    // Work still to do first, then the newest.
    .orderBy(asc(tasks.status), desc(tasks.createdAt))
    .limit(SEARCH_GROUP_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    kind: "task",
    title: `${row.unitName} turnover`,
    subtitle: row.propertyName,
    href: `/tasks/${row.id}`,
    badge: row.status === "open" ? "Open" : "Ready",
  }));
}

async function searchExpenses(
  organizationId: string,
  tokens: string[],
): Promise<SearchResult[]> {
  const rows = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      payee: expenses.payee,
      category: expenses.category,
      paidDate: expenses.paidDate,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.organizationId, organizationId),
        isNull(expenses.voidedAt),
        allWords(tokens, [
          expenses.description,
          sql`coalesce(${expenses.payee}, '')`,
          expenses.category,
        ]),
      ),
    )
    .orderBy(desc(expenses.paidDate))
    .limit(SEARCH_GROUP_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    kind: "expense",
    title: row.description,
    subtitle: [row.payee, row.category, formatShort(row.paidDate)]
      .filter(Boolean)
      .join(" · "),
    href: `/expenses/${row.id}`,
  }));
}

/**
 * Everything in the member's organization that matches `query`, grouped and
 * capped, limited to what their role may see. Dates and statuses in the query
 * ("checkin tomorrow", "cancelled") narrow reservations only.
 */
export async function searchOrganization(
  membership: MembershipContext,
  query: string,
): Promise<SearchResponse> {
  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!trimmed) return { groups: [] };
  const { organizationId } = membership;

  const [organization] = await db
    .select({ timezone: organizations.defaultTimezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  const today = todayInTimeZone(organization?.timezone ?? "Asia/Manila");

  const parsed = parseSearchQuery(trimmed, today);
  const tokens = tokenize(parsed.text);
  const filtered = parsed.statuses.length > 0 || parsed.date !== null;

  const jobs: Promise<SearchGroup>[] = [];
  const add = (
    kind: SearchResultKind,
    label: string,
    run: () => Promise<SearchResult[]>,
  ) => jobs.push(run().then((results) => ({ kind, label, results })));

  if (can(membership, "reservations.view")) {
    add("reservation", "Reservations", () =>
      searchReservations(organizationId, parsed, tokens, today),
    );
  }
  // Filters like a date or status only mean something for reservations.
  if (!filtered && tokens.length) {
    if (can(membership, "guests.view")) {
      add("guest", "Guests", () => searchGuests(organizationId, tokens));
    }
    if (can(membership, "properties.view")) {
      add("property", "Properties", () =>
        searchProperties(organizationId, tokens),
      );
      add("unit", "Units", () => searchUnits(organizationId, tokens));
    }
    if (can(membership, "tasks.view")) {
      add("task", "Tasks", () => searchTasks(organizationId, tokens));
    }
    if (can(membership, "expenses.view")) {
      add("expense", "Expenses", () => searchExpenses(organizationId, tokens));
    }
  }

  const groups = (await Promise.all(jobs)).filter(
    (group) => group.results.length > 0,
  );
  return { groups };
}
