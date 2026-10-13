// Siteyi data/site.json'dan üretir.
//   npm run build     -> dist/ (GitHub Pages'e yüklenen gerçek site)
//   npm run onizleme  -> onizleme/onizleme.html (tek dosyalık demo, # ile gezinilir)
import { readFile, writeFile, mkdir, rm, copyFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import QRCode from "qrcode";

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ONIZLEME = process.argv.includes("--onizleme");
const SITE = JSON.parse(await readFile(path.join(KOK, "data/site.json"), "utf8"));
const CSS = await readFile(path.join(KOK, "src/style.css"), "utf8");
const JS = await readFile(path.join(KOK, "src/app.js"), "utf8");
const SW = await readFile(path.join(KOK, "src/sw.js"), "utf8");
const FONT_CSS = await readFile(path.join(KOK, "src/fonts/fonts.css"), "utf8");
const BU_DOSYA = await readFile(new URL(import.meta.url), "utf8");

kontrol(SITE);

const siteUrl = SITE.marka.siteUrl.replace(/\/$/, "");
const kokYol = new URL(siteUrl + "/").pathname; // "/taksi-platform/"
const QR_AYAR = { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } };
const qr = {};
for (const s of SITE.soforler) {
  // ?k=q: bu ziyaretin QR'dan geldiğini sayaca söyler (NFC çipinde ?k=n yazılır)
  qr[s.kod] = await QRCode.toString(`${siteUrl}/t/${s.kod}/?k=q`, QR_AYAR);
}
const qrPanel = {};
for (const k of ["dolu", "bos"]) qrPanel[k] = await QRCode.toString(`${siteUrl}/panel/#${k}`, QR_AYAR);

// Gerçek sitede QR'lar ayrı dosya (her sayfada 18 KB taşınmasın); önizlemede tek dosya olduğu için içeride
// Yenilenmeyen şoför ("pasif": true): sayfası durağa yönlendirir; numarası ve bilgisi yolcuya gitmez
const AKTIF = SITE.soforler.filter((s) => !s.pasif);
const PASIF = SITE.soforler.filter((s) => s.pasif).map(({ kod, ad, hitap, durak }) => ({ kod, ad, hitap, durak }));
const ISTEMCI = { ...SITE, soforler: AKTIF, pasifler: PASIF };
const VERI = "window.SITE=" + JSON.stringify(ISTEMCI) + ";";
const VERI_ONIZLEME = "window.SITE=" + JSON.stringify({ ...ISTEMCI, qr, qrPanel }) + ";";
const surum = createHash("sha1").update(CSS + JS + VERI + SW + FONT_CSS + BU_DOSYA).digest("hex").slice(0, 8);
const FONT = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Figtree:wght@400;500;600;700&display=swap";

if (ONIZLEME) {
  await mkdir(path.join(KOK, "onizleme"), { recursive: true });
  const html = `<title>${esc(SITE.marka.ad)} Önizleme</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT}">
<style>${CSS}</style>
<div id="app"></div>
<script>${VERI_ONIZLEME}</script>
<script>${JS}</script>
`;
  await writeFile(path.join(KOK, "onizleme/onizleme.html"), html);
  console.log("onizleme/onizleme.html hazır");
  process.exit(0);
}

// Küçültme (esbuild varsa). Yoksa dosyalar olduğu gibi gider.
async function kucult(kod, tur) {
  try {
    const { transform } = await import("esbuild");
    return (await transform(kod, { loader: tur, minify: true, target: tur === "js" ? "es2017" : "safari13" })).code;
  } catch (e) { return kod; }
}

