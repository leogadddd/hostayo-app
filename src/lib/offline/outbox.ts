/**
 * Changes made while offline, kept in the browser until they can be sent.
 *
 * Each entry is a plain HTTP request that the server can safely receive more
 * than once, so the same request is replayed as it was first made. Requests
 * must carry their own idempotency key (the reservation endpoints already do).
 * Entries are replayed oldest first, because later changes can depend on
 * earlier ones.
 */

const DB_NAME = "hostayo-offline";
const STORE = "outbox";
/** Changes the server refused, kept until the person dismisses them. */
const REJECTED_STORE = "rejected";

export interface OutboxRequest {
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string | null;
  /** What the person did, in words, for the "couldn't sync" message. */
  label?: string;
  /** Small facts for showing the change while it waits (unit, dates, guest). */
  meta?: Record<string, string>;
}

export interface OutboxEntry extends OutboxRequest {
  id: string;
  createdAt: number;
  attempts: number;
}

/** A change the server refused, with its own words for why. */
export interface RejectedEntry extends OutboxEntry {
  reason: string;
  rejectedAt: number;
}

export interface DrainResult {
  sent: number;
  /** Entries the server refused for good; they moved to the rejected list. */
  rejected: RejectedEntry[];
  /** Entries still waiting, because the connection or the server failed. */
  remaining: number;
}

function available(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(REJECTED_STORE)) {
        db.createObjectStore(REJECTED_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
  storeName: string = STORE,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(
        db.transaction(storeName, mode).objectStore(storeName),
      );
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  if (!available()) return [];
  const all = await run("readonly", (store) => store.getAll());
  return (all as OutboxEntry[]).sort((a, b) => a.createdAt - b.createdAt);
}

/** Changes the server refused, newest first. */
export async function listRejected(): Promise<RejectedEntry[]> {
  if (!available()) return [];
  const all = await run("readonly", (s) => s.getAll(), REJECTED_STORE);
  return (all as RejectedEntry[]).sort((a, b) => b.rejectedAt - a.rejectedAt);
}

export async function dismissRejected(id: string): Promise<void> {
  if (!available()) return;
  await run("readwrite", (s) => s.delete(id), REJECTED_STORE);
}

export async function outboxCount(): Promise<number> {
  if (!available()) return 0;
  return run("readonly", (store) => store.count());
}

export async function enqueue(request: OutboxRequest): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    ...request,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attempts: 0,
  };
  await run("readwrite", (store) => store.put(entry));
  return entry;
}

async function remove(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

async function bump(entry: OutboxEntry): Promise<void> {
  await run("readwrite", (store) =>
    store.put({ ...entry, attempts: entry.attempts + 1 }),
  );
}

/**
 * Statuses that will never succeed by retrying: the server understood and said no.
 * A 401 is not one of them: the person just has to sign in again, and the
 * change must wait for that rather than be thrown away.
 */
function isFinal(status: number): boolean {
  return (
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    status !== 408 &&
    status !== 429
  );
}

async function reasonFrom(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = (body as { error?: unknown } | null)?.error;
    if (typeof message === "string" && message) return message;
  } catch {
    // Not JSON; fall back to the generic words.
  }
  return "The server did not accept this change.";
}

/**
 * Sends the outbox in order. Stops at the first entry that fails because of the
 * connection or a server error, so order is kept and nothing is skipped.
 * Credentials ride along as cookies, same as the original request would have.
 */
export async function drainOutbox(
  send: typeof fetch = fetch,
): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, rejected: [], remaining: 0 };
  const entries = await listOutbox();
  for (const [index, entry] of entries.entries()) {
    let response: Response;
    try {
      response = await send(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body ?? undefined,
        credentials: "same-origin",
      });
    } catch {
      await bump(entry);
      result.remaining = entries.length - index;
      return result;
    }
    if (response.ok) {
      await remove(entry.id);
      result.sent += 1;
    } else if (isFinal(response.status)) {
      const refused: RejectedEntry = {
        ...entry,
        reason: await reasonFrom(response),
        rejectedAt: Date.now(),
      };
      // Keep it before dropping it, so a crash in between loses nothing.
      await run("readwrite", (s) => s.put(refused), REJECTED_STORE);
      await remove(entry.id);
      result.rejected.push(refused);
    } else {
      await bump(entry);
      result.remaining = entries.length - index;
      return result;
    }
  }
  return result;
}

/** Forget everything, for sign-out on a shared device. */
export async function clearOutbox(): Promise<void> {
  if (!available()) return;
  await run("readwrite", (store) => store.clear());
  await run("readwrite", (store) => store.clear(), REJECTED_STORE);
}
