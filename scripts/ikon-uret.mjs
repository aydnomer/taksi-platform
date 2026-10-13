// Uygulama simgelerini ve WhatsApp paylaşım görselini üretir (her durak rengi için ayrı).
// Sadece tasarım değişince bir kere çalıştırılır, çıktılar src/gorsel/ içine kaydedilir:
//   node scripts/ikon-uret.mjs   (Playwright ve Chromium gerekir)
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
const PW = process.env.PLAYWRIGHT_YOLU || "playwright";
const { chromium } = await import(PW);
const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CIKTI = path.join(KOK, "src/gorsel");
await mkdir(CIKTI, { recursive: true });
const RENK = { sari: "#ffc20e", turuncu: "#ff8a1f", yesil: "#3ddc84", mavi: "#5cc8ff" };
const FONT = path.join(KOK, "src/fonts/barlow-700-latin.woff2");
const FONT2 = path.join(KOK, "src/fonts/barlow-700-latin-ext.woff2");
const FIG = path.join(KOK, "src/fonts/figtree-latin.woff2");
const FIG2 = path.join(KOK, "src/fonts/figtree-latin-ext.woff2");
const veri = async (f) => "data:font/woff2;base64," + (await readFile(f)).toString("base64");
const yuz = `@font-face{font-family:B;src:url(${await veri(FONT)})}@font-face{font-family:B;src:url(${await veri(FONT2)});unicode-range:U+0100-02BA}
@font-face{font-family:F;font-weight:400 800;src:url(${await veri(FIG)})}@font-face{font-family:F;font-weight:400 800;src:url(${await veri(FIG2)});unicode-range:U+0100-02BA}`;

// Simge: koyu zemin, ortada durak renginde "TAKSİ" tepe lambası, altında dama şeridi.
// oran: içeriğin kaplayacağı genişlik (maskable için güvenli alan %80 çember → 0.62)
function ikon(renk, oran) {
  return `<style>${yuz}html,body{margin:0}body{width:512px;height:512px;background:#0d0e10;display:grid;place-items:center}
  .k{width:${512 * oran}px;display:grid;gap:${22 * oran}px;justify-items:center}
  .l{width:100%;background:${renk};color:#111;border-radius:${34 * oran}px;font:700 ${150 * oran}px/1 B;letter-spacing:${4 * oran}px;text-align:center;padding:${34 * oran}px 0 ${26 * oran}px;box-shadow:0 0 ${60 * oran}px ${renk}66}
  .d{width:86%;height:${40 * oran}px;background:repeating-conic-gradient(#111 0 25%,${renk} 0 50%) 0 0/${40 * oran}px ${40 * oran}px;border-radius:${8 * oran}px}</style>
  <div class="k"><div class="l">TAKSİ</div><div class="d"></div></div>`;
}
function paylas(renk) {
  return `<html lang="tr"><style>${yuz}html,body{margin:0}body{width:1200px;height:630px;background:#0d0e10;color:#f3f3f0;font-family:F;display:grid;grid-template-columns:1fr 360px;align-items:center;padding:0 80px;box-sizing:border-box;gap:60px;position:relative}
  h1{font:700 104px/0.95 B;text-transform:uppercase;margin:0}h1 b{color:${renk}}p{font-size:34px;color:#a2a5aa;margin:28px 0 0}
  .l{background:${renk};color:#111;border-radius:28px;font:700 120px/1 B;text-align:center;padding:30px 0 22px;box-shadow:0 0 80px ${renk}55}
  .d{position:absolute;left:0;right:0;bottom:0;height:36px;background:repeating-conic-gradient(#111 0 25%,${renk} 0 50%) 0 0/36px 36px}</style>
  <div><h1>Taksi çağır,<br><b>tek dokunuş.</b></h1><p>Şoför meşgulse arkadaşı gelir.<br>WhatsApp'tan konum at.</p></div><div class="l">TAKSİ</div><div class="d"></div>`;
}

const b = await chromium.launch(process.env.CHROMIUM_YOLU ? { executablePath: process.env.CHROMIUM_YOLU } : {});
const p = await b.newPage();
for (const [ad, renk] of Object.entries(RENK)) {
  for (const [boy, oran, dosya] of [[512, 0.8, "512"], [512, 0.62, "512-maskable"], [192, 0.8, "192"], [180, 0.7, "180"]]) {
    await p.setViewportSize({ width: 512, height: 512 });
    await p.setContent(ikon(renk, oran));
    await p.evaluate(() => document.fonts.ready);
    const tampon = await p.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 } });
    // küçük boyutlar: büyük görüntüyü küçültüp yeniden çek
    if (boy === 512) { await import("node:fs/promises").then((f) => f.writeFile(path.join(CIKTI, `ikon-${ad}-${dosya}.png`), tampon)); continue; }
    await p.setViewportSize({ width: boy, height: boy });
    await p.setContent(`<style>html,body{margin:0}img{width:${boy}px;height:${boy}px;display:block}</style><img src="data:image/png;base64,${tampon.toString("base64")}">`);
    await p.screenshot({ path: path.join(CIKTI, `ikon-${ad}-${dosya}.png`), clip: { x: 0, y: 0, width: boy, height: boy } });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  await p.setContent(paylas(renk));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(CIKTI, `paylas-${ad}.png`), clip: { x: 0, y: 0, width: 1200, height: 630 } });
}
await b.close();
console.log("src/gorsel/ hazır");