const DIST = path.join(KOK, "dist");
await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, "assets/fonts"), { recursive: true });
await mkdir(path.join(DIST, "assets/gorsel"), { recursive: true });
await writeFile(path.join(DIST, "assets/style.css"), await kucult(FONT_CSS.replaceAll("../fonts/", "fonts/") + CSS, "css"));
await writeFile(path.join(DIST, "assets/app.js"), await kucult(JS, "js"));
await writeFile(path.join(DIST, "assets/veri.js"), VERI);
await writeFile(path.join(DIST, "sw.js"), SW.replace("__SURUM__", surum));
for (const f of await readdir(path.join(KOK, "src/fonts"))) if (f.endsWith(".woff2")) await copyFile(path.join(KOK, "src/fonts", f), path.join(DIST, "assets/fonts", f));
for (const f of await readdir(path.join(KOK, "src/gorsel"))) await copyFile(path.join(KOK, "src/gorsel", f), path.join(DIST, "assets/gorsel", f));
await writeFile(path.join(DIST, ".nojekyll"), "");
if (SITE.marka.alanAdi) await writeFile(path.join(DIST, "CNAME"), SITE.marka.alanAdi + "\n");

const RENKLER = ["sari", "turuncu", "yesil", "mavi"];
function renkAdi(r) { return RENKLER.includes(r) ? r : "sari"; }

// Her sayfanın HTML'i. JavaScript gelmeden önce de (yavaş internette) ana bilgi ve arama düğmesi görünür.
function sayfa({ yol, view, kod, baslik, aciklama, uygAdi, manifest, yedek, renk, gizli, jsonld }) {
  const derinlik = yol ? yol.split("/").length : 0;
  const base = derinlik ? "../".repeat(derinlik) : "./";
  const r = renkAdi(renk);
  const adres = `${siteUrl}/${yol ? yol + "/" : ""}`;
  return `<!doctype html>
<html lang="tr"${r !== "sari" ? ` data-renk="${r}"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(baslik)}</title>
<meta name="description" content="${esc(aciklama)}">
${gizli ? `<meta name="robots" content="noindex, nofollow">\n` : `<link rel="canonical" href="${esc(adres)}">\n`}<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0d0e10">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2ee">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.marka.ad)}">
<meta property="og:title" content="${esc(baslik)}">
<meta property="og:description" content="${esc(aciklama)}">
<meta property="og:url" content="${esc(adres)}">
<meta property="og:image" content="${siteUrl}/assets/gorsel/paylas-${r}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="${manifest ? "manifest.webmanifest" : base + "manifest.webmanifest"}">
<link rel="apple-touch-icon" href="${base}assets/gorsel/ikon-${r}-180.png">
<link rel="icon" href="${base}assets/gorsel/ikon-${r}-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(uygAdi)}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="preload" href="${base}assets/fonts/barlow-700-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/style.css?v=${surum}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>\n` : ""}<script>window.PAGE=${JSON.stringify({ view, kod: kod || null, base, surum })};</script>
<script defer src="${base}assets/veri.js?v=${surum}"></script>
<script defer src="${base}assets/app.js?v=${surum}"></script>
</head>
<body>
<div id="app">${yedek || ""}</div>
</body>
</html>
`;
}

// JavaScript gelmeden görünen sade kart: ad, plaka, büyük arama düğmesi
function yedekKart({ ust, ad, alt, tel, dugme }) {
  return `<div class="yedek-kart">${ust ? `<p class="yk-ust">${esc(ust)}</p>` : ""}<h1>${esc(ad)}</h1>${alt ? `<p>${esc(alt)}</p>` : ""}${tel ? `<a class="yk-ara" href="tel:${esc(tel)}">${esc(dugme)} · ${esc(telGoster(tel))}</a>` : ""}</div>`;
}

