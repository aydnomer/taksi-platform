// Çevrimdışı yedek: önce internetten al, olmazsa telefondaki son sürümü göster.
// Site güncellenince yolcu hep yenisini görür; internet yokken de şoförün sayfası açılır, numara aranır.
const ONBELLEK = "taksicim-6711f06a";
const SAYFA = "taksicim-sayfalar"; // sürümden bağımsız: yeni sürüm gelse de son açılan sayfalar kalır

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    // Bir önceki sürümün dosyaları kalsın: telefondaki eski sayfa internet yokken de düzgün açılsın
    caches.keys().then((adlar) => {
      const eski = adlar.filter((a) => a !== ONBELLEK && a !== SAYFA);
      return Promise.all(eski.slice(0, -1).map((a) => caches.delete(a)));
    })
      .then(() => self.clients.claim())
  );
});

// Sayfa açılınca kendi dosyalarını önceden kaydetmemizi ister
self.addEventListener("message", (e) => {
  const liste = e.data && e.data.onbellek;
  if (!Array.isArray(liste)) return;
  e.waitUntil(Promise.all(liste.map((u) => {
    const adres = new URL(u, self.location).href;
    if (new URL(adres).origin !== self.location.origin) return null;
    const sayfaMi = !/\.[a-z0-9]+$/i.test(new URL(adres).pathname);
    return fetch(adres, { cache: "no-cache" }).then((c) => c.ok && caches.open(sayfaMi ? SAYFA : ONBELLEK).then((o) => o.put(sayfaMi ? temiz(adres) : adres, c))).catch(() => null);
  })));
});

// ?k=q gibi sayaç ekleri farklı sayfa sayılmasın
function temiz(u) { const x = new URL(u); x.search = ""; x.hash = ""; return x.href; }

const CEVRIMDISI = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>İnternet yok</title>' +
  '<body style="font:16px/1.5 system-ui,sans-serif;background:#0d0e10;color:#f3f3f0;padding:40px 20px;text-align:center">' +
  '<p style="font-size:22px;font-weight:700">İnternet yok</p><p>Bağlantı gelince sayfa açılır. Şoförünü rehberinden de arayabilirsin.</p>' +
  '<button onclick="location.reload()" style="margin-top:16px;min-height:52px;padding:0 24px;border:0;border-radius:14px;background:#ffc20e;font:700 16px system-ui">Tekrar dene</button></body>';

self.addEventListener("fetch", (e) => {
  const istek = e.request;
  if (istek.method !== "GET") return;
  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) return; // Supabase ve dış adresler: tarayıcı kendi halleder
  if (istek.mode === "navigate") {
    e.respondWith(
      fetch(istek, { cache: "no-cache" })
        .then((cevap) => {
          if (cevap.ok) { const k = cevap.clone(); caches.open(SAYFA).then((c) => c.put(temiz(istek.url), k)); }
          return cevap;
        })
        .catch(() => caches.open(SAYFA).then((c) => c.match(temiz(istek.url)))
          .then((c) => c || new Response(CEVRIMDISI, { headers: { "content-type": "text/html; charset=utf-8" } })))
    );
    return;
  }
  e.respondWith(
    fetch(istek)
      .then((cevap) => {
        if (cevap.ok) { const k = cevap.clone(); caches.open(ONBELLEK).then((c) => c.put(istek, k)); }
        return cevap;
      })
      .catch(() => caches.match(istek).then((c) => c || caches.match(istek, { ignoreSearch: true })))
  );
});
