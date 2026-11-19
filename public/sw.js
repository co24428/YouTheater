// Minimal service worker so YouTheater can be installed as an app.
// It caches nothing and doesn't touch requests, so you always see your latest archive.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
