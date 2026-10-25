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

export interface OutboxRequest {
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string | null;
  /** What the person did, in words, for the "couldn't sync" message. */
  label?: string;
}

export interface OutboxEntry extends OutboxRequest {
  id: string;
  createdAt: number;
  attempts: number;
}

export interface DrainResult {
  sent: number;
  /** Entries the server refused for good; they were dropped from the outbox. */
  rejected: OutboxEntry[];
  /** Entries still waiting, because the connection or the server failed. */
  remaining: number;
}

function available(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
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

/** Statuses that will never succeed by retrying: the server understood and said no. */
function isFinal(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
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
      await remove(entry.id);
      result.rejected.push(entry);
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
}
