const CACHE_NAME = "rajasthan-pyq-master-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png"
];

// Service Worker install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
        } catch (error) {
          console.warn("Cache file skipped:", url, error);
        }
      }
    })
  );

  self.skipWaiting();
});

// पुराने Cache हटाना
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );

  self.clients.claim();
});

// Network और Cache संभालना
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // केवल GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // बाहरी वेबसाइट और Firebase requests को Cache नहीं करना
  if (url.origin !== self.location.origin) return;

  // HTML navigation: पहले Network, फिर Cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put("/index.html", copy);
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match("/index.html")
          ) || Response.error();
        })
    );

    return;
  }

  // CSS, JS, images और अन्य same-origin assets
  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      try {
        const response = await fetch(request);

        if (response.ok && response.type === "basic") {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
        }

        return response;
      } catch (error) {
        return new Response("आप अभी Offline हैं।", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    })
  );
});
