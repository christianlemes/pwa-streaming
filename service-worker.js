/* =========================================================
   Service Worker - StreamLite PWA
   Estratégias:
   - Pré-cache de shell estático (install)
   - Cache-first para estáticos
   - Stale-While-Revalidate para imagens
   - Fallback offline para navegação
========================================================= */

const CACHE_STATIC = "streamlite-static-v2";
const CACHE_IMAGES = "streamlite-images-v2";

// Arquivos essenciais para funcionar offline
const PRECACHE = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // CDNs do Bootstrap podem falhar offline; o app continua funcionando,
// mas você pode optar por self-host futuramente.
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![CACHE_STATIC, CACHE_IMAGES].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Navegação: tentar rede, fallback cache, depois offline básico
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          return network;
        } catch {
          const cache = await caches.match("/index.html");
          return cache || new Response("<h1>Offline</h1>", { headers: { "Content-Type": "text/html" } });
        }
      })()
    );
    return;
  }

  // Imagens: Stale-While-Revalidate
  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req, CACHE_IMAGES));
    return;
  }

  // Demais recursos: Cache-first
  event.respondWith(cacheFirst(req, CACHE_STATIC));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  return cached || fetchAndPut(cache, request);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetchAndPut(cache, request);
}