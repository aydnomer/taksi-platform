// Çevrimdışı yedek: önce internetten al, olmazsa son kaydedilen sürümü göster.
// Böylece site güncellenince yolcu hep yenisini görür, internet yoksa sayfa yine açılır.
const ONBELLEK = "taksicim-__SURUM__";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((adlar) => Promise.all(adlar.filter((a) => a !== ONBELLEK).map((a) => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const istek = e.request;
  if (istek.method !== "GET") return;
  const url = new URL(istek.url);
  if (url.origin !== self.location.origin && !url.hostname.endsWith("gstatic.com") && !url.hostname.endsWith("googleapis.com")) return;
  if (url.pathname.includes("/rest/v1/")) return; // canlı durum asla önbellekten gelmesin
  e.respondWith(
    fetch(istek)
      .then((cevap) => {
        if (cevap && (cevap.ok || cevap.type === "opaque")) {
          const kopya = cevap.clone();
          caches.open(ONBELLEK).then((c) => c.put(istek, kopya));
        }
        return cevap;
      })
      .catch(() => caches.match(istek).then((c) => c || caches.match(new URL("./", self.location).href)))
  );
});
