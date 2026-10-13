# Code review: taksi-platform (static PWA + Supabase)

> Bu notlar uygulamanın inceleme anındaki halini anlatır. Satır numaraları ve ekran görüntüsü adları o ana aittir; neyin yapıldığı `docs/INCELEME.md` içinde.

Reviewed: `src/app.js`, `src/style.css`, `src/sw.js`, `scripts/build.mjs`, `supabase/kurulum.sql`, `data/site.json`, `.github/workflows/yayinla.yml`, built `dist/` (served on :5173).
I did not edit any repo files. The repro scripts are in `scratchpad/inceleme/kod/` (t1–t9.mjs). They use these servers and copies:
- copies of `dist` on ports 5197–5199,
- a "Supabase mode" copy (`supa/`), where `supabaseUrl` points to a fake host and the REST calls are mocked with Playwright `route` plus `page.clock`,
- a repo copy (`repo/`) used to run the build against broken data.

Every finding below is labelled **[verified]**, meaning it was reproduced in Chromium or Node, or **[code]**, meaning it was confirmed by reading the code and is deterministic.

---

## P1: fix before real users and drivers install

### P1-1. All PWAs share one app id, so per-driver apps are impossible [verified]
`scripts/build.mjs:100` sets `id: "./"`. Per the Web App Manifest spec, `id` is resolved against the **origin of start_url**, not against the manifest URL. CDP `Page.getAppId` returns this for every page (t1.mjs):
```
/            appId http://localhost:5173/   (recommendedId /)
/t/ali/      appId http://localhost:5173/   (recommendedId /t/ali/)
/t/hasan/    appId http://localhost:5173/
/d/ornek-durak/ appId http://localhost:5173/
```
In production every app is `https://aydnomer.github.io/`, which is the same id as any other PWA at that user's github.io origin. **Failure:** a passenger installs "Ali Taksi" and later scans Hasan's plexi. Chrome or Android treats Hasan as the *already installed* app. `beforeinstallprompt` doesn't fire, "Open in app" launches Ali's app, or the existing install is updated with Hasan's name and icon. Installing the Taksicim demo first blocks every driver install.
**Fix:** omit `id`, so it defaults to start_url and is unique per folder, or make it an explicit path:
```js
function manifest({ ad, kisa, aciklama, yol = "" }) {
  const kok = new URL(siteUrl + "/").pathname;            // "/taksi-platform/"
  return JSON.stringify({ id: kok + (yol ? yol + "/" : ""), start_url: "./", scope: "./", ... });
}
```
Pass `yol` for `d/<kod>` and `t/<kod>`. Do it now, because a changed id later strands existing installs.

### P1-2. 4-digit PINs can be brute-forced through public RPCs, with no rate limit [code]
`kurulum.sql:54-57,73,83-86,100,124-146`: `pin_kontrol`, `durak_pin_kontrol`, `durum_guncelle` and `olay_listesi` are callable by `anon` with the public anon key, which ships in `veri.js`. They return a clean true/false oracle. They keep no attempt counter, no lockout and no delay. The driver PIN is 4 digits (`app.js:899` placeholder "4 haneli PIN"), so there are 10,000 combinations. At bcrypt cost 6 that's a few ms each, so it falls in minutes. **Failure:** a competitor flips every driver to "kapali" or "yolcuda" (passengers get sent elsewhere) or reads all statistics. The admin "hepsi" PIN has the same exposure.
**Fix:** use a server-side attempt table checked inside every PIN function, plus longer PINs:
```sql
create table if not exists public.pin_deneme (anahtar text primary key, hata int not null default 0, kilit timestamptz);
alter table public.pin_deneme enable row level security;           -- no policies
create or replace function public._pin_ok(p_anahtar text, p_dogru boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare d public.pin_deneme;
begin
  select * into d from public.pin_deneme where anahtar = p_anahtar for update;
  if d.kilit is not null and d.kilit > now() then return false; end if;
  if p_dogru then delete from public.pin_deneme where anahtar = p_anahtar; return true; end if;
  insert into public.pin_deneme(anahtar, hata) values (p_anahtar, 1)
    on conflict (anahtar) do update set hata = pin_deneme.hata + 1,
      kilit = case when pin_deneme.hata + 1 >= 5 then now() + make_interval(mins => least(15 * 2 ^ (pin_deneme.hata - 4), 1440)::int) end;
  return false;
end $$;
-- pin_kontrol: return public._pin_ok('sofor:'||p_kod, exists(select 1 from public.pinler where kod=p_kod and pin_hash = extensions.crypt(p_pin, pin_hash)));
```
Key the counter by `kod` plus the client IP, taken from `current_setting('request.headers', true)::json->>'x-forwarded-for'`, so an attacker can't lock a real driver out. Use 6-digit driver and durak PINs and an alphanumeric admin PIN (see P2-10). Also `revoke execute on function public._pin_ok from anon, public;`.

