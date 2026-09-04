const CACHE_NAME = "jeux-cache-v6";

const PRECACHE_URLS = [
  "/index.html",
  "/manifest.json",
  "/home.css",
  "/home.js",
  "/shared/style.css",
  "/shared/theme.js",
  "/shared/supabase-config.js",
  "/shared/supabase-client.js",
  "/shared/auth-widget.js",
  "/shared/auth-widget.css",
  "/sudoku/index.html",
  "/sudoku/style.css",
  "/sudoku/script.js",
  "/pendu/index.html",
  "/pendu/style.css",
  "/pendu/script.js",
  "/memory/index.html",
  "/memory/style.css",
  "/memory/script.js",
  "/mastermind/index.html",
  "/mastermind/style.css",
  "/mastermind/script.js",
  "/musique/index.html",
  "/musique/style.css",
  "/musique/script.js",
  "/profil/index.html",
  "/profil/style.css",
  "/profil/script.js",
  "/defis/index.html",
  "/defis/style.css",
  "/defis/script.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // laisse passer Supabase/CDN

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
