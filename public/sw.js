/*
 * Hostayo service worker: lets the app open and be read without a network.
 *
 * - Static files (scripts, styles, fonts, logos) are cached the first time they
 *   load and served from the cache after that.
 * - Pages and their data are fetched from the network first, so people always
 *   see fresh numbers when connected. If the network is down or too slow, the
 *   last copy of that page is shown instead, and "/offline" if there is none.
 * - Nothing that changes data (POST etc.) and nothing under /api is cached.
 *
 * Pages hold private business data, so they are removed from this device when
 * someone signs out or a different person signs in (see clearOfflineData in
 * src/lib/offline/clear.ts, which sends the "clear-user-data" message).
 */

const VERSION = "v1";
const STATIC_CACHE = `hostayo-static-${VERSION}`;
const PAGES_CACHE = `hostayo-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
// How long to wait for the network before showing the saved copy. Hotel and
// island connections often hang rather than fail.
const NETWORK_TIMEOUT_MS = 4000;
const MAX_PAGES = 60;

const STATIC_PREFIXES = [
  "/_next/static/",
  "/platforms/",
  "/brand/",
  "/payment-methods/",
  "/maps/",
  "/icon-",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("hostayo-") &&
                key !== STATIC_CACHE &&
                key !== PAGES_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear-user-data") {
    event.waitUntil(
      caches
        .delete(PAGES_CACHE)
        .then(() => caches.open(PAGES_CACHE))
        .then((cache) => cache.add(OFFLINE_URL)),
    );
  }
});

function isStatic(url) {
  return STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function trimPages(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_PAGES;
  for (let i = 0; i < extra; i += 1) {
    if (new URL(keys[i].url).pathname !== OFFLINE_URL) {
      await cache.delete(keys[i]);
    }
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// HTML and the data the app router fetches for in-app navigation share a URL, so
// the data request is stored under its own key.
function pageKey(request) {
  if (request.headers.get("RSC")) {
    const url = new URL(request.url);
    url.searchParams.set("__sw", "rsc");
    return new Request(url.toString());
  }
  return request;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  const key = pageKey(request);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    // Only keep good answers. A redirect to the sign-in page must not replace
    // a saved page, and an error page is no use offline.
    if (response.ok && !response.redirected) {
      cache.put(key, response.clone()).then(() => trimPages(cache));
    }
    return response;
  } catch {
    const saved = await cache.match(key);
    if (saved) return saved;
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/sw.js") return;

  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate" || request.headers.get("RSC")) {
    event.respondWith(networkFirstPage(request));
  }
});
