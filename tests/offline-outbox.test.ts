import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOutbox,
  dismissRejected,
  drainOutbox,
  enqueue,
  listOutbox,
  listRejected,
  outboxCount,
} from "@/lib/offline/outbox";

const request = (label: string, key = label) => ({
  url: "/api/reservations",
  method: "POST" as const,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idempotencyKey: key }),
  label,
});

const reply = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

beforeEach(async () => {
  await clearOutbox();
});

describe("outbox drain", () => {
  it("sends entries oldest first and empties the outbox", async () => {
    await enqueue(request("first"));
    await new Promise((r) => setTimeout(r, 2));
    await enqueue(request("second"));
    const send = vi.fn(async (_url: string, _init?: RequestInit) => reply(200));

    const result = await drainOutbox(send as unknown as typeof fetch);

    expect(result).toMatchObject({ sent: 2, remaining: 0, rejected: [] });
    const keys = send.mock.calls.map(
      ([, init]) =>
        JSON.parse((init as RequestInit).body as string).idempotencyKey,
    );
    expect(keys).toEqual(["first", "second"]);
    expect(await outboxCount()).toBe(0);
  });

  it("stops at a lost connection and keeps everything from there on", async () => {
    await enqueue(request("a"));
    await new Promise((r) => setTimeout(r, 2));
    await enqueue(request("b"));
    const send = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const result = await drainOutbox(send as unknown as typeof fetch);

    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(2);
    expect(send).toHaveBeenCalledTimes(1);
    const left = await listOutbox();
    expect(left.map((e) => e.label)).toEqual(["a", "b"]);
    expect(left[0]!.attempts).toBe(1);
  });

  it("keeps entries on a server error or a 401 so nothing is lost", async () => {
    await enqueue(request("a"));
    expect(
      (await drainOutbox((async () => reply(500)) as unknown as typeof fetch))
        .remaining,
    ).toBe(1);
    expect(
      (await drainOutbox((async () => reply(401)) as unknown as typeof fetch))
        .remaining,
    ).toBe(1);
    expect(await outboxCount()).toBe(1);
  });

  it("moves a refused entry to the rejected list with the server's reason, then carries on", async () => {
    await enqueue(request("taken"));
    await new Promise((r) => setTimeout(r, 2));
    await enqueue(request("fine"));
    const send = vi
      .fn()
      .mockResolvedValueOnce(reply(409, { error: "Those dates conflict." }))
      .mockResolvedValueOnce(reply(200));

    const result = await drainOutbox(send as unknown as typeof fetch);

    expect(result.sent).toBe(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({
      label: "taken",
      reason: "Those dates conflict.",
    });
    expect(await outboxCount()).toBe(0);
    const refused = await listRejected();
    expect(refused).toHaveLength(1);
    await dismissRejected(refused[0]!.id);
    expect(await listRejected()).toEqual([]);
  });

  it("replaying after a lost reply sends the identical request again", async () => {
    await enqueue(request("booking", "key-1"));
    const bodies: string[] = [];
    // First attempt reaches the server but the reply never arrives.
    const lostReply = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(init!.body as string);
      throw new TypeError("network lost");
    });
    await drainOutbox(lostReply as unknown as typeof fetch);
    const ok = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(init!.body as string);
      return reply(200);
    });
    await drainOutbox(ok as unknown as typeof fetch);

    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toBe(bodies[1]);
    expect(await outboxCount()).toBe(0);
  });
});
