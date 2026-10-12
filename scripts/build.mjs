// Siteyi data/site.json'dan üretir.
//   npm run build     -> dist/ (GitHub Pages'e yüklenen gerçek site)
//   npm run onizleme  -> onizleme/onizleme.html (tek dosyalık demo, # ile gezinilir)
import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import QRCode from "qrcode";

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ONIZLEME = process.argv.includes("--onizleme");
const SITE = JSON.parse(await readFile(path.join(KOK, "data/site.json"), "utf8"));
const CSS = await readFile(path.join(KOK, "src/style.css"), "utf8");
const JS = await readFile(path.join(KOK, "src/app.js"), "utf8");
const SW = await readFile(path.join(KOK, "src/sw.js"), "utf8");

kontrol(SITE);

const siteUrl = SITE.marka.siteUrl.replace(/\/$/, "");
const qr = {};
for (const s of SITE.soforler) {
  qr[s.kod] = await QRCode.toString(`${siteUrl}/t/${s.kod}/`, {
    type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" }
  });
}
const VERI = "window.SITE=" + JSON.stringify({ ...SITE, qr }) + ";";
const surum = createHash("sha1").update(CSS + JS + VERI).digest("hex").slice(0, 8);
const FONT = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Figtree:wght@400;500;600;700&display=swap";

if (ONIZLEME) {
  await mkdir(path.join(KOK, "onizleme"), { recursive: true });
  const html = `<title>${esc(SITE.marka.ad)} Önizleme</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT}">
<style>${CSS}</style>
<div id="app"></div>
<script>${VERI}</script>
<script>${JS}</script>
`;
  await writeFile(path.join(KOK, "onizleme/onizleme.html"), html);
  console.log("onizleme/onizleme.html hazır");
  process.exit(0);
}

const DIST = path.join(KOK, "dist");
await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, "assets"), { recursive: true });
await writeFile(path.join(DIST, "assets/style.css"), CSS);
await writeFile(path.join(DIST, "assets/app.js"), JS);
await writeFile(path.join(DIST, "assets/veri.js"), VERI);
await writeFile(path.join(DIST, "sw.js"), SW.replace("__SURUM__", surum));
for (const f of ["ikon-180.png", "ikon-192.png", "ikon-512.png", "ikon-512-maskable.png"]) {
  await copyFile(path.join(KOK, "src", f), path.join(DIST, "assets", f));
}
await writeFile(path.join(DIST, ".nojekyll"), "");
if (SITE.marka.alanAdi) await writeFile(path.join(DIST, "CNAME"), SITE.marka.alanAdi + "\n");

function sayfa({ yol, view, kod, baslik, aciklama, uygAdi, manifest, yedek }) {
  const derinlik = yol ? yol.split("/").length : 0;
  const base = derinlik ? "../".repeat(derinlik) : "./";
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(baslik)}</title>
<meta name="description" content="${esc(aciklama)}">
<meta name="theme-color" content="#0d0e10">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(baslik)}">
<meta property="og:description" content="${esc(aciklama)}">
<meta property="og:locale" content="tr_TR">
${manifest ? `<link rel="manifest" href="manifest.webmanifest">` : `<link rel="manifest" href="${base}manifest.webmanifest">`}
<link rel="apple-touch-icon" href="${base}assets/ikon-180.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(uygAdi)}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="icon" href="${base}assets/ikon-192.png">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT}">
<link rel="stylesheet" href="${base}assets/style.css?v=${surum}">
</head>
<body>
<div id="app">${yedek || ""}</div>
<script>window.PAGE=${JSON.stringify({ view, kod: kod || null, base })};</script>
<script src="${base}assets/veri.js?v=${surum}"></script>
<script src="${base}assets/app.js?v=${surum}"></script>
</body>
</html>
`;
}

function manifest({ ad, kisa, aciklama }) {
  return JSON.stringify({
    id: "./", name: ad, short_name: kisa, description: aciklama, lang: "tr",
    start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
    background_color: "#0d0e10", theme_color: "#0d0e10",
    icons: [
      { src: "assets/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "assets/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "assets/ikon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  }, null, 2);
}
// Alt klasördeki manifestlerde ikon yolu köke göre ayarlanır
function manifestAlt(m, derinlik) {
  const j = JSON.parse(m);
  j.icons.forEach((i) => { i.src = "../".repeat(derinlik) + i.src; });
  return JSON.stringify(j, null, 2);
}

async function yaz(yol, dosya, icerik) {
  const klasor = path.join(DIST, yol);
  await mkdir(klasor, { recursive: true });
  await writeFile(path.join(klasor, dosya), icerik);
}

const M = SITE.marka;
// Tanıtım
await yaz("", "index.html", sayfa({
  yol: "", view: "tanitim", baslik: `${M.ad} · ${M.sehir} taksicilerine özel sayfa ve uygulama`,
  aciklama: "Yolcu pleksiye dokunur, senin sayfan açılır. Tek dokunuşla çağırır, sen meşgulsen iş anlaşmalı arkadaşına gider.",
  uygAdi: M.ad,
  yedek: `<p style="padding:40px 16px">${esc(M.ad)} · ${esc(M.slogan)}</p>`
}));
await yaz("", "manifest.webmanifest", manifest({ ad: M.ad, kisa: M.ad, aciklama: M.slogan }));

// Duraklar
for (const d of SITE.duraklar) {
  const yol = `d/${d.kod}`;
  await yaz(yol, "index.html", sayfa({
    yol, view: "durak", kod: d.kod, manifest: true,
    baslik: `${d.ad} · ${M.sehir} Taksi`, aciklama: `${d.ad}: ${M.sehir}'da ${d.acik || "7/24"} taksi. Telefon ${telGoster(d.telefon)}.`,
    uygAdi: d.ad,
    yedek: `<p style="padding:40px 16px">${esc(d.ad)} · <a href="tel:${d.telefon}">${esc(telGoster(d.telefon))}</a></p>`
  }));
  await yaz(yol, "manifest.webmanifest", manifestAlt(manifest({ ad: d.ad, kisa: kisalt(d.ad), aciklama: `${d.ad} taksi çağır` }), 2));
}

