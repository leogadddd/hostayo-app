import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Runs public/sw.js against an in-memory Cache API and a controllable network,
 * so the offline rules can be checked without a browser.
 */

type Listener = (event: unknown) => void;

class MemoryCache {
  entries = new Map<string, Response>();
  async match(request: Request | string) {
    const key = typeof request === "string" ? request : request.url;
    return this.entries
      .get(new URL(key, "http://app.test").toString())
      ?.clone();
  }
  async put(request: Request | string, response: Response) {
    const key = typeof request === "string" ? request : request.url;
    this.entries.set(new URL(key, "http://app.test").toString(), response);
  }
  async add(url: string) {
    this.entries.set(
      new URL(url, "http://app.test").toString(),
      new Response("offline page"),
    );
  }
  async keys() {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
  async delete(request: Request | string) {
    const key = typeof request === "string" ? request : request.url;
    return this.entries.delete(new URL(key, "http://app.test").toString());
  }
}

function loadWorker() {
  const listeners: Record<string, Listener> = {};
  const stores = new Map<string, MemoryCache>();
  const network = { online: true };
  const fetchMock = vi.fn(async (request: Request) => {
    if (!network.online) throw new TypeError("Failed to fetch");
    return new Response(`live:${new URL(request.url).pathname}`);
  });
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name)!;
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const self = {
    location: { origin: "http://app.test" },
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] = listener;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
  vm.runInNewContext(source, {
    self,
    caches,
    fetch: fetchMock,
    Request,
    Response,
    URL,
    setTimeout,
    clearTimeout,
    Promise,
  });

  /** Sends a request through the worker; null means it left the request alone. */
  async function request(
    url: string,
    init: { method?: string; mode?: string; rsc?: boolean } = {},
  ) {
    const req = new Request(`http://app.test${url}`, {
      method: init.method ?? "GET",
      headers: init.rsc ? { RSC: "1" } : {},
    });
    Object.defineProperty(req, "mode", { value: init.mode ?? "cors" });
    let answer: Promise<Response> | null = null;
    listeners.fetch!({
      request: req,
      respondWith: (response: Promise<Response>) => {
        answer = response;
      },
    });
    return answer ? await (answer as Promise<Response>) : null;
  }

  async function install() {
    let done: Promise<unknown> = Promise.resolve();
    listeners.install!({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
  }

  async function message(data: unknown) {
    let done: Promise<unknown> = Promise.resolve();
    listeners.message!({
      data,
      waitUntil: (p: Promise<unknown>) => (done = p),
    });
    await done;
  }

  return { request, install, message, network, stores, fetchMock };
}

let worker: ReturnType<typeof loadWorker>;

beforeEach(async () => {
  worker = loadWorker();
  await worker.install();
});

describe("service worker", () => {
  it("keeps the offline page ready from the first install", () => {
    const pages = [...worker.stores.entries()].find(([name]) =>
      name.includes("pages"),
    )![1];
    expect(pages.entries.has("http://app.test/offline")).toBe(true);
  });

  it("shows live pages while online and saves a copy", async () => {
    const response = await worker.request("/reservations", {
      mode: "navigate",
    });
    expect(await response!.text()).toBe("live:/reservations");
  });

  it("serves the saved copy of a page once the network is gone", async () => {
    await worker.request("/reservations", { mode: "navigate" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    worker.network.online = false;
    const response = await worker.request("/reservations", {
      mode: "navigate",
    });
    expect(await response!.text()).toBe("live:/reservations");
  });

  it("falls back to the offline page for a page never opened", async () => {
    worker.network.online = false;
    const response = await worker.request("/guests", { mode: "navigate" });
    expect(await response!.text()).toBe("offline page");
  });

  it("keeps in-app navigation data apart from the page itself", async () => {
    await worker.request("/tasks", { mode: "navigate" });
    await worker.request("/tasks", { rsc: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    worker.network.online = false;
    const page = await worker.request("/tasks", { mode: "navigate" });
    const data = await worker.request("/tasks", { rsc: true });
    expect(await page!.text()).toBe("live:/tasks");
    expect(await data!.text()).toBe("live:/tasks");
    const pages = [...worker.stores.entries()].find(([name]) =>
      name.includes("pages"),
    )![1];
    expect([...pages.entries.keys()]).toEqual(
      expect.arrayContaining([
        "http://app.test/tasks",
        "http://app.test/tasks?__sw=rsc",
      ]),
    );
  });

  it("serves static files from the cache after the first load", async () => {
    await worker.request("/_next/static/chunks/app.js");
    worker.fetchMock.mockClear();
    const response = await worker.request("/_next/static/chunks/app.js");
    expect(await response!.text()).toBe("live:/_next/static/chunks/app.js");
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });

  it("never touches requests that change data or the API", async () => {
    expect(
      await worker.request("/reservations/new", { method: "POST" }),
    ).toBeNull();
    expect(await worker.request("/api/health")).toBeNull();
    expect(await worker.request("/api/auth/get-session")).toBeNull();
  });

  it("removes saved pages when asked, but keeps the offline page", async () => {
    await worker.request("/reservations", { mode: "navigate" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await worker.message({ type: "clear-user-data" });
    worker.network.online = false;
    const gone = await worker.request("/reservations", { mode: "navigate" });
    expect(await gone!.text()).toBe("offline page");
  });
});
