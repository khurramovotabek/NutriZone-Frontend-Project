/*
 * NutriZone service worker -- makes the installed app open fast and fail gracefully, without ever serving a stale
 * price, stock count, cart or login state.
 *
 *  - Pages (navigations): always from the network (navigation preload keeps it as fast as without a worker). Only
 *    when the network is gone does the offline page answer. HTML is never cached: it carries the shopper's cart,
 *    session and live prices.
 *  - /_next/static/*: content-hashed, immutable -> cache first.
 *  - /_next/image, /pwa/*, icons: stale-while-revalidate, capped.
 *  - Everything else -- the API, other origins (map tiles, geocoder, payment pages, Telegram), POST requests, the
 *    Telegram Mini App and admin -- is left to the browser untouched.
 *
 * Bump VERSION when this file's caching rules change; old caches are dropped on activate.
 */
const VERSION = "v1";
const STATIC_CACHE = `nz-static-${VERSION}`;
const MEDIA_CACHE = `nz-media-${VERSION}`;
const OFFLINE_CACHE = `nz-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MEDIA_MAX_ENTRIES = 220;
const STATIC_MAX_ENTRIES = 400;
const PRECACHE = [OFFLINE_URL, "/pwa/icon-192.png", "/pwa/maskable-192.png"];
const BYPASS_PREFIXES = ["/api/", "/django-admin", "/admin", "/tg", "/auto-login", "/r/", "/static/", "/media/", "/_next/webpack-hmr", "/__nextjs"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, MEDIA_CACHE, OFFLINE_CACHE]);
      for (const key of await caches.keys()) if (key.startsWith("nz-") && !keep.has(key)) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone()).then(() => trim(STATIC_CACHE, STATIC_MAX_ENTRIES)).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(MEDIA_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone()).then(() => trim(MEDIA_CACHE, MEDIA_MAX_ENTRIES)).catch(() => {});
      }
      return response;
    })
    .catch(() => hit || Response.error());
  if (hit) {
    event.waitUntil(network.then(() => undefined));
    return hit;
  }
  return network;
}

async function networkFirstPage(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
    return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // tiles, geocoder, API host, payments: browser default
  if (BYPASS_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
    return;
  }
  // React Server Component payloads (client-side navigation) are live data, like pages
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/pwa/") || /\.(?:png|jpe?g|webp|avif|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