// Şoförler: her birinin kendi sayfası ve kendi "uygulaması" (manifest)
for (const s of SITE.soforler) {
  const yol = `t/${s.kod}`;
  const d = SITE.duraklar.find((x) => x.kod === s.durak);
  const uyg = `${(s.hitap || s.ad).replace(/ Abi$/, "")} Taksi`;
  await yaz(yol, "index.html", sayfa({
    yol, view: "sofor", kod: s.kod, manifest: true,
    baslik: `${s.hitap || s.ad} Taksi${d ? " · " + d.ad : ""}`,
    aciklama: `${s.ad}, ${s.plaka}. Tek dokunuşla taksi çağır, WhatsApp'tan konum gönder.`,
    uygAdi: uyg,
    yedek: `<p style="padding:40px 16px">${esc(s.ad)} · ${esc(s.plaka)} · <a href="tel:${s.telefon}">${esc(telGoster(s.telefon))}</a></p>`
  }));
  await yaz(yol, "manifest.webmanifest", manifestAlt(manifest({ ad: `${s.hitap || s.ad} Taksi`, kisa: uyg, aciklama: `${s.ad} taksi çağır` }), 2));
  await yaz(yol, "qr.svg", qr[s.kod]);
}

// Panel, etiketler, bulunamadı
await yaz("panel", "index.html", sayfa({ yol: "panel", view: "panel", baslik: `Şoför Paneli · ${M.ad}`, aciklama: "Müsaitlik durumunu ve anlaşmalı şoförlerini yönet.", uygAdi: "Şoför Paneli" }));
await yaz("etiket", "index.html", sayfa({ yol: "etiket", view: "etiket", baslik: `Etiketler · ${M.ad}`, aciklama: "10x10 cm NFC + QR pleksi baskısı.", uygAdi: M.ad }));
// GitHub Pages bilinmeyen linklerde 404.html gösterir; base kök olduğu için mutlak yol kullanırız
const kokYol = new URL(siteUrl + "/").pathname;
await writeFile(path.join(DIST, "404.html"), sayfa({ yol: "", view: "yok", baslik: "Sayfa bulunamadı", aciklama: "", uygAdi: M.ad }).replaceAll('"./', `"${kokYol}`).replace('"base":"./"', `"base":"${kokYol}"`));

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
  const kodlar = new Set();
  const hata = [];
  for (const s of site.soforler) {
    if (!/^[a-z0-9-]+$/.test(s.kod)) hata.push(`Şoför kodu sadece küçük harf, rakam ve tire olabilir: "${s.kod}"`);
    if (kodlar.has(s.kod)) hata.push(`Aynı şoför kodu iki kere var: "${s.kod}"`);
    kodlar.add(s.kod);
    if (s.durak && !site.duraklar.some((d) => d.kod === s.durak)) hata.push(`${s.ad}: "${s.durak}" diye bir durak yok`);
  }
  for (const s of site.soforler) for (const y of s.yedekler || []) if (!kodlar.has(y)) hata.push(`${s.ad}: yedek "${y}" diye bir şoför yok`);
  if (hata.length) { console.error("data/site.json hatalı:\n- " + hata.join("\n- ")); process.exit(1); }
}