// Her sayfanın kendi uygulama kimliği (id) var: biri kurulunca diğerleri "zaten kurulu" sanılmaz
function manifest({ ad, kisa, aciklama, yol, renk }) {
  const base = yol ? "../".repeat(yol.split("/").length) : "./";
  const r = renkAdi(renk);
  return JSON.stringify({
    id: kokYol + (yol ? yol + "/" : ""), name: ad, short_name: kisa, description: aciklama, lang: "tr", dir: "ltr",
    start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
    background_color: "#0d0e10", theme_color: "#0d0e10",
    icons: [
      { src: `${base}assets/gorsel/ikon-${r}-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}assets/gorsel/ikon-${r}-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}assets/gorsel/ikon-${r}-512-maskable.png`, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  }, null, 2);
}

async function yaz(yol, dosya, icerik) {
  const klasor = path.join(DIST, yol);
  await mkdir(klasor, { recursive: true });
  await writeFile(path.join(klasor, dosya), icerik);
}

const M = SITE.marka;
const haritaya = [""];
// Tanıtım
await yaz("", "index.html", sayfa({
  yol: "", view: "tanitim", baslik: `${M.ad} · ${M.sehir} taksicilerine özel sayfa ve uygulama`,
  aciklama: "Yolcu pleksiye dokunur, senin sayfan açılır. Tek dokunuşla çağırır, sen meşgulsen iş anlaşmalı arkadaşına gider.",
  uygAdi: M.ad,
  yedek: yedekKart({ ust: M.sehir, ad: M.ad, alt: M.slogan, tel: M.iletisimTelefon, dugme: "Bizi ara" })
}));
await yaz("", "manifest.webmanifest", manifest({ ad: M.ad, kisa: M.ad, aciklama: M.slogan, yol: "" }));

// Duraklar
for (const d of SITE.duraklar) {
  const yol = `d/${d.kod}`;
  if (!d.demo) haritaya.push(yol);
  await yaz(yol, "index.html", sayfa({
    yol, view: "durak", kod: d.kod, manifest: true, renk: d.renk, gizli: d.demo,
    baslik: `${d.ad} · ${M.sehir} Taksi`, aciklama: `${d.ad}: ${M.sehir}'da ${d.acik || "7/24"} taksi. Telefon ${telGoster(d.telefon)}.`,
    uygAdi: d.ad,
    yedek: yedekKart({ ust: `${M.sehir} · ${d.acik || "7/24"}`, ad: d.ad, alt: d.adres, tel: d.telefon, dugme: "Taksi çağır" }),
    jsonld: d.demo ? null : {
      "@context": "https://schema.org", "@type": "LocalBusiness", "@id": `${siteUrl}/${yol}/#durak`,
      name: d.ad, description: d.slogan ? d.slogan.replace("|", " ") : undefined, telephone: d.telefon, url: `${siteUrl}/${yol}/`,
      image: `${siteUrl}/assets/gorsel/paylas-${renkAdi(d.renk)}.png`,
      address: { "@type": "PostalAddress", streetAddress: d.adres, addressLocality: M.sehir, addressCountry: "TR" },
      geo: d.konum ? { "@type": "GeoCoordinates", latitude: d.konum.lat, longitude: d.konum.lng } : undefined,
      openingHours: !d.acik || d.acik === "7/24" ? "Mo-Su 00:00-23:59" : undefined
    }
  }));
  await yaz(yol, "manifest.webmanifest", manifest({ ad: d.ad, kisa: kisalt(d.ad), aciklama: `${d.ad} taksi çağır`, yol, renk: d.renk }));
  await yaz(`${yol}/yonetim`, "index.html", sayfa({
    yol: `${yol}/yonetim`, view: "yonetim", kod: d.kod, renk: d.renk, gizli: true, manifest: true,
    baslik: `${d.ad} · Durak paneli`, aciklama: "Durağın bütün araçları tek ekranda.", uygAdi: `${kisalt(d.ad)} Panel`
  }));
  await yaz(`${yol}/yonetim`, "manifest.webmanifest", manifest({ ad: `${d.ad} Paneli`, kisa: `${kisalt(d.ad)} Panel`, aciklama: "Durak paneli", yol: `${yol}/yonetim`, renk: d.renk }));
}

// Şoförler: her birinin kendi sayfası ve kendi "uygulaması" (manifest)
for (const s of SITE.soforler) {
  const yol = `t/${s.kod}`;
  const d = SITE.duraklar.find((x) => x.kod === s.durak);
  const uyg = `${(s.hitap || s.ad).replace(/ Abi$/, "")} Taksi`;
  if (s.pasif) {
    await yaz(yol, "index.html", sayfa({
      yol, view: "sofor", kod: s.kod, renk: d ? d.renk : s.renk, gizli: true,
      baslik: d ? `${d.ad} · Taksi çağır` : `${M.sehir} taksi`, aciklama: d ? `${d.ad}, ${M.sehir}.` : "",
      yedek: d ? yedekKart({ ust: "Bu araç artık bu sayfayı kullanmıyor", ad: d.ad, alt: "Durağı arayın, size en yakın aracı gönderelim.", tel: d.telefon, dugme: "Durağı ara" })
               : yedekKart({ ust: M.sehir, ad: "Bu sayfa artık kullanılmıyor", alt: "Şoförünüze numarasını sorun." })
    }));
    continue;
  }
  if (!(s.demo || (d && d.demo))) haritaya.push(yol);
  await yaz(yol, "index.html", sayfa({
    yol, view: "sofor", kod: s.kod, manifest: true, renk: d ? d.renk : s.renk, gizli: s.demo || (d && d.demo),
    baslik: `${s.hitap || s.ad} Taksi${d ? " · " + d.ad : ""}`,
    aciklama: `${s.ad}, ${s.plaka}. Tek dokunuşla taksi çağır, WhatsApp'tan konum at.`,
    uygAdi: uyg,
    yedek: yedekKart({ ust: d ? d.ad : `${M.sehir} · Bağımsız taksici`, ad: s.ad, alt: `${s.plaka} · ${s.arac}`, tel: s.telefon, dugme: "Taksi çağır" })
  }));
  await yaz(yol, "manifest.webmanifest", manifest({ ad: uyg, kisa: uyg, aciklama: `${s.ad} taksi çağır`, yol, renk: d ? d.renk : s.renk }));
  await yaz(yol, "qr.svg", qr[s.kod]);
}

// Panel, rapor, etiketler, bulunamadı
await yaz("panel", "index.html", sayfa({ yol: "panel", view: "panel", manifest: true, gizli: true, baslik: `Şoför Paneli · ${M.ad}`, aciklama: "Müsaitlik durumunu ve anlaşmalı şoförlerini yönet.", uygAdi: "Şoför Paneli" }));
await yaz("panel", "manifest.webmanifest", manifest({ ad: "Şoför Paneli", kisa: "Panelim", aciklama: "Müsait, yolcuda, kapalı: tek dokunuş", yol: "panel" }));
for (const k of ["dolu", "bos"]) await yaz("panel", `qr-${k}.svg`, qrPanel[k]);
await yaz("rapor", "index.html", sayfa({ yol: "rapor", view: "rapor", manifest: true, gizli: true, baslik: `Rapor · ${M.ad}`, aciklama: "Bütün müşterilerin sayıları.", uygAdi: `${M.ad} Rapor` }));
await yaz("rapor", "manifest.webmanifest", manifest({ ad: `${M.ad} Rapor`, kisa: "Rapor", aciklama: "Bütün müşterilerin sayıları", yol: "rapor" }));
await yaz("etiket", "index.html", sayfa({ yol: "etiket", view: "etiket", gizli: true, baslik: `Etiketler · ${M.ad}`, aciklama: "10x10 cm NFC + QR pleksi baskısı.", uygAdi: M.ad }));
// GitHub Pages bilinmeyen linklerde 404.html gösterir; base kök olduğu için mutlak yol kullanırız
await writeFile(path.join(DIST, "404.html"), sayfa({ yol: "", view: "yok", gizli: true, baslik: "Sayfa bulunamadı", aciklama: "", uygAdi: M.ad }).replaceAll('"./', `"${kokYol}`).replace('"base":"./"', `"base":"${kokYol}"`));
// Arama motorları için site haritası (demo ve paneller hariç)
await writeFile(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${haritaya.map((y) => `  <url><loc>${esc(siteUrl + "/" + (y ? y + "/" : ""))}</loc></url>`).join("\n")}\n</urlset>\n`);

console.log(`dist/ hazır · ${SITE.duraklar.length} durak · ${SITE.soforler.length} şoför · sürüm ${surum}`);

// ---------- yardımcılar ----------
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function telGoster(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : t;
}
function kisalt(ad) { return ad.length > 12 ? ad.split(" ")[0] : ad; }
function kontrol(site) {
  const hata = [];
  const URLOK = (u) => /^https:\/\/[^\s"'<>]+$/.test(u || "");
  const TEL = (t) => /^\+90\d{10}$/.test(t || "");
  if (!URLOK(site.marka && site.marka.siteUrl)) hata.push('marka.siteUrl "https://" ile başlamalı (QR kodlar bu adresle basılır)');
  else if (site.marka.alanAdi && new URL(site.marka.siteUrl).host !== site.marka.alanAdi) hata.push("marka.siteUrl ile marka.alanAdi aynı adres olmalı");
  const dk = new Set();
  for (const d of site.duraklar) {
    if (!/^[a-z0-9-]+$/.test(d.kod || "")) hata.push(`Durak kodu sadece küçük harf, rakam ve tire olabilir: "${d.kod}"`);
    if (dk.has(d.kod)) hata.push(`Aynı durak kodu iki kere var: "${d.kod}"`);
    dk.add(d.kod);
    if (!d.ad) hata.push(`${d.kod}: ad eksik`);
    if (!TEL(d.telefon)) hata.push(`${d.ad}: telefon +905XXXXXXXXX biçiminde olmalı`);
    if (d.whatsapp && !TEL(d.whatsapp)) hata.push(`${d.ad}: whatsapp +905XXXXXXXXX biçiminde olmalı`);
    if (!d.konum || !isFinite(d.konum.lat) || !isFinite(d.konum.lng)) hata.push(`${d.ad}: konum {lat, lng} eksik`);
    if (d.renk && !["sari", "turuncu", "yesil", "mavi"].includes(d.renk)) hata.push(`${d.ad}: renk sari, turuncu, yesil ya da mavi olabilir`);
    if (d.googleYorum && !URLOK(d.googleYorum)) hata.push(`${d.ad}: googleYorum https:// ile başlamalı`);
  }
  const kodlar = new Set();
  for (const s of site.soforler) {
    if (!/^[a-z0-9-]+$/.test(s.kod || "")) hata.push(`Şoför kodu sadece küçük harf, rakam ve tire olabilir: "${s.kod}"`);
    if (kodlar.has(s.kod)) hata.push(`Aynı şoför kodu iki kere var: "${s.kod}"`);
    kodlar.add(s.kod);
    for (const f of ["ad", "plaka", "arac"]) if (!s[f]) hata.push(`${s.kod}: ${f} eksik`);
    if (!TEL(s.telefon)) hata.push(`${s.kod}: telefon +905XXXXXXXXX biçiminde olmalı`);
    if (s.durak && !site.duraklar.some((d) => d.kod === s.durak)) hata.push(`${s.ad}: "${s.durak}" diye bir durak yok`);
    if ((s.yedekler || []).includes(s.kod)) hata.push(`${s.ad}: kendini yedek seçmiş`);
    if (s.googleYorum && !URLOK(s.googleYorum)) hata.push(`${s.ad}: googleYorum https:// ile başlamalı`);
    if (s.foto && !URLOK(s.foto) && !/^[a-z0-9/_.-]+$/i.test(s.foto)) hata.push(`${s.ad}: foto adresi geçersiz`);
    if (s.renk && !["sari", "turuncu", "yesil", "mavi"].includes(s.renk)) hata.push(`${s.ad}: renk geçersiz`);
  }
  for (const s of site.soforler) for (const y of s.yedekler || []) if (!kodlar.has(y)) hata.push(`${s.ad}: yedek "${y}" diye bir şoför yok`);
  if (hata.length) { console.error("data/site.json hatalı:\n- " + hata.join("\n- ")); process.exit(1); }
}