### P1-3. A transient fetch failure wipes all live status, which breaks the core redirect feature [verified]
`app.js:166`: `.catch(function () { DURUM = {}; })`. One failed 30 s poll, common on mobile, marks every driver "bilinmiyor". `hedefSec` (`app.js:296`) treats "bilinmiyor" as callable. **Repro (t4.mjs #5):** Ali is `yolcuda` with backup Mehmet `musait`. One aborted poll turns the badge from "Yolcuda · ~30 dk" to "Durumu bilinmiyor", and the main CTA switches from "Mehmet'i Çağır" to "Taksi Çağır · Ali". The passenger calls the busy driver, which is exactly what the product promises to prevent.
**Fix:** keep the last known state and rely on `eskiDurumSaat` for staleness:
```js
.catch(function () { /* keep previous DURUM/YEDEK; mark offline */ CEVRIMDISI = true; });
```
Optionally show a small "bağlantı yok, son durum hh:mm" note.

### P1-4. The 30 s refresh re-renders the whole page: it closes dialogs, wipes typed PINs, resets scroll and focus, and re-fetches all statistics [verified]
`app.js:1450-1453`: `Depo.yukle().then(rota)`. `rota()` calls `kapat()` and replaces `#app.innerHTML`. The guard checks `.perde` only *before* the fetch, and it excludes only `view === "panel"`. Reproduced in Supabase mode (t4.mjs):
1. **Durak panel login** (`/d/x/yonetim/`): the PIN typed into `#yn-pin` is `""` after 30 s and focus is on BODY. The rapor login behaves the same way.
2. **/rapor/**: scrollY goes from 1500 to 0, open `<details>` collapse from 1 to 0, and the full `olay_listesi` (all events) is re-downloaded every 30 s.
3. **Durak panel, logged in**: after 5 minutes it has made 11 `durumlar` and **22 `olay_listesi`** calls, two full stats downloads per 30 s per open tab. This is server load and data cost.
4. **Durak site**: an open FAQ `<details>` collapses and keyboard focus is lost (BODY).
5. **Race**: a dialog opened while the poll is in flight (the "Eşyamı bildir" form, with half-typed text) is closed when the response lands (`perde` count goes 1 → 0).

**Fix:** refresh data, not the page, and only where it's useful:
```js
var CANLI = { sofor: 1, durak: 1 };                 // pages that show live status
function tazele() {
  if (!SUPA || document.hidden || !CANLI[P.view]) return;
  var once = JSON.stringify([DURUM, YEDEK]);
  Depo.yukle().then(function () {
    if (JSON.stringify([DURUM, YEDEK]) === once) return;       // nothing changed
    if (document.querySelector(".perde") || app.contains(document.activeElement) && document.activeElement !== document.body) return;
    var y = scrollY, acik = [].map.call(app.querySelectorAll("details"), function (d) { return d.open; });
    rotaCiz();                                      // rota() without kapat()
    app.querySelectorAll("details").forEach(function (d, i) { d.open = !!acik[i]; });
    scrollTo(0, y);
  });
}
setInterval(tazele, 30000);
document.addEventListener("visibilitychange", function () { if (!document.hidden) tazele(); });
```
For yonetim, update only the status rows and counts in place, and fetch `olay_listesi` once per page load or on demand. Never auto-refresh `/rapor/`.

### P1-5. The service worker gives no working offline launch for installed apps, and its fallback is wrong [verified]
`src/sw.js:5,20-28`. There's no precache. Responses are keyed with their query string, and the fallback serves the root page (t3.mjs, with the server killed to go offline):
- A. One QR visit (`/t/ali/?k=q`), then opening start_url `/t/ali/` offline gives **ERR_FAILED**. The first page load happens before the SW controls the page, so nothing is cached.
- B. Two QR visits, then offline: still **ERR_FAILED**. The page is cached as `/t/ali/?k=q`, but start_url is `/t/ali/`, a different key, and the `./` fallback isn't cached either.
- D. If `/` was cached, offline `/t/ali/` serves the **Taksicim marketing page** (title "Taksicim · …"). Its relative `./assets/...` URLs resolve under `/t/ali/assets/`, so it renders without JS or CSS (no h1).

**Failure:** a passenger opens Ali's home-screen app in a dead zone and sees the browser error page or the wrong app. The phone number (`tel:`) needs no data, so this is avoidable.
**Fix:**
```js
// sw.js
self.addEventListener("message", (e) => { if (e.data && e.data.onbellek) e.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll(e.data.onbellek))); });
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r, { cache: "no-cache" }).then((res) => {
      if (res.ok) { const u = new URL(r.url); u.search = ""; u.hash = ""; const k = res.clone(); caches.open(ONBELLEK).then((c) => c.put(u.href, k)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then((c) => c || new Response("<meta charset=utf-8><p>İnternet yok. Tekrar dene.</p>", { headers: { "content-type": "text/html; charset=utf-8" } }))));
    return;
  }
  /* assets: keep network-first (or stale-while-revalidate for ?v= assets) */
});
// app.js, after register:
navigator.serviceWorker.ready.then(function (reg) {
  var a = [location.pathname, P.base + "assets/style.css?v=" + V, P.base + "assets/app.js?v=" + V, P.base + "assets/veri.js?v=" + V];
  reg.active && reg.active.postMessage({ onbellek: a });
});
```
Inject `V`, the build hash `surum`, through `window.PAGE`. Note that `activate` deletes the whole previous cache on every deploy (`sw.js:6-10`), so carry the current page over, or accept that offline needs one online visit after each deploy.

---

## P2: important

### P2-1. Driver panel, durak panel and rapor install as the Taksicim marketing app [verified]
`build.mjs:77`: pages without `manifest:true` link the root manifest (`start_url "./"`). The CDP check on `/panel/` and `/d/x/yonetim/` returns the root manifest. **Failure:** a driver uses "Install app" on `/panel/` and the icon opens the marketing page, not the panel. That defeats the NFC and quick-status workflow. **Fix:** emit `panel/manifest.webmanifest` (name "Şoför Paneli", `start_url:"./"`, `scope:"./"`, unique id) and `d/<kod>/yonetim/manifest.webmanifest`, and set `manifest:true` for those pages.

### P2-2. Broken icons: the apple-touch-icon reads "TAKS", and the maskable icon spills out of its plate [verified]
`src/ikon-180.png` (used by iOS home screens, `build.mjs:78`) shows **"TAKS"** because the "İ" is clipped off the plate. In `src/ikon-512-maskable.png` the "İ" overflows the yellow plate, and the checker band (y≈430–512) is outside the 80 % safe-zone circle (radius 205 around 256,256), so it gets cropped by circular masks. **Fix:** regenerate the icons with the text inside the plate and keep all content in the central 80 % for the maskable one. Consider a per-durak colour (`renk`) icon too, since every driver app currently has an identical icon, which makes them hard to tell apart on the home screen.

### P2-3. No og:image or og:url: WhatsApp shares show no preview image [code]
`build.mjs:72-76` emits only og:type, og:title, og:description and og:locale. Sharing a driver or durak link on WhatsApp gives a text-only card. **Fix**, in `sayfa()`:
```html
<link rel="canonical" href="${siteUrl}/${yol ? yol + "/" : ""}">
<meta property="og:url" content="${siteUrl}/${yol ? yol + "/" : ""}">
<meta property="og:site_name" content="${esc(M.ad)}">
<meta property="og:image" content="${siteUrl}/assets/paylas/${kodOrDefault}.png">   <!-- absolute, 1200x630, JPG/PNG < 300 KB -->
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```
Generate the images at build time: an SVG template (name, plate, durak colour) rendered to PNG with `@resvg/resvg-js` or `sharp`. At minimum, ship one static `paylas.jpg`.

### P2-4. No structured data, no noindex on private pages, no sitemap [code]
`grep og:image|canonical|ld+json|robots` finds 0 matches in `dist/t/ali`, `dist/panel` and `dist/rapor`. There's no `robots.txt` or `sitemap.xml`.
- Add `<meta name="robots" content="noindex,nofollow">` to `panel`, `rapor`, `d/*/yonetim`, `etiket`, `404`, and any `demo:true` page. A `robots.txt` at `github.io/taksi-platform/` is ignored because robots.txt only works at the host root.
- Put durak JSON-LD into the static HTML, using `LocalBusiness` with name, telephone, address, `geo`, `openingHours: "Mo-Su 00:00-23:59"` (from `acik:"7/24"`), url and image. **Don't** mark up `aggregateRating` copied from Google (`d.google.puan`). It's self-serving or third-party, Google ignores it, and it can trigger a manual action. Add `"makesOffer"`/`"hasOfferCatalog"` for `sabitFiyatlar` if wanted.
- Generate `dist/sitemap.xml` (tanıtım, durak pages, non-demo driver pages) and submit it in Search Console (URL-prefix property). Add a `robots.txt` with a `Sitemap:` line when `alanAdi` is used.
- Decide deliberately whether personal driver pages (full name and mobile number) should be indexed at all. `noindex` may be the privacy-friendlier default.

### P2-5. Day bucketing in stats uses UTC, so Turkish calls between 00:00 and 03:00 land on the previous day [verified]
`app.js:1036` and `app.js:1082` use `new Date(t).toISOString().slice(0,10)`. **Repro (t8.mjs, TZ Europe/Istanbul):** a call at 01:30 local on 13.10 is charted as **"12.10: 1 çağrı"**. Late-night trips are a big share of taxi work. `cihazGun` uses the same key, so "Tekrar gelen yolcu" also counts one evening visit spanning 03:00 local as two days. `donemAraligi` (`app.js:1014-1020`) uses the *device* timezone, which is inconsistent with the above.
**Fix:**
```js
var GUN = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" });
function gunAnahtar(t) { return GUN.format(new Date(t)); }      // "2026-10-13"
// sayilar: var gun = gunAnahtar(o.zaman);   gunGrafik: var t = gunAnahtar(Date.now() - i * 864e5);
// donemAraligi: Turkey is fixed UTC+3 → ayBasi = Date.UTC(y, m, 1) - 3 * 3600e3 (y/m taken from GUN parts)
```

### P2-6. Anonymous event insert: unlimited spam, backdating, and prototype pollution in the stats code [verified]
`kurulum.sql:46-48`. Anyone with the anon key can `POST /rest/v1/olaylar` with any `kod`, `tur`, `cihaz`, **and any `zaman`**, because the policy doesn't constrain `zaman` and the column is insertable. **Failures:**
- (a) Inflated or fabricated sales numbers for any customer, and a DB filled to its quota.
- (b) Backdated or future events. Future events would show in "son 7 gün" forever.
- (c) Verified in demo mode (t8.mjs): an event with `cihaz:"__proto__"` executes `cihazGun["__proto__"][gun] = 1` (`app.js:1042`) and pollutes `Object.prototype["2026-10-10"]`. Every `r.gun` then inherits it, and the 14-day chart shows a phantom call. An event with `kod:"toString"` passes `ic[o.kod]` (`app.js:264`, `1029`), so it's counted as a call for **every** driver: Ali showed "Toplam çağrı 1" with zero real calls. In Supabase mode the server filters by kod for sofor and durak, but `/rapor/`'s per-customer breakdown filters client-side, and `cihaz` pollution works everywhere.

**Fix (SQL):**
```sql
revoke insert on public.olaylar from anon;
grant insert (kod, tur, hedef, kaynak, cihaz) on public.olaylar to anon;  -- zaman always default now()
-- better: drop the insert policy and go through an RPC that validates kod/hedef against durumlar (or 'd:'||durak),
-- kaynak in ('nfc','qr','uygulama','durak','link'), cihaz ~ '^[a-z0-9]{6,20}$', and rate-limits per cihaz (e.g. 30/hour).
```
**Fix (JS):** use `Object.create(null)` for `ic` (`app.js:148`), `plekCihaz`/`cihazGun` (`1028`) and `r.gun` (`1027`), or use `Map`s.

### P2-7. PINs, including the admin PIN, are stored in plaintext in localStorage, forever [code]
`app.js:909` `ls("taksicim_giris",{kod,pin})`, `803` durak PIN, `1177` admin PIN. Any XSS, shared or lost phone, or browser-sync backup reveals the PIN, and the PIN *is* the credential, never rotated. Every repo published under `aydnomer.github.io/*` also shares this origin's localStorage. **Fix:** exchange the PIN for a revocable session token. Use an RPC `oturum_ac(kod,pin)` that returns 32 random bytes, stores `sha256(token)` with an expiry in an `oturumlar` table, and accepts `p_token` in `durum_guncelle` and `olay_listesi`. Keep only the token client-side. For the admin, use `sessionStorage` or re-prompt. This keeps the "NFC tag without PIN" UX.

### P2-8. Missing geolocation sends a fake "my location" [code]
`app.js:408-410`: `if (HASH || !navigator.geolocation)` sends the durak's coordinates, or the hard-coded `38.6748,39.2225` (Elazığ centre), as **"Konumum: …"**. In a real (non-HASH) page, wherever the API is unavailable (some WebViews, an insecure context), the driver receives a wrong pickup location presented as the passenger's. **Fix:** `if (HASH) return gonder(demoLat, demoLng); if (!navigator.geolocation) return gonder(null, null);`, which falls back to the existing "Adresim:" text.

### P2-9. `navigator.share` is called after an async geolocation, so the user activation has expired [code]
`app.js:643-648`: `yolculukPaylas` calls `getCurrentPosition` (up to 8 s, plus the permission prompt), then `navigator.share()`. Safari requires transient activation, and Chrome's expires after about 5 s. The resulting `NotAllowedError` is swallowed by `.catch(function(){})`, so the "share my trip with family" safety button silently does nothing, mostly on iPhone. **Fix:** on rejection, fall back to WhatsApp: `navigator.share({text:m}).catch(function(e){ if (e.name !== "AbortError") location.href = "https://wa.me/?text=" + encodeURIComponent(m); })`. Better still, show a sheet with a "Paylaş" button so the share gets a fresh gesture.

### P2-10. Admin PIN input `maxlength="8"` and `inputmode="numeric"` contradict the documented long PIN [code]
`app.js:1168` vs `kurulum.sql:119`, which says `crypt('BURAYA-UZUN-PIN', …)`, a 15-character alphanumeric example. **Failure:** the admin can't type the PIN the setup told them to create, so `/rapor/` is unusable. **Fix:** drop `maxlength`, use `type="password" autocomplete="current-password"`, and drop `inputmode`.

### P2-11. Network errors masquerade as data or as "wrong PIN" [verified]
- `app.js:219`: `olaylar()` maps every error to `[]`. **Repro (t4.mjs #6):** with the network down, entering a *wrong* admin PIN logs in and stores `{"pin":"wrong"}`, then shows all-zero statistics. Durak and driver stats likewise show "0" instead of an error.
- `app.js:173-174,198-199`: any non-`true` response, including a PostgREST 400/500 error object, becomes "PIN yanlış". `durak_durum_guncelle` returns `false` when `durumlar.durak` is out of sync with `site.json`, and that also shows "PIN yanlış".
- `app.js:184,191`: being offline at login shows "PIN yanlış".

**Fix:** distinguish the outcomes: `if (!r.ok) throw new Error("Sunucuya ulaşılamadı (" + r.status + ")")`, and return `{hata:true}` from `olaylar` so callers can render "Bağlantı yok, tekrar dene".

### P2-12. Build validation is far too weak, and bad data ships blank pages and broken printed QR codes [verified]
`build.mjs:183-194` checks only driver kod format and uniqueness, durak existence and backup existence. With a mutated `site.json` (t9.mjs) the build **succeeded** and produced:
- a durak without `konum`: the page is blank, with `TypeError: Cannot read properties of undefined (reading 'lat')` from `app.js:744`;
- a driver without `telefon`: `href="tel:undefined"` in the static HTML (`build.mjs:159`) and an empty CTA;
- `googleYorum: "javascript:alert(1)"` was accepted and rendered as a link (`app.js:587`, where `esc` doesn't stop schemes);
- `renk: 'x" onload="alert(1)'` produced `<html lang="tr" data-renk="x" onload="alert(1)">` (`build.mjs:66`, unescaped);
- a duplicate durak kod and a driver listing itself as backup were both accepted;
- `siteUrl` without a scheme generated all QR codes for `aydnomer.github.io/...` (no `https://`) **before** crashing at `build.mjs:170`. Those QR codes get printed on plexi.

**Fix:** extend `kontrol()`:
```js
const URLOK = (u) => /^https:\/\/[^\s"'<>]+$/.test(u || "");
const TEL = (t) => /^\+90\d{10}$/.test(t || "");
if (!URLOK(site.marka.siteUrl)) hata.push("marka.siteUrl https:// ile başlamalı");
if (site.marka.alanAdi && new URL(site.marka.siteUrl).host !== site.marka.alanAdi) hata.push("siteUrl alanAdi ile aynı host olmalı");
const dk = new Set();
for (const d of site.duraklar) {
  if (!/^[a-z0-9-]+$/.test(d.kod) || dk.has(d.kod)) hata.push(`durak kodu hatalı/tekrar: ${d.kod}`); dk.add(d.kod);
  if (!TEL(d.telefon)) hata.push(`${d.ad}: telefon +90XXXXXXXXXX olmalı`);
  if (!d.konum || !isFinite(d.konum.lat) || !isFinite(d.konum.lng)) hata.push(`${d.ad}: konum {lat,lng} eksik`);
  if (d.renk && !["sari","turuncu","yesil","mavi"].includes(d.renk)) hata.push(`${d.ad}: renk geçersiz`);
  if (d.googleYorum && !URLOK(d.googleYorum)) hata.push(`${d.ad}: googleYorum https olmalı`);
}
for (const s of site.soforler) {
  for (const f of ["ad","plaka","arac"]) if (!s[f]) hata.push(`${s.kod}: ${f} eksik`);
  if (!TEL(s.telefon)) hata.push(`${s.kod}: telefon hatalı`);
  if ((s.yedekler||[]).includes(s.kod)) hata.push(`${s.kod}: kendini yedek seçmiş`);
  if (s.googleYorum && !URLOK(s.googleYorum)) hata.push(`${s.kod}: googleYorum https olmalı`);
}
```
Also `esc()` every interpolation in `sayfa()`, including `renk` and `tel:` hrefs, and run `kontrol` before any QR generation, which it already does once the URL check is added.

### P2-13. iOS standalone: content sits under the status bar [code]
`build.mjs:69,82` use `viewport-fit=cover` with `black-translucent`, so in a home-screen app the page starts at y=0 under the clock and notch. `.sf-ust` (`style.css:185`) has only `padding-block:14px`, and `.pn` (`554`) and `.hizli` have no top inset. Only `.dk-nav` and `.tn-nav` offset `top` (and don't pad). **Failure:** in the installed driver or passenger app, the durak name and the "Ana ekrana" button overlap the status bar. **Fix:** `.sf-ust, .pn, .hizli { padding-top: max(14px, env(safe-area-inset-top)); }` and `.dk-nav, .tn-nav { top: 0; padding-top: env(safe-area-inset-top); }`.

### P2-14. Contrast failures: light theme status badges and the focus ring [verified]
t7.mjs (WCAG ratios, text on `--yuzey-2` badges):

| Theme | Element | Contrast | Needed |
|---|---|---|---|
| Light | "Müsait" `#0f9a52` | 3.16 | 4.5 |
| Light | "Yolcuda" `#c26f00` | 3.27 | 4.5 |
| Light | "Hizmet dışı" `#8b8e93` | 2.85 | 4.5 |
| Light | "CANLI" | 3.64 | 4.5 |
| Dark | "Hizmet dışı" `#7d8187` on `#202328` | 4.02 | 4.5 |
| Light | focus ring `#ffc20e` on `#f2f2ee` | 1.44 | 3 (WCAG 1.4.11) |

These badges are the most important information on the page.
**Fix:** add text-only tokens, because `--yesil` and `--amber` are also button backgrounds:
- light: `--yesil-metin:#0b7a40` (4.71 on #f0efe9), `--amber-metin:#965500` (5.07), `--gri-metin:#696c71` (4.58);
- dark: `--gri-metin:#9aa0a6`;
- `.durum.musait{color:var(--yesil-metin)}` and so on;
- focus: `:focus-visible{outline:3px solid var(--metin); box-shadow:0 0 0 6px var(--sari);}`.

### P2-15. Dialogs: no focus trap, no label, no focus restore, background not inert [verified]
`app.js:305-317` (t8.mjs): `role=dialog aria-modal=true` has no `aria-labelledby`. Focus leaves the sheet on the **first Tab** (inside: `true,false,false…`). `#app` is not `inert`. `kapat()` doesn't return focus to the opener. The initial focus targets the first `button, a`, which skips the `<select>`/`<input>` in the "Eşya" form. **Fix:**
```js
function pencere(html) {
  kapat(); var geri = document.activeElement;
  ... p.innerHTML = '<div class="pencere" role="dialog" aria-modal="true" aria-labelledby="pn-baslik">...';
  var h3 = p.querySelector("h3"); if (h3) h3.id = "pn-baslik";
  app.inert = true;
  p._geri = geri;
  p.addEventListener("keydown", function (e) { if (e.key !== "Tab") return;
    var f = p.querySelectorAll("button:not([disabled]),a[href],input,select,textarea"); var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } });
  (p.querySelector("input,select,button,a")).focus({ preventScroll: true });
}
function kapat() { var p = document.querySelector(".perde"); if (!p) return; app.inert = false; p.remove(); if (p._geri && p._geri.isConnected) p._geri.focus(); }
```
Also, `aria-label` on plain `<div class="telefon">` and `<div class="pleksi">` (`app.js:1282`, `1324`) is ignored without a role. Use `role="img"` or `role="group"`.

### P2-16. Panel status is never refreshed [code]
`app.js:1451` excludes `view === "panel"` from polling, and the storage listener also skips it. A driver who leaves the panel open sees "Şu an yolcular seni Yolcuda görüyor" long after the 25-minute auto-expiry made them "Müsait", or after the durak president changed their status from yonetim. **Fix:** on `visibilitychange` to visible, re-run `Depo.yukle()` and re-render the panel *only if no form element has focus*. The panel's own controls are buttons, not text fields, so this is safe.

---

## P3: worth fixing

1. **Preview hash routing goes blank** [verified]. `app.js:1427`: `else return;` for unknown hashes. In `onizleme.html#d-ornek-durak`, clicking `#hizmetler` and reloading leaves `#app` with 0 children. **Fix:** remember the last view, with `var sonRota` and a fallback render. Or have in-page anchors use `scrollIntoView` with `preventDefault`, so the hash stays `#d-…`.
2. **No update flow for long-lived PWAs** [code]. `sw.js:5`, with `skipWaiting` and `clients.claim`, swaps the SW under a running page. That's fine for network-first, but an open panel or app keeps running old `app.js` and `veri.js` (phone numbers, backups) indefinitely. **Fix:** `navigator.serviceWorker.addEventListener("controllerchange", () => { if (!document.querySelector(".perde") && !app.contains(document.activeElement)) location.reload(); })`, plus a `reg.update()` on `visibilitychange`.
3. **SW caching hygiene.** `fetch(istek)` uses the HTTP cache. GitHub Pages sends `max-age=600`, so navigations can be 10 minutes stale after a deploy; use `{cache:"no-cache"}` for navigations. The Google Fonts CSS is fetched `no-cors`, because the `<link>` has no `crossorigin`. The SW stores it as an **opaque** response (verified in the cache listing), which Chrome pads to about 7 MB of quota each. The cache grows without bound with every visited page and query string.
4. **Self-host fonts** [verified]. The render-blocking third-party CSS plus 4 woff2 files (68 KB) cost two extra origins, and the font swap causes **CLS 0.172 on the durak page** (Layout Instability attribution: `.sf-durak`, `.canli`, `.giris`, `.eylemler`; 0 with fonts blocked). Google Fonts also sends visitor IPs to Google, a KVKK issue. **Fix:** ship the woff2 files in `assets/`, `<link rel=preload as=font crossorigin>` the two used on first paint, and add `size-adjust`/`ascent-override` fallback `@font-face` for Arial Narrow/system-ui.
5. **Payload** [verified]. `app.js` is 110.9 KB raw (29.6 KB gz), unminified, and has every page renderer. `veri.js` is 23.8 KB, of which **17.8 KB is QR SVGs** that are only needed on `/etiket/` and the marketing page, yet load on every passenger page. `dist/t/<kod>/qr.svg` already exists, so use `<img src="…/qr.svg">` and drop `qr`/`qrPanel` from `veri.js`. Minify with `esbuild --minify` in `build.mjs`, which brings `app.js` to about 18 KB gz. Throttled run (150 ms RTT, 1.6 Mbps, 4× CPU): FCP is about 0.87 s, but that's only the static fallback `<p>`; real content appears around 1.3–1.4 s after all three scripts. Consider prerendering the driver card into the static HTML, since it's built anyway.
6. **theme-color is fixed dark** (`build.mjs:72`, manifest `theme_color`), so the light theme gets a dark Android toolbar. Add `<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2ee">`.
7. **Root manifest scope `./`** contains every driver and durak scope. If someone installs the "Taksicim" app, driver links opened from it stay inside the Taksicim window. Minor; it goes away if the marketing site moves under its own folder, or accept it.
8. **iOS standalone storage is isolated from Safari**, so `taksicim_cihaz` and `taksicim_ilk_kaynak` are new inside the home-screen app. "Pleksiden uygulamayı kuran" (`app.js:1045`) can't attribute iOS installs, and "Farklı telefon" double-counts each iOS installer. Document it in the stats note, or append `?k=...&c=<cihaz>` via a per-visit `start_url`. That can't be done with static manifests, so treat it as a known limitation.
9. **"Durak içinde yönlendirilen" counts redirects that left the durak** (`app.js:1051`, `824`). `ahmet` (ornek-durak) has backup `kemal` (independent), and every ahmet→kemal redirect is counted as staying in the durak. **Fix:** `if (o.tur === "yonlendirme" && (!ic || ic[o.hedef])) r.kurtarilan++`.
10. **Two sources of truth for durak membership.** `site.json` `soforler[].durak` drives client-side stats (`olayKodlari`), while `durumlar.durak` drives `durak_durum_guncelle` and `olay_listesi`. If they drift, the panel shows "PIN yanlış" and the numbers disagree. Generate a `supabase/senkron.sql` from `site.json` in `build.mjs`, or validate it in CI.
11. **Unescaped interpolations** (operator data only, but cheap to harden):
    - `s.yil` at `app.js:549,714`;
    - `d.konum.lat/lng` at `744`;
    - `kod` in `data-*` and `value` attributes at `362,556,563,656,898,965`;
    - `data-renk` and `tel:` at `build.mjs:66,140,159`.

    No path from *anonymous* input to HTML was found. DB values are either CHECK-constrained (`durum`), filtered through `sofor()` (`yedekler`), or never rendered (`olaylar` fields).
12. **SQL hardening.** Use `set search_path = ''` and schema-qualify (`public.pinler`, `extensions.crypt`) in all SECURITY DEFINER functions (`kurulum.sql:55,61,84,89,125`). `p_donus_dk` is unbounded, so add `check (donus_dk between 1 and 240)`. Rapor "Başından beri" pulls every event as one JSON (`olay_listesi`). Aggregate server-side, or paginate before the table grows. Add `revoke execute ... from public` explicitly, since functions default to PUBLIC execute.
13. **The NFC panel URLs are a CSRF-like toggle.** Any link to `/panel/#bos` or `#dolu` (WhatsApp, a website) flips a logged-in driver's status without confirmation (`app.js:886-887`). That's acceptable for the UX, but consider a short-lived nonce on the printed tags (`#dolu-<secret>`) checked against a value stored at login.
14. **Panel login preselects the demo driver `"ahmet"`** (`app.js:895`) in production. Default to an empty "Seç…" option.
15. **The yonetim fallback `durak(kod) || S.duraklar[0]`** (`app.js:782`) silently shows a *different* durak's login for a mistyped code. Return `bulunamadi()` instead.
16. **`sayfaDurak` → "Nasıl görünür?"** calls `yolculukPaylas(sf[0], true)` (`app.js:773`), which throws for a durak with no drivers yet. In demo, `yolculukPaylas` also asks for geolocation before showing the sample.
17. **CI** (`yayinla.yml`): there's no check step. Add `node --check src/*.js`, the stronger `kontrol()`, and a headless smoke test that loads each generated page and fails on `pageerror`, which would have caught the `konum` crash. Pin actions by SHA. `force_orphan` is fine.
18. **The `surum` hash** (`build.mjs:31`) excludes the HTML template, icons and manifests. An icon-only change keeps the same cache name, so old icons persist offline. Include them in the hash.

---

## Verified as OK
- `esc()` is applied to all user-visible text from data, and `wa.me`/`tel:` numbers are digit-filtered.
- `/rest/v1/` and Supabase cross-origin requests bypass the SW.
- Manifest icon paths resolve correctly from sub-folders.
- `prefers-reduced-motion` disables all animations (`style.css:752`).
- `:focus-visible` exists. Only its colour is a problem; see P2-14.
- Visit and install counters are session- and localStorage-guarded, and re-renders don't double count `ziyaret`.
- The RLS defaults are sound: there are no select, update or delete policies on `olaylar`, `pinler`, `durak_pinler` or `yonetici_pin`.
