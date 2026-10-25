"use client";

import { enqueue, type OutboxEntry } from "./outbox";
import { notifyQueued } from "./connectivity";

/**
 * Keeps a JSON request on this device until the server can be reached, then
 * lets the connection store send it. The body must carry its own
 * idempotency key so a replay can never double up.
 */
export async function queueRequest(request: {
  url: string;
  body: Record<string, unknown>;
  label: string;
  meta?: Record<string, string>;
}): Promise<OutboxEntry> {
  const entry = await enqueue({
    url: request.url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
    label: request.label,
    meta: request.meta,
  });
  notifyQueued();
  return entry;
}
