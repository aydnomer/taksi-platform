/* Taksicim platformu: tanıtım, durak sitesi, şoför sayfası, şoför paneli ve etiket sayfası.
   Tüm sayfalar bu tek dosyayla çizilir. Veri window.SITE'tan (veri.js) gelir.
   window.PAGE varsa gerçek site (her sayfa kendi klasöründe), yoksa tek dosya önizleme (# ile gezinme). */
(function () {
  "use strict";

  var S = window.SITE;
  var P = window.PAGE || null;
  var HASH = !P;
  var app = document.getElementById("app");

  // ---------- küçük yardımcılar ----------
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function telGoster(t) {
    var d = String(t || "").replace(/\D/g, "");
    if (d.indexOf("90") === 0) d = d.slice(2);
    if (d.length !== 10) return t || "";
    return "0" + d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6, 8) + " " + d.slice(8);
  }
  function telSade(t) { return String(t || "").replace(/[^\d+]/g, ""); }
  function waNo(t) { return String(t || "").replace(/\D/g, ""); }
  function bas(ad) {
    var p = String(ad || "").trim().split(/\s+/);
    return ((p[0] || "")[0] || "") + ((p[1] || "")[0] || "");
  }
  function ls(k, v) {
    try {
      if (arguments.length === 1) return JSON.parse(localStorage.getItem(k) || "null");
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function ss(k, v) {
    try {
      if (arguments.length === 1) return JSON.parse(sessionStorage.getItem(k) || "null");
      if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  var sofor = function (k) { return S.soforler.filter(function (s) { return s.kod === k; })[0] || null; };
  var durak = function (k) { return S.duraklar.filter(function (d) { return d.kod === k; })[0] || null; };
  var duragi = function (s) { return s && s.durak ? durak(s.durak) : null; };
  var demoMu = function (s) { var d = duragi(s); return !!((s && s.demo) || (d && d.demo)); };

  // ---------- simgeler ----------
  var I = {
    tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    wa: '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 10c.5 2 2.5 4 4.5 4.5l1.3-1.3 2 .9-.4 1.6c-3.5.5-8-4-7.5-7.5l1.6-.4.9 2z"/>',
    konum: '<path d="M12 22s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="10" r="2.6"/>',
    rehber: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    ekle: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 8v6M9 11h6"/>',
    ok: '<path d="M9 6l6 6-6 6"/>',
    uyari: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v6M12 16.5v.5"/>',
    sehir: '<path d="M3 21h18M5 21V8l6-4v17M11 21V10h8v11M8 10v.01M8 14v.01M8 18v.01M15 14v.01M15 18v.01"/>',
    ucak: '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    yol: '<path d="M4 21L9 3M20 21L15 3M12 6v2M12 11v2M12 16v2"/>',
    ay: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    nfc: '<path d="M6 8.3a6 6 0 0 1 0 7.4M10 6a10 10 0 0 1 0 12M14 4a13.5 13.5 0 0 1 0 16M18 2.5a16.5 16.5 0 0 1 0 19"/>',
    tik: '<path d="M20 6L9 17l-5-5"/>',
    yukari: '<path d="M18 15l-6-6-6 6"/>',
    asagi: '<path d="M6 9l6 6 6-6"/>',
    sil: '<path d="M18 6L6 18M6 6l12 12"/>',
    yonlen: '<path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/>',
    saat: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
    kalkan: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    yildiz: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    grafik: '<path d="M3 3v18h18M7 15l4-4 3 3 6-6"/>',
    ev: '<path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    kart: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'
  };
  function ik(ad) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[ad] + "</svg>";
  }
  var GOOGLE_G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  function plaka(p) { return '<span class="plaka" aria-label="Plaka ' + esc(p) + '"><b>TR</b><span>' + esc(p) + "</span></span>"; }

  // ---------- bağlantılar ----------
  function link(view, kod) {
    if (HASH) {
      if (view === "tanitim") return "#tanitim";
      if (view === "durak") return "#d-" + kod;
      if (view === "sofor") return "#t-" + kod;
      if (view === "panel") return "#panel" + (kod ? "-" + kod : "");
      if (view === "yonetim") return "#y-" + kod;
      return "#" + view;
    }
    var b = P.base;
    if (view === "tanitim") return b;
    if (view === "durak") return b + "d/" + kod + "/";
    if (view === "sofor") return b + "t/" + kod + "/";
    if (view === "panel") return b + "panel/" + (kod ? "#" + kod : "");
    if (view === "yonetim") return b + "d/" + kod + "/yonetim/";
    return b + view + "/";
  }
  function tamLink(s) { return S.marka.siteUrl.replace(/\/$/, "") + "/t/" + s.kod + "/"; }

  // ---------- DURUM DEPOSU ----------
  // Supabase ayarı doluysa gerçek veritabanı, değilse bu telefonda saklanan demo durumu kullanılır.
  var SUPA = S.ayarlar && S.ayarlar.supabaseUrl ? S.ayarlar : null;
  var DURUM = {};
  var YEDEK = {}; // panelden değiştirilen yedek sırası
  var OLAYLAR = [];

  var Depo = SUPA ? {
    yukle: function () {
      var h = { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey };
      return fetch(SUPA.supabaseUrl + "/rest/v1/durumlar?select=kod,durum,donus_dk,yedekler,guncelleme", { headers: h })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (rows) {
          DURUM = {}; YEDEK = {};
          rows.forEach(function (r) {
            DURUM[r.kod] = { durum: r.durum, donusDk: r.donus_dk, zaman: Date.parse(r.guncelleme) };
            if (r.yedekler && r.yedekler.length) YEDEK[r.kod] = r.yedekler;
          });
        })
        .catch(function () { DURUM = {}; }); // internet yoksa herkes "bilinmiyor" görünür, arama yine çalışır
    },
    guncelle: function (kod, pin, durum, donusDk, yedekler) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/durum_guncelle", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_kod: kod, p_pin: pin, p_durum: durum, p_donus_dk: donusDk || null, p_yedekler: yedekler || null })
      }).then(function (r) { return r.json(); }).then(function (ok) {
        if (ok !== true) throw new Error("PIN yanlış");
        DURUM[kod] = { durum: durum, donusDk: donusDk, zaman: Date.now() };
        if (yedekler) YEDEK[kod] = yedekler;
      });
    },
    pinDogru: function (kod, pin) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/pin_kontrol", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_kod: kod, p_pin: pin })
      }).then(function (r) { return r.json(); }).then(function (ok) { return ok === true; }).catch(function () { return false; });
    },
    durakPinDogru: function (durakKod, pin) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/durak_pin_kontrol", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_durak: durakKod, p_pin: pin })
      }).then(function (r) { return r.json(); }).then(function (ok) { return ok === true; }).catch(function () { return false; });
    },
    durakGuncelle: function (durakKod, pin, kod, durum, donusDk) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/durak_durum_guncelle", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_durak: durakKod, p_pin: pin, p_kod: kod, p_durum: durum, p_donus_dk: donusDk || null })
      }).then(function (r) { return r.json(); }).then(function (ok) {
        if (ok !== true) throw new Error("PIN yanlış");
        DURUM[kod] = { durum: durum, donusDk: donusDk, zaman: Date.now() };
      });
    },
    olay: function (kod, tur, hedef) {
      fetch(SUPA.supabaseUrl + "/rest/v1/olaylar", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ kod: kod, tur: tur, hedef: hedef || null })
      }).catch(function () {});
    },
    olaylar: function (kod) {
      var h = { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey };
      var ay = new Date(); ay.setDate(1); ay.setHours(0, 0, 0, 0);
      return fetch(SUPA.supabaseUrl + "/rest/v1/olaylar?select=kod,tur,hedef&zaman=gte." + ay.toISOString() + "&or=(kod.eq." + kod + ",hedef.eq." + kod + ")", { headers: h })
        .then(function (r) { return r.json(); }).catch(function () { return []; });
    }
  } : {
    yukle: function () {
      var kayit = ls("taksicim_durum") || {};
      var tohum = S.demoDurum || {};
      DURUM = {};
      S.soforler.forEach(function (s) {
        var d = kayit[s.kod] || (tohum[s.kod] ? { durum: tohum[s.kod].durum, donusDk: tohum[s.kod].donusDk || null, zaman: Date.now() } : null);
        if (d) {
          // demo: eski kayıtlar canlı görünsün diye zamanı tazele
          if (Date.now() - d.zaman > 60 * 60 * 1000) d.zaman = Date.now();
          DURUM[s.kod] = d;
        }
      });
      YEDEK = ls("taksicim_yedek") || {};
      OLAYLAR = ls("taksicim_olay") || [];
      ls("taksicim_durum", DURUM);
      return Promise.resolve();
    },
    guncelle: function (kod, pin, durum, donusDk, yedekler) {
      if (pin !== "1234") return Promise.reject(new Error("PIN yanlış"));
      DURUM[kod] = { durum: durum, donusDk: donusDk || null, zaman: Date.now() };
      ls("taksicim_durum", DURUM);
      if (yedekler) { YEDEK[kod] = yedekler; ls("taksicim_yedek", YEDEK); }
      return Promise.resolve();
    },
    pinDogru: function (kod, pin) { return Promise.resolve(pin === "1234"); },
    durakPinDogru: function (durakKod, pin) { return Promise.resolve(pin === "1234"); },
    durakGuncelle: function (durakKod, pin, kod, durum, donusDk) {
      if (pin !== "1234") return Promise.reject(new Error("PIN yanlış"));
      DURUM[kod] = { durum: durum, donusDk: donusDk || null, zaman: Date.now() };
      ls("taksicim_durum", DURUM);
      return Promise.resolve();
    },
    olay: function (kod, tur, hedef) {
      OLAYLAR.push({ kod: kod, tur: tur, hedef: hedef || null, zaman: Date.now() });
      if (OLAYLAR.length > 300) OLAYLAR = OLAYLAR.slice(-300);
      ls("taksicim_olay", OLAYLAR);
    },
    olaylar: function (kod) {
      return Promise.resolve(OLAYLAR.filter(function (o) { return o.kod === kod || o.hedef === kod; }));
    }
  };

  var ETIKET = { musait: "Müsait", yolcuda: "Yolcuda", kapali: "Hizmet dışı", bilinmiyor: "Durumu bilinmiyor" };

  function durumu(kod) {
    var d = DURUM[kod];
    var saat = (S.ayarlar && S.ayarlar.eskiDurumSaat) || 8;
    if (!d || !d.zaman || Date.now() - d.zaman > saat * 3600 * 1000) return { durum: "bilinmiyor" };
    var kalan = null;
    if (d.durum === "yolcuda" && d.donusDk) {
      kalan = Math.round(d.donusDk - (Date.now() - d.zaman) / 60000);
      // Süre dolunca şoför bir şeye basmasa da kendiliğinden müsait olur
      if (kalan <= 0) return { durum: "musait", otomatik: true };
    }
    return { durum: d.durum, kalan: kalan };
  }
  function durumRozet(kod) {
    var d = durumu(kod);
    var yazi = ETIKET[d.durum] + (d.kalan ? " · ~" + d.kalan + " dk" : "");
    return '<span class="durum ' + d.durum + '">' + esc(yazi) + "</span>";
  }
  function yedekleri(s) {
    return (YEDEK[s.kod] || s.yedekler || []).map(sofor).filter(Boolean);
  }

  // Asıl kural: şoför müsaitse onu, değilse yedek listesindeki ilk müsait şoförü seç.
  function hedefSec(s, haric) {
    haric = haric || [];
    var d = durumu(s.kod).durum;
    if (haric.indexOf(s.kod) < 0 && (d === "musait" || d === "bilinmiyor")) return { hedef: s, yonlendi: false };
    var y = yedekleri(s);
    for (var i = 0; i < y.length; i++) {
      if (haric.indexOf(y[i].kod) < 0 && durumu(y[i].kod).durum === "musait") return { hedef: y[i], yonlendi: true };
    }
    return { hedef: null, yonlendi: true };
  }

  // ---------- pencere ve bildirim ----------
  function pencere(html) {
    kapat();
    var p = document.createElement("div");
    p.className = "perde";
    p.innerHTML = '<div class="pencere" role="dialog" aria-modal="true"><div class="tutac"></div><div class="ic">' + html + "</div></div>";
    p.addEventListener("click", function (e) { if (e.target === p || e.target.closest("[data-kapat]")) kapat(); });
    document.body.appendChild(p);
    var f = p.querySelector("button, a");
    if (f) f.focus({ preventScroll: true });
    return p;
  }
  function kapat() { var p = document.querySelector(".perde"); if (p) p.remove(); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") kapat(); });
  var bildirimZaman;
  function bildir(m) {
    var b = document.querySelector(".bildirim");
    if (!b) { b = document.createElement("div"); b.className = "bildirim"; b.setAttribute("role", "status"); document.body.appendChild(b); }
    b.textContent = m;
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(function () { b.remove(); }, 3200);
  }

  // ---------- EYLEMLER: ara, konum gönder, rehbere kaydet ----------
  function ara(kisi, ctx) {
    // kisi: şoför ya da durak. ctx: { kaynak: sayfanın şoförü, yonlendi: bool }
    var demo = ctx.demo;
    if (ctx.kaynak) Depo.olay(ctx.kaynak.kod, ctx.yonlendi ? "yonlendirme" : "arama", kisi.kod);
    var ad = kisi.hitap || kisi.ad;
    if (demo || HASH) {
      var y = ctx.kaynak ? hedefSec(ctx.kaynak, [kisi.kod]) : null;
      pencere(
        '<p class="etiket-ust">Demo</p><h3>' + esc(ad) + " aranıyor</h3>" +
        "<p>Gerçek sayfada telefon şimdi <b>" + esc(telGoster(kisi.telefon)) + "</b> numarasını arar.</p>" +
        (y && y.hedef
          ? '<p style="color:var(--soluk)">Yolcu aradı ama ' + esc(ad) + " açmadıysa, sayfaya geri döndüğünde ona bunu sorarız:</p>" +
            '<button class="btn btn-sari btn-blok" data-ulasamadim>Ulaşamadım, ne olacak?</button>'
          : "") +
        '<button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>'
      );
      var u = document.querySelector("[data-ulasamadim]");
      if (u) u.addEventListener("click", function () { ulasamadim(ctx.kaynak, kisi.kod, true); });
      return;
    }
    if (ctx.kaynak) ss("taksicim_son_arama", { kaynak: ctx.kaynak.kod, aranan: kisi.kod, t: Date.now() });
    location.href = "tel:" + telSade(kisi.telefon);
  }

  // Yolcu aradı, sayfaya döndü: "Ulaşabildin mi?" Değilse sıradaki müsait şoför.
  function ulasamadim(kaynak, arananKod, demo) {
    var aranan = sofor(arananKod) || kaynak;
    var y = hedefSec(kaynak, [arananKod]);
    var ad = aranan.hitap || aranan.ad;
    var d = duragi(kaynak);
    var html = '<p class="etiket-ust">Ulaşamadın mı?</p><h3>' + esc(ad) + " açmadıysa dert etme</h3>";
    if (y.hedef) {
      html += "<p>Anlaşmalı arkadaşı <b>" + esc(y.hedef.hitap || y.hedef.ad) + "</b> şu an müsait. " + esc(y.hedef.arac) + ".</p>" +
        '<button class="btn btn-sari btn-blok" data-git="' + y.hedef.kod + '">' + ik("tel") + esc(y.hedef.hitap || y.hedef.ad) + "'yi ara</button>" +
        '<button class="btn btn-wa btn-blok" data-wa="' + y.hedef.kod + '">' + ik("konum") + "Ona konumumu gönder</button>";
    } else if (d) {
      html += "<p>Anlaşmalı şoförlerin hepsi şu an yolcuda. Durağı ara, ilk boşalan araç gelsin.</p>" +
        '<button class="btn btn-sari btn-blok" data-durak>' + ik("tel") + esc(d.ad) + " durağını ara</button>";
    } else {
      html += "<p>Anlaşmalı şoförlerin hepsi şu an yolcuda. Birkaç dakika sonra tekrar dene.</p>";
    }
    html += '<button class="btn btn-hayalet btn-blok" data-kapat>Ulaştım, sağ ol</button>';
    pencere(html);
    var c = { kaynak: kaynak, yonlendi: true, demo: demo };
    var g = document.querySelector("[data-git]");
    if (g) g.addEventListener("click", function () { ara(y.hedef, c); });
    var w = document.querySelector("[data-wa]");
    if (w) w.addEventListener("click", function () { konumGonder(y.hedef, c); });
    var dd = document.querySelector("[data-durak]");
    if (dd) dd.addEventListener("click", function () { ara(d, { demo: demo }); });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || HASH) return;
    var son = ss("taksicim_son_arama");
    if (!son) return;
    ss("taksicim_son_arama", null);
    var gecen = Date.now() - son.t;
    if (gecen < 2500 || gecen > 4 * 60 * 1000) return;
    var k = sofor(son.kaynak);
    if (k) ulasamadim(k, son.aranan, false);
  });

  function konumGonder(kisi, ctx) {
    var ad = kisi.hitap || kisi.ad;
    if (ctx.kaynak) Depo.olay(ctx.kaynak.kod, ctx.yonlendi ? "yonlendirme" : "konum", kisi.kod);
    function gonder(lat, lng) {
      var m = "Merhaba " + ad + ", taksi lazım.";
      if (lat != null) m += "\nKonumum: https://maps.google.com/?q=" + lat.toFixed(6) + "," + lng.toFixed(6);
      else m += "\nAdresim: ";
      if (ctx.yonlendi && ctx.kaynak) m += "\n(" + (ctx.kaynak.hitap || ctx.kaynak.ad) + " meşguldü, sayfasından size yönlendirildim.)";
      if (ctx.demo || HASH) {
        pencere('<p class="etiket-ust">Demo</p><h3>WhatsApp mesajı hazır</h3><p>Gerçek sayfada ' + esc(ad) + "'nin WhatsApp'ı bu mesajla açılır. Yolcu sadece Gönder'e basar.</p>" +
          '<div class="mesaj">' + esc(m) + '</div><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
        return;
      }
      location.href = "https://wa.me/" + waNo(kisi.whatsapp || kisi.telefon) + "?text=" + encodeURIComponent(m);
    }
    if (HASH || !navigator.geolocation) {
      var d0 = duragi(ctx.kaynak || kisi) || (kisi.konum ? kisi : null);
      return gonder(d0 && d0.konum ? d0.konum.lat : 38.6748, d0 && d0.konum ? d0.konum.lng : 39.2225);
    }
    bildir("Konumun alınıyor…");
    navigator.geolocation.getCurrentPosition(
      function (p) { gonder(p.coords.latitude, p.coords.longitude); },
      function () { bildir("Konum izni verilmedi. Adresini mesaja yazabilirsin."); setTimeout(function () { gonder(null, null); }, 900); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  }

  function rehbereKaydet(s) {
    var d = duragi(s);
    var v = [
      "BEGIN:VCARD", "VERSION:3.0",
      "N:" + s.ad.split(" ").slice(-1)[0] + ";" + s.ad.split(" ").slice(0, -1).join(" ") + " (Taksi);;;",
      "FN:" + (s.hitap || s.ad) + " Taksi" + (d ? " · " + d.ad : ""),
      "ORG:" + (d ? d.ad : "Taksi"),
      "TEL;TYPE=CELL:" + telSade(s.telefon)
    ];
    if (d && d.telefon) v.push("TEL;TYPE=WORK:" + telSade(d.telefon));
    v.push("URL:" + tamLink(s), "NOTE:Plaka " + s.plaka + ". Meşgulse sayfadan anlaşmalı şoförünü çağırabilirsin.", "END:VCARD");
    if (HASH) {
      pencere('<p class="etiket-ust">Rehbere kaydet</p><h3>Numara rehbere eklenir</h3><p>Telefonda bu butona basınca "' + esc((s.hitap || s.ad) + " Taksi") + '" kişi olarak kaydedilir. İçinde şoförün ve durağın numarası, bir de bu sayfanın linki olur.</p><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
      return;
    }
    Depo.olay(s.kod, "rehber");
    var blob = new Blob([v.join("\r\n")], { type: "text/vcard" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (s.hitap || s.ad).replace(/\s+/g, "-") + "-taksi.vcf";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    bildir("Kişi kartı indirildi. Açınca rehbere eklenir.");
  }

  // ---------- Ana ekrana ekle (PWA) ----------
  // Android/Chrome: tarayıcının kendi "Yükle" penceresini tek dokunuşla açarız.
  // iPhone: Apple buna izin vermiyor (hiçbir site kendiliğinden yükleyemez). Bu yüzden:
  //  1) Safari'nin Paylaş düğmesini ok ile gösteren adım adım rehber,
  //  2) Instagram/WhatsApp içi tarayıcıdaysa "Safari'de aç" uyarısı (orada ana ekrana ekleme yok),
  //  3) Tek dokunuşla çalışan yedek: "Rehbere kaydet" (iPhone kişi kartını direkt açar).
  var kurulumIstegi = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); kurulumIstegi = e; });
  var UA = navigator.userAgent || "";
  var IOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var UYG_ICI = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Twitter|TikTok|Snapchat|GSA\//i.test(UA);
  var IOS_SAFARI_DISI = IOS && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(UA);
  var KURULU = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;

  var PAYLAS_IK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:22px;height:22px;vertical-align:-5px"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>';
  var EKLE_IK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="width:22px;height:22px;vertical-align:-5px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

  function anaEkranaEkle(ad, s) {
    if (kurulumIstegi) {
      kurulumIstegi.prompt();
      kurulumIstegi.userChoice.then(function (c) { kurulumIstegi = null; if (c && c.outcome === "accepted" && s) Depo.olay(s.kod, "kurulum"); });
      return;
    }
    var rehber = s ? '<button class="btn btn-sari btn-blok" data-rehber-pencere>' + ik("rehber") + "Tek dokunuşla rehbere kaydet</button>" : "";
    var html = '<p class="etiket-ust">Uygulama gibi kullan</p><h3>' + esc(ad) + " telefonunda kalsın</h3>";
    if (IOS && UYG_ICI) {
      html += "<p>Bu sayfa şu an Instagram ya da WhatsApp'ın içinde açıldı. iPhone burada ana ekrana eklemeye izin vermiyor.</p>" +
        "<p><b>1.</b> Sağ üstteki <b>•••</b> ya da pusula simgesine dokun.<br><b>2.</b> <b>Safari'de aç</b>'ı seç.<br><b>3.</b> Açılan sayfada tekrar <b>Ana ekrana</b>'ya bas.</p>" +
        '<button class="btn btn-hayalet btn-blok" data-kopyala>Linki kopyala</button>';
    } else if (IOS) {
      html += '<ol class="ios-adim">' +
        "<li><span>1</span><p>Safari'nin altındaki " + PAYLAS_IK + " <b>Paylaş</b> düğmesine dokun. Görmüyorsan önce <b>•••</b>'ye bas.</p></li>" +
        "<li><span>2</span><p>Açılan listeyi yukarı kaydır, " + EKLE_IK + " <b>Ana Ekrana Ekle</b>'yi seç.</p></li>" +
        "<li><span>3</span><p>Sağ üstteki <b>Ekle</b>'ye bas. Ekranında <b>" + esc(ad) + "</b> simgesi belirir.</p></li></ol>" +
        (IOS_SAFARI_DISI ? '<p style="color:var(--soluk);font-size:14px">Chrome kullanıyorsan Paylaş düğmesi adres çubuğunun sağındadır.</p>' : "") +
        '<p style="color:var(--soluk);font-size:14px">Daha kolayı: rehbere kaydet. Tek dokunuş, numara ve sayfa linki rehberinde durur.</p>' + rehber;
      setTimeout(iosOk, 50);
    } else {
      html += "<p><b>1.</b> Tarayıcının sağ üstündeki <b>⋮</b> menüsünü aç.<br><b>2.</b> <b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>'ye dokun.</p>" + rehber;
    }
    html += '<button class="btn btn-hayalet btn-blok" data-kapat>Sonra</button>';
    pencere(html);
    var r = document.querySelector("[data-rehber-pencere]");
    if (r) r.addEventListener("click", function () { kapat(); rehbereKaydet(s); });
    var k = document.querySelector("[data-kopyala]");
    if (k) k.addEventListener("click", function () {
      var u = s ? tamLink(s) : location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { bildir("Link kopyalandı. Safari'ye yapıştır."); }, function () { bildir(u); });
    });
  }
  // iPhone'da Safari'nin alt çubuğundaki Paylaş düğmesini gösteren zıplayan ok
  function iosOk() {
    var p = document.querySelector(".perde");
    if (!p || p.querySelector(".ios-ok")) return;
    var o = document.createElement("div");
    o.className = "ios-ok";
    o.innerHTML = '<span>Paylaş burada</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M5 13l7 7 7-7"/></svg>';
    p.appendChild(o);
  }
  // İlk ziyarette (yüklü değilse) birkaç saniye sonra bir kere hatırlat
  function kurulumHatirlat(ad, s) {
    if (KURULU || HASH || ls("taksicim_hatirlatildi_" + s.kod)) return;
    setTimeout(function () {
      if (document.querySelector(".perde") || document.hidden) return;
      ls("taksicim_hatirlatildi_" + s.kod, 1);
      var b = document.createElement("div");
      b.className = "kur-serit";
      b.innerHTML = '<span class="lamba">TAKSİ</span><p><b>' + esc(ad) + "</b> telefonunda dursun mu? Bir dahaki sefere tek dokunuş.</p>" +
        '<button class="btn btn-sari" data-kur>Ekle</button><button class="kur-kapat" aria-label="Kapat">' + ik("sil") + "</button>";
      document.body.appendChild(b);
      b.querySelector("[data-kur]").addEventListener("click", function () { b.remove(); anaEkranaEkle(ad, s); });
      b.querySelector(".kur-kapat").addEventListener("click", function () { b.remove(); });
    }, 6000);
  }

  function demoSerit(metin) {
    return '<div class="demo-serit">' + metin + "</div>";
  }

  // ======================================================
  // ŞOFÖR SAYFASI
  // ======================================================
  function sayfaSofor(kod) {
    var s = sofor(kod);
    if (!s) return bulunamadi();
    var d = duragi(s);
    var demo = demoMu(s);
    var du = durumu(s.kod);
    var sec = hedefSec(s);
    var ad = s.hitap || s.ad;
    var ctx = { kaynak: s, yonlendi: sec.yonlendi, demo: demo };
    document.title = ad + " Taksi" + (d ? " · " + d.ad : "");

    var h = "";
    if (demo) h += demoSerit('Örnek sayfa. Butonlar gerçek arama yapmaz. <a href="' + link("panel", s.kod) + '">Şoför panelinden durumu değiştir</a>');
    h += '<div class="sf uyg">';
    h += '<div class="sf-ust">' +
      (d ? '<a class="sf-durak" href="' + link("durak", d.kod) + '"><span class="lamba">TAKSİ</span><span><b>' + esc(d.ad) + "</b><small>" + esc(d.altAd || S.marka.sehir) + "</small></span></a>"
         : '<span class="sf-durak"><span class="lamba">TAKSİ</span><span><b>' + esc(S.marka.sehir) + " Taksi</b><small>Bağımsız şoför</small></span></span>") +
      (KURULU ? "" : '<button class="btn btn-hayalet" style="min-height:40px;padding:0 12px;font-size:14px" data-ekle>' + ik("ekle") + "Ana ekrana</button>") + "</div>";

    h += '<div class="sf-kart">';
    h += '<div class="dama ince" aria-hidden="true"></div>';
    h += '<div class="sf-kimlik"><div class="avatar" aria-hidden="true">' + esc(bas(s.ad)) + '</div><div style="min-width:0"><h1>' + esc(s.ad) + '</h1><p class="alt">' + esc(s.arac) + (s.yil ? " · " + s.yil + " yıllık şoför" : "") + "</p></div></div>";
    h += '<div class="sf-bilgi">' + plaka(s.plaka) + durumRozet(s.kod) + "</div>";

    if (sec.yonlendi && sec.hedef) {
      var y = sec.hedef;
      h += '<div class="yonlendir"><div class="baslik">' + ik("yonlen") + "<p><b>" + esc(ad) + "</b> şu an " + (du.durum === "yolcuda" ? "yolcuda" + (du.kalan ? " (yaklaşık " + du.kalan + " dk)" : "") : "hizmet dışı") +
        ". Seni bekletmeyelim: anlaşmalı arkadaşı <b>" + esc(y.hitap || y.ad) + "</b> müsait.</p></div></div>";
      h += '<div class="sf-cagir"><button class="btn btn-sari btn-cagir" data-ara="' + y.kod + '"><span class="ust">' + ik("tel") + esc(y.hitap || y.ad) + "'yi Çağır</span><small>" + esc(y.arac) + " · " + esc(y.plaka) + "</small></button>" +
        '<div class="sf-ikili"><button class="btn btn-wa" data-konum="' + y.kod + '">' + ik("konum") + "Konum gönder</button>" +
        '<button class="btn btn-hayalet" data-bekle>' + ik("saat") + esc(ad) + "'yi bekle</button></div></div>";
    } else if (sec.yonlendi) {
      h += '<div class="yonlendir"><div class="baslik">' + ik("uyari") + "<p><b>" + esc(ad) + "</b> ve anlaşmalı arkadaşları şu an yolcuda." + (d ? " Durağı ara, ilk boşalan araç gelsin." : " Birkaç dakika sonra tekrar dene.") + "</p></div></div>";
      h += '<div class="sf-cagir">' + (d ? '<button class="btn btn-sari btn-cagir" data-durak><span class="ust">' + ik("tel") + "Durağı Ara</span><small>" + esc(telGoster(d.telefon)) + "</small></button>" : "") +
        '<div class="sf-ikili"><button class="btn btn-wa" data-konum="' + s.kod + '">' + ik("konum") + "Konum gönder</button>" +
        '<button class="btn btn-hayalet" data-ara="' + s.kod + '">' + ik("tel") + esc(ad) + "'yi ara</button></div></div>";
    } else {
      h += '<div class="sf-cagir"><button class="btn btn-sari btn-cagir" data-ara="' + s.kod + '"><span class="ust">' + ik("tel") + "Taksi Çağır</span><small>" + esc(ad) + " · " + esc(telGoster(s.telefon)) + "</small></button>" +
        '<div class="sf-ikili"><button class="btn btn-wa" data-konum="' + s.kod + '">' + ik("konum") + "Konum gönder</button>" +
        '<button class="btn btn-hayalet" data-rehber>' + ik("rehber") + "Rehbere kaydet</button></div></div>";
    }
    h += "</div>";

    var yed = yedekleri(s);
    if (yed.length) {
      h += '<section class="bolum"><h2>Anlaşmalı şoförleri <small>' + esc(ad) + " meşgulken</small></h2><div class=\"liste\">";
      yed.forEach(function (k) {
        var kd = durumu(k.kod).durum;
        var kdurak = duragi(k);
        h += '<div class="kisi"><div class="avatar' + (kd === "musait" ? "" : " soluk") + '" aria-hidden="true">' + esc(bas(k.ad)) + '</div><div class="ad"><b>' + esc(k.hitap || k.ad) + "</b><small>" + esc(k.plaka) + " · " + esc(kdurak ? kdurak.ad : "Bağımsız") + "</small>" +
          durumRozet(k.kod) + "</div>" +
          '<button class="ara" data-ara="' + k.kod + '" aria-label="' + esc(k.hitap || k.ad) + ' ara"' + (kd === "kapali" ? " disabled" : "") + ">" + ik("tel") + "</button></div>";
      });
      h += "</div></section>";
    }

    h += '<section class="bolum"><div class="liste">';
    if (sec.yonlendi) h += '<button class="google" style="border:0;width:100%;text-align:left;cursor:pointer" data-rehber><span class="g" style="background:var(--sari);color:#111">' + ik("rehber") + "</span><span><b>" + esc(ad) + "'yi rehbere kaydet</b><small>Numarası ve sayfası telefonunda dursun</small></span><span class=\"ok\">" + ik("ok") + "</span></button>";
    var gy = s.googleYorum || (d && d.googleYorum);
    if (gy) h += '<a class="google" href="' + esc(gy) + '" target="_blank" rel="noopener" data-google><span class="g">' + GOOGLE_G + "</span><span><b>Google'da değerlendir</b><small>Puanı sen verirsin. Her yorum okunuyor.</small></span><span class=\"ok\">" + ik("ok") + "</span></a>";
    if (d) h += '<a class="google" href="' + link("durak", d.kod) + '"><span class="g" style="background:var(--sari);color:#111">' + ik("ev") + "</span><span><b>" + esc(d.ad) + "</b><small>Durağın sitesi, bütün araçlar</small></span><span class=\"ok\">" + ik("ok") + "</span></a>";
    h += "</div></section>";

    h += '<section class="bolum"><h2>Güvenli yolculuk</h2><div class="liste">' +
      '<button class="google satir-btn" data-paylas><span class="g" style="background:var(--yuzey-2);color:var(--metin)">' + ik("kalkan") + "</span><span><b>Yolculuğumu ailemle paylaş</b><small>Plaka, şoför ve konumun tek mesajda</small></span><span class=\"ok\">" + ik("ok") + "</span></button>" +
      '<button class="google satir-btn" data-esya><span class="g" style="background:var(--yuzey-2);color:var(--metin)">' + ik("uyari") + "</span><span><b>Araçta eşya mı unuttun?</b><small>" + esc(d ? "Durağa" : ad + "'ye") + " hazır mesajla bildir</small></span><span class=\"ok\">" + ik("ok") + "</span></button></div></section>";

    if (!d && s.hizmetler && s.hizmetler.length) {
      var ikn = { sehir: "sehir", ucak: "ucak", yol: "yol", ay: "ay" };
      h += '<section class="bolum"><h2>Hizmetler</h2>' + (s.tanitim ? '<p style="color:var(--soluk);margin:-4px 0 12px">' + esc(s.tanitim) + "</p>" : "") + '<div class="liste">' +
        s.hizmetler.map(function (x) { return '<div class="google" style="align-items:flex-start"><span class="g" style="background:var(--sari);color:#111">' + ik(ikn[x.ikon] || "sehir") + "</span><span><b>" + esc(x.baslik) + "</b><small>" + esc(x.metin) + "</small></span></div>"; }).join("") + "</div>" +
        (s.bolgeler && s.bolgeler.length ? '<div class="cipler-sabit" style="margin-top:12px">' + s.bolgeler.map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("") + "</div>" : "") + "</section>";
    }

    h += '<p class="kucuk-not">Konumun sadece senin WhatsApp\'ından şoföre mesaj olarak gider, biz saklamayız. Bu sayfayı açtığında hangi butona basıldığını isim ve numara olmadan sayarız.</p>';
    h += '<p class="alt-imza"><a href="' + link("tanitim") + '">' + esc(S.marka.ad) + "</a> ile hazırlandı</p>";
    h += "</div>";
    app.innerHTML = h;

    function bul(k) { return sofor(k); }
    app.querySelectorAll("[data-ara]").forEach(function (b) {
      b.addEventListener("click", function () { var k = bul(b.dataset.ara); ara(k, { kaynak: s, yonlendi: k.kod !== s.kod, demo: demo }); });
    });
    app.querySelectorAll("[data-konum]").forEach(function (b) {
      b.addEventListener("click", function () { var k = bul(b.dataset.konum); konumGonder(k, { kaynak: s, yonlendi: k.kod !== s.kod, demo: demo }); });
    });
    app.querySelectorAll("[data-rehber]").forEach(function (b) { b.addEventListener("click", function () { rehbereKaydet(s); }); });
    var dk = app.querySelector("[data-durak]");
    if (dk) dk.addEventListener("click", function () { ara(d, { kaynak: s, yonlendi: true, demo: demo }); });
    var bk = app.querySelector("[data-bekle]");
    if (bk) bk.addEventListener("click", function () { ara(s, { kaynak: s, yonlendi: false, demo: demo }); });
    var ek = app.querySelector("[data-ekle]");
    if (ek) ek.addEventListener("click", function () { anaEkranaEkle(ad, s); });
    kurulumHatirlat(ad, s);
    var g = app.querySelector("[data-google]");
    if (g) g.addEventListener("click", function () { Depo.olay(s.kod, "google"); });
    app.querySelector("[data-paylas]").addEventListener("click", function () { yolculukPaylas(s, demo); });
    app.querySelector("[data-esya]").addEventListener("click", function () { esyaUnuttum(d, demo, s); });
    void ctx;
  }

  // ======================================================
  // GÜVENLİK: yolculuğu aileye gönder, eşya unuttum
  // ======================================================
  function yolculukPaylas(s, demo) {
    var d = duragi(s);
    function gonder(lat, lng) {
      var m = "Taksiye bindim.\nPlaka: " + s.plaka + "\nŞoför: " + s.ad + (d ? " (" + d.ad + ")" : "") + "\nAraç: " + s.arac;
      if (lat != null) m += "\nŞu an buradayım: https://maps.google.com/?q=" + lat.toFixed(6) + "," + lng.toFixed(6);
      m += "\nŞoför bilgisi: " + tamLink(s);
      if (s) Depo.olay(s.kod, "paylas");
      if (demo || HASH) {
        pencere('<p class="etiket-ust">Demo</p><h3>Ailene giden mesaj</h3><p>Gerçek sayfada telefonun paylaşma ekranı açılır, yolcu mesajı annesine, eşine ya da istediği kişiye yollar.</p><div class="mesaj">' + esc(m) + '</div><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
        return;
      }
      if (navigator.share) { navigator.share({ text: m }).catch(function () {}); return; }
      location.href = "https://wa.me/?text=" + encodeURIComponent(m);
    }
    if (HASH || !navigator.geolocation) return gonder(null, null);
    bildir("Konumun alınıyor…");
    navigator.geolocation.getCurrentPosition(function (p) { gonder(p.coords.latitude, p.coords.longitude); }, function () { gonder(null, null); }, { timeout: 8000, maximumAge: 60000 });
  }

  function esyaUnuttum(d, demo, s) {
    var liste = s ? [s] : S.soforler.filter(function (x) { return d && x.durak === d.kod; });
    var hedef = d || s;
    var html = '<p class="etiket-ust">Kayıp eşya</p><h3>Araçta bir şey mi unuttun?</h3><p>Hangi araçtaydın? Bilmiyorsan "Emin değilim" de, durak bütün araçlara sorar.</p>' +
      '<label class="secim-alan" for="esya-arac">Araç<select id="esya-arac">' + (s ? "" : '<option value="">Emin değilim</option>') +
      liste.map(function (x) { return '<option value="' + x.kod + '">' + esc(x.plaka) + " · " + esc(x.ad) + "</option>"; }).join("") +
      '</select></label><label class="secim-alan" for="esya-ne">Ne unuttun?<input id="esya-ne" placeholder="Örneğin siyah cüzdan" maxlength="80"></label>' +
      '<button class="btn btn-wa btn-blok" data-esya-gonder>' + ik("wa") + "WhatsApp'tan bildir</button>" +
      '<button class="btn btn-hayalet btn-blok" data-kapat>Vazgeç</button>';
    pencere(html);
    document.querySelector("[data-esya-gonder]").addEventListener("click", function () {
      var a = sofor(document.getElementById("esya-arac").value);
      var ne = document.getElementById("esya-ne").value.trim() || "bir eşyamı";
      var bugun = new Date().toLocaleDateString("tr-TR");
      var m = "Merhaba, " + bugun + " tarihinde " + (a ? a.plaka + " plakalı araçta" : "aracınızda") + " " + ne + " unuttum. Bulunursa bana haber verir misiniz?";
      if (demo || HASH) {
        pencere('<p class="etiket-ust">Demo</p><h3>Durağa giden mesaj</h3><div class="mesaj">' + esc(m) + '</div><p style="color:var(--soluk)">Gerçek sayfada bu mesaj ' + esc(hedef.ad) + "'nin WhatsApp'ına hazır gelir.</p><button class=\"btn btn-hayalet btn-blok\" data-kapat>Tamam</button>");
        return;
      }
      location.href = "https://wa.me/" + waNo(hedef.whatsapp || hedef.telefon) + "?text=" + encodeURIComponent(m);
    });
  }

  // ======================================================
  // DURAK SİTESİ
  // ======================================================
  function sayfaDurak(kod) {
    var d = durak(kod);
    if (!d) return bulunamadi();
    var demo = !!d.demo;
    var sf = S.soforler.filter(function (s) { return s.durak === d.kod; });
    var musait = sf.filter(function (s) { return durumu(s.kod).durum === "musait"; });
    document.title = d.ad + " · " + S.marka.sehir + " Taksi";
    var ikonlar = { sehir: "sehir", ucak: "ucak", yol: "yol", ay: "ay", kalkan: "kalkan", saat: "saat" };

    var h = "";
    if (demo) h += demoSerit('Örnek durak sitesi. Butonlar gerçek arama yapmaz. <a href="' + link("yonetim", d.kod) + '">Durak panelini gör</a>');
    h += '<header class="dk-nav"><div class="kap"><span class="sf-durak"><span class="lamba">TAKSİ</span><span><b>' + esc(d.ad) + "</b><small>" + esc(S.marka.sehir) + " · " + esc(d.acik || "7/24") + "</small></span></span>" +
      '<nav aria-label="Bölümler"><a href="#soforler">Araçlarımız</a><a href="#hizmetler">Hizmetler</a><a href="#guven">Güvenli yolculuk</a><a href="#iletisim">İletişim</a></nav>' +
      '<button class="btn btn-sari" style="min-height:42px;padding:0 16px" data-durak-ara>' + ik("tel") + "<span>" + esc(telGoster(d.telefon)) + "</span></button></div></header>";

    // Açılış: tek iş, taksi çağırmak
    h += '<section class="dk-hero"><div class="kap"><div>' +
      '<p class="etiket-ust">' + esc(S.marka.sehir) + " · " + esc(d.acik || "7/24") + " · " + sf.length + " araç</p>" +
      '<h1 style="margin-top:12px">' + (d.slogan ? esc(d.slogan.split("|")[0]) + (d.slogan.split("|")[1] ? " <em>" + esc(d.slogan.split("|")[1]) + "</em>" : "") : esc(S.marka.sehir) + "'da taksi, <em>tek dokunuşla.</em>") + "</h1>" +
      '<p class="giris">' + esc(d.tanitim || "Müsait şoförümüz hangisiyse çağrın ona gider. Meşgul hat yok, bekleme yok.") + "</p>" +
      '<div class="eylemler"><button class="btn btn-sari btn-buyuk" data-musait-cagir>' + ik("tel") + "Taksi çağır</button>" +
      '<button class="btn btn-wa btn-buyuk" data-durak-konum>' + ik("konum") + "Konumumu gönder</button></div>" +
      (d.google && d.google.puan ? '<a class="g-rozet" href="' + esc(d.googleYorum || "#") + '" target="_blank" rel="noopener"><span class="g">' + GOOGLE_G + "</span><b>" + esc(String(d.google.puan).replace(".", ",")) + "</b><span class=\"yildizlar\">★★★★★</span><small>" + esc(d.google.sayi) + " Google yorumu</small></a>" : "") +
      "</div>";
    h += '<div class="canli" aria-live="polite"><div class="canli-ust"><div class="sayi"><b>' + musait.length + "</b><span>araç şu an<br>müsait</span></div><span class=\"canli-isik\">Canlı</span></div>" +
      '<div class="liste">' + sf.slice(0, 5).map(function (s) {
        return '<div class="kisi" style="background:var(--yuzey-2)"><div class="avatar' + (durumu(s.kod).durum === "musait" ? "" : " soluk") + '" aria-hidden="true">' + esc(bas(s.ad)) + '</div><div class="ad"><b>' + esc(s.hitap || s.ad) + "</b><small>" + esc(s.plaka) + "</small></div>" + durumRozet(s.kod) + "</div>";
      }).join("") + "</div></div></div></section>";

    h += '<div class="kap"><div class="serit"><div><b>' + esc(d.acik || "7/24") + "</b><small>Gece gündüz açık</small></div><div><b>" + sf.length + " araç</b><small>Hepsi ticari plakalı</small></div><div><b>Taksimetre</b><small>Belediye tarifesi</small></div><div><b>" + esc(d.kurulus ? d.kurulus + "'den beri" : "Yerel durak") + "</b><small>" + esc(S.marka.sehir) + "</small></div></div></div>";

    // Araçlar
    h += '<section class="dk-bolum" id="soforler"><div class="kap"><h2>Araçlarımız</h2><p class="alt-baslik">Her aracın plakası ve şoförü burada. Kendi şoförünü seç; meşgulse sayfası seni müsait arkadaşına yönlendirir.</p><div class="izgara">';
    sf.forEach(function (s) {
      var kd = durumu(s.kod).durum;
      h += '<article class="sofor-kart"><div class="ust"><div class="avatar" aria-hidden="true">' + esc(bas(s.ad)) + "</div><div><b>" + esc(s.ad) + "</b><small>" + esc(s.arac) + (s.yil ? " · " + s.yil + " yıl" : "") + "</small></div></div>" +
        '<div class="alt">' + plaka(s.plaka) + durumRozet(s.kod) + "</div>" +
        '<div class="eylem"><a class="btn btn-hayalet" href="' + link("sofor", s.kod) + '">Şoför sayfası</a><button class="btn btn-sari" data-sofor-ara="' + s.kod + '" aria-label="' + esc(s.ad) + ' ara"' + (kd === "kapali" ? " disabled style=\"opacity:.45\"" : "") + ">" + ik("tel") + "</button></div></article>";
    });
    h += "</div></div></section>";

    // Hizmetler
    h += '<section class="dk-bolum dk-koyu" id="hizmetler"><div class="kap"><h2>Hizmetler</h2><p class="alt-baslik">Kısa mesafe de olsa uzun yol da olsa, telefonla ya da WhatsApp\'tan.</p><div class="izgara">';
    (d.hizmetler || []).forEach(function (x) {
      h += '<article class="hizmet"><div class="ik">' + ik(ikonlar[x.ikon] || "sehir") + "</div><h3>" + esc(x.baslik) + "</h3><p>" + esc(x.metin) + "</p></article>";
    });
    h += "</div>";
    if (d.bolgeler && d.bolgeler.length) h += '<div class="bolgeler"><p class="etiket-ust">Sık gittiğimiz yerler</p><div class="cipler-sabit">' + d.bolgeler.map(function (b) { return "<span>" + esc(b) + "</span>"; }).join("") + "</div></div>";
    if (d.sabitFiyatlar && d.sabitFiyatlar.length) h += '<div class="fiyat-tablo"><p class="etiket-ust">Sabit fiyatlı yolculuklar</p>' + d.sabitFiyatlar.map(function (f) { return '<div class="fiyat-satir"><span>' + esc(f.yer) + "</span><b>" + esc(f.fiyat) + "</b></div>"; }).join("") + "</div>";
    h += "</div></section>";

    // Güvenli yolculuk
    h += '<section class="dk-bolum" id="guven"><div class="kap"><h2>Güvenli yolculuk</h2><p class="alt-baslik">Gece eve dönen kızın, havalimanından gelen annen. Kimin aracına bindiğini bilsinler.</p><div class="izgara">' +
      '<article class="hizmet"><div class="ik">' + ik("kalkan") + "</div><h3>Şoförünü tanı</h3><p>Her araçtaki pleksiyi okut, şoförün adı, plakası ve aracı karşına çıkar.</p></article>" +
      '<article class="hizmet"><div class="ik">' + ik("konum") + '</div><h3>Yolculuğunu paylaş</h3><p>Plaka, şoför ve konumun tek dokunuşla ailene gider.</p><button class="btn btn-hayalet" data-paylas>Nasıl görünür?</button></article>' +
      '<article class="hizmet"><div class="ik">' + ik("uyari") + '</div><h3>Eşya mı unuttun?</h3><p>Aracı seç, ne unuttuğunu yaz. Mesaj durağa hazır gider.</p><button class="btn btn-hayalet" data-esya>Eşyamı bildir</button></article>' +
      "</div></div></section>";

    if (d.sss && d.sss.length) {
      h += '<section class="dk-bolum dk-koyu" id="sss"><div class="kap" style="max-width:760px"><h2>Sorular</h2><div style="margin-top:20px">';
      d.sss.forEach(function (q) { h += '<details class="sss"><summary>' + esc(q.s) + "</summary><p>" + esc(q.c) + "</p></details>"; });
      h += "</div></div></section>";
    }

    h += '<footer class="dk-alt" id="iletisim"><div class="kap"><div style="display:grid;gap:14px"><p class="etiket-ust">Bize ulaşın</p><span class="tel" style="user-select:all">' + esc(telGoster(d.telefon)) + "</span><p style=\"color:var(--soluk)\">" + esc(d.adres) + "</p>" +
      '<div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn btn-cizgi" href="https://www.google.com/maps/search/?api=1&query=' + d.konum.lat + "," + d.konum.lng + '" target="_blank" rel="noopener">' + ik("konum") + "Haritada aç</a>" +
      (d.googleYorum ? '<a class="btn btn-cizgi" href="' + esc(d.googleYorum) + '" target="_blank" rel="noopener">' + ik("yildiz") + "Google'da değerlendir</a>" : "") + "</div></div>" +
      '<div style="display:grid;gap:10px;align-content:start"><div class="dama" aria-hidden="true" style="border-radius:6px"></div><p style="color:var(--soluk);font-size:14px">© ' + new Date().getFullYear() + " " + esc(d.ad) + ' · <a href="' + link("yonetim", d.kod) + '" style="color:var(--soluk)">Durak yönetimi</a> · Site: <a href="' + link("tanitim") + '" style="color:var(--sari-metin)">' + esc(S.marka.ad) + "</a></p></div></div></footer>";

    h += '<div class="yapiskan durak"><button class="btn btn-sari" data-musait-cagir>' + ik("tel") + 'Taksi çağır</button><button class="btn btn-wa" data-durak-konum>' + ik("konum") + "Konum</button></div>";
    app.innerHTML = h;

    app.querySelectorAll("[data-durak-ara]").forEach(function (b) { b.addEventListener("click", function () { ara(d, { demo: demo }); }); });
    app.querySelectorAll("[data-durak-konum]").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = musait.length ? musait[Math.floor(Math.random() * musait.length)] : null;
        konumGonder(m || d, { demo: demo, kaynak: m, yonlendi: false });
      });
    });
    app.querySelectorAll("[data-musait-cagir]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!musait.length) return ara(d, { demo: demo });
        var m = musait[Math.floor(Math.random() * musait.length)];
        ara(m, { kaynak: m, yonlendi: false, demo: demo });
      });
    });
    app.querySelectorAll("[data-sofor-ara]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = sofor(b.dataset.soforAra);
        if (hedefSec(s).yonlendi) { location.href = link("sofor", s.kod); if (HASH) rota(); return; }
        ara(s, { kaynak: s, yonlendi: false, demo: demo });
      });
    });
    var pb = app.querySelector("[data-paylas]");
    if (pb) pb.addEventListener("click", function () { yolculukPaylas(sf[0], true); });
    var eb = app.querySelector("[data-esya]");
    if (eb) eb.addEventListener("click", function () { esyaUnuttum(d, demo); });
  }

  // ======================================================
  // DURAK YÖNETİMİ (durak başkanının ekranı)
  // ======================================================
  function sayfaYonetim(kod) {
    var d = durak(kod) || S.duraklar[0];
    if (!d) return bulunamadi();
    var anahtar = "taksicim_yonetim_" + d.kod;
    var giris = ls(anahtar);
    var sf = S.soforler.filter(function (s) { return s.durak === d.kod; });
    document.title = d.ad + " · Durak paneli";
    var h = '<div class="pn kap" style="max-width:980px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><a class="sf-durak" href="' + link("durak", d.kod) + '"><span class="lamba">TAKSİ</span><span><b>' + esc(d.ad) + "</b><small>Durak paneli</small></span></a>" +
      (giris ? '<button class="btn btn-hayalet" style="min-height:40px;font-size:14px" data-cikis>Çıkış</button>' : "") + "</div>";

    if (!giris) {
      h += '<h1 style="margin-top:22px">Durak paneli</h1><p style="color:var(--soluk);margin-top:6px">Bütün araçlarınız tek ekranda: kim müsait, kim yolcuda, bu ay kime kaç çağrı geldi.</p>' +
        '<form class="kutu" id="yn-form" style="max-width:480px"><label for="yn-pin">Durak PIN<input id="yn-pin" inputmode="numeric" maxlength="6" placeholder="Durak PIN"' + (SUPA ? "" : ' value="1234"') + "></label>" +
        (SUPA ? "" : '<p style="color:var(--soluk);font-size:14px">Demo PIN: <span class="kod">1234</span></p>') +
        '<p id="yn-hata" style="color:var(--kirmizi);font-size:14px" hidden></p><button class="btn btn-sari btn-blok" type="submit">Giriş yap</button></form></div>';
      app.innerHTML = h;
      document.getElementById("yn-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var pin = document.getElementById("yn-pin").value.trim();
        Depo.durakPinDogru(d.kod, pin).then(function (ok) {
          if (!ok) { var he = document.getElementById("yn-hata"); he.textContent = "PIN yanlış."; he.hidden = false; return; }
          ls(anahtar, { pin: pin });
          sayfaYonetim(d.kod);
        });
      });
      return;
    }

    var say = { musait: 0, yolcuda: 0, kapali: 0, bilinmiyor: 0 };
    sf.forEach(function (s) { say[durumu(s.kod).durum]++; });
    h += '<h1 style="margin-top:22px">Şu an durakta</h1>';
    h += '<div class="ozet"><div class="musait"><b>' + say.musait + '</b><small>Müsait</small></div><div class="yolcuda"><b>' + say.yolcuda + '</b><small>Yolcuda</small></div><div class="kapali"><b>' + (say.kapali + say.bilinmiyor) + '</b><small>Kapalı</small></div><div><b id="ay-toplam">…</b><small>Bu ay gelen çağrı</small></div></div>';
    h += '<div class="kutu"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><p style="font-weight:700">Araçlar</p><p style="color:var(--soluk);font-size:13px">Şoför unuttuysa durumunu buradan siz de değiştirebilirsiniz.</p></div><div class="liste" id="yn-liste">';
    sf.forEach(function (s) {
      var kd = durumu(s.kod).durum;
      h += '<div class="yn-satir"><div class="kisi" style="background:transparent;padding:0"><div class="avatar' + (kd === "musait" ? "" : " soluk") + '" aria-hidden="true">' + esc(bas(s.ad)) + '</div><div class="ad"><b>' + esc(s.ad) + "</b><small>" + esc(s.plaka) + ' · <span data-ay="' + s.kod + '">…</span></small>' + durumRozet(s.kod) + "</div></div>" +
        '<div class="yn-dugmeler" role="group" aria-label="' + esc(s.ad) + ' durumu">' +
        [["musait", "Müsait"], ["yolcuda", "Yolcuda"], ["kapali", "Kapalı"]].map(function (o) {
          return '<button type="button" class="' + o[0] + '" data-yn="' + s.kod + '" data-yn-durum="' + o[0] + '" aria-pressed="' + (kd === o[0]) + '">' + o[1] + "</button>";
        }).join("") + "</div></div>";
    });
    h += "</div></div>";
    h += '<div class="kutu"><p style="font-weight:700">Yolcu durakta kaldı mı?</p><p style="color:var(--soluk);font-size:14px;margin-top:-6px">Bir şoför meşgulken gelen çağrının durağın başka aracına gitmesi. Bu çağrılar eskiden başka durağa giderdi.</p><div class="serit" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div><b id="ay-yonlenen">…</b><small>Durak içinde yönlendirilen</small></div><div><b id="ay-konum">…</b><small>WhatsApp konumla gelen</small></div></div></div>';
    h += '<div class="kutu" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))"><a class="btn btn-hayalet" href="' + link("durak", d.kod) + '">Durak sitesini aç</a><a class="btn btn-hayalet" href="' + (HASH ? "#etiket-d-" + d.kod : link("etiket") + "#d-" + d.kod) + '">Etiketleri yazdır</a><a class="btn btn-hayalet" href="https://wa.me/' + waNo(S.marka.iletisimTelefon) + "?text=" + encodeURIComponent(d.ad + " için yeni şoför eklemek istiyorum.") + '" target="_blank" rel="noopener">Yeni şoför ekle</a></div>';
    h += "</div>";
    app.innerHTML = h;

    app.querySelectorAll("[data-yn]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = sofor(b.dataset.yn), yeni = b.dataset.ynDurum;
        Depo.durakGuncelle(d.kod, giris.pin, s.kod, yeni, yeni === "yolcuda" ? HIZLI_DK : null).then(function () {
          sayfaYonetim(d.kod);
          bildir(s.ad + ": " + ETIKET[yeni]);
        }).catch(function (err) { bildir(err.message || "Kaydedilemedi."); });
      });
    });
    var c = app.querySelector("[data-cikis]");
    if (c) c.addEventListener("click", function () { ls(anahtar, null); sayfaYonetim(d.kod); });

    Promise.all(sf.map(function (s) { return Depo.olaylar(s.kod); })).then(function (listeler) {
      var ay = new Date(); ay.setDate(1); ay.setHours(0, 0, 0, 0);
      var tum = {}, top = 0, yon = 0, kon = 0;
      listeler.forEach(function (l) { l.forEach(function (o) { if (!o.zaman || +new Date(o.zaman) >= +ay) tum[(o.id || "") + o.kod + o.tur + o.hedef + o.zaman] = o; }); });
      Object.keys(tum).forEach(function (k) {
        var o = tum[k];
        if (o.tur === "arama" || o.tur === "konum" || o.tur === "yonlendirme") top++;
        if (o.tur === "yonlendirme") yon++;
        if (o.tur === "konum") kon++;
      });
      sf.forEach(function (s) {
        var n = Object.keys(tum).filter(function (k) { var o = tum[k]; return (o.tur === "arama" || o.tur === "konum" || o.tur === "yonlendirme") && (o.hedef || o.kod) === s.kod; }).length;
        var el = app.querySelector('[data-ay="' + s.kod + '"]');
        if (el) el.textContent = "bu ay " + n + " çağrı";
      });
      var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
      set("ay-toplam", top); set("ay-yonlenen", yon); set("ay-konum", kon);
    });
  }

  // ======================================================
  // ŞOFÖR PANELİ
  // ======================================================
  // Gösterge paneline yapışan NFC etiketleri: telefonu dokundur, durum değişsin. Uygulama açmak, PIN yazmak yok.
  var HIZLI = { dolu: 1, bos: 1, degistir: 1 };
  var HIZLI_DK = 25;
  var bekleyenHizli = null;
  function hizliIslem(s, giris, islem) {
    var su = durumu(s.kod).durum;
    var yeni = islem === "dolu" ? "yolcuda" : islem === "bos" ? "musait" : (su === "yolcuda" ? "musait" : "yolcuda");
    Depo.guncelle(s.kod, giris.pin, yeni, yeni === "yolcuda" ? HIZLI_DK : null, null).then(function () {
      var sec = hedefSec(s);
      var renk = yeni === "musait" ? "var(--yesil)" : "var(--amber)";
      app.innerHTML = '<div class="hizli" style="--renk:' + renk + '"><div class="hizli-ic"><span class="hizli-nokta"></span>' +
        "<h1>" + (yeni === "musait" ? "Müsaitsin" : "Yolcudasın") + "</h1><p>" +
        (yeni === "musait" ? "Çağrılar artık sana geliyor."
          : (sec.hedef ? "Çağrılar " + esc(sec.hedef.hitap || sec.hedef.ad) + "'ye gidiyor. " : "Arkadaşların da meşgul, yolcuya durak numarası gösteriliyor. ") + HIZLI_DK + " dakika sonra kendiliğinden müsait olursun.") +
        '</p><a class="btn btn-hayalet" href="' + link("panel") + '" data-panele>Panele git</a></div></div>';
      if (navigator.vibrate) navigator.vibrate(yeni === "musait" ? 60 : [60, 80, 60]);
      var pg = app.querySelector("[data-panele]");
      if (pg && HASH) pg.addEventListener("click", function (e) { e.preventDefault(); location.hash = "#panel"; });
      if (!HASH && history.replaceState) history.replaceState(null, "", location.pathname);
    }).catch(function (err) { bildir(err.message || "Kaydedilemedi. İnternetini kontrol et."); });
  }

  function sayfaPanel(kod) {
    var giris = ls("taksicim_giris");
    var s = giris ? sofor(giris.kod) : null;
    document.title = "Şoför Paneli · " + S.marka.ad;
    if (kod && HIZLI[kod]) {
      if (s) return hizliIslem(s, giris, kod);
      bekleyenHizli = kod; kod = null;
    }
    var h = '<div class="pn uyg">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><a class="logo" href="' + link("tanitim") + '"><span class="lamba">TAKSİ</span>' + esc(S.marka.ad) + "</a>" +
      (s ? '<button class="btn btn-hayalet" style="min-height:40px;font-size:14px" data-cikis>Çıkış</button>' : "") + "</div>";

    if (!s) {
      var secili = kod || "ahmet";
      h += '<h1 style="margin-top:22px">Şoför paneli</h1><p style="color:var(--soluk);margin-top:6px">Müsait misin, yolcuda mısın? Buradan değiştirirsin, yolcuların sayfası anında güncellenir.</p>';
      h += '<form class="kutu" id="giris-form"><label for="pn-sofor">Şoför<select id="pn-sofor">' +
        S.soforler.map(function (x) { return '<option value="' + x.kod + '"' + (x.kod === secili ? " selected" : "") + ">" + esc(x.ad) + " · " + esc(x.plaka) + "</option>"; }).join("") +
        '</select></label><label for="pn-pin">PIN<input id="pn-pin" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="4 haneli PIN"' + (SUPA ? "" : ' value="1234"') + "></label>" +
        (SUPA ? "" : '<p style="color:var(--soluk);font-size:14px">Demo PIN: <span class="kod">1234</span></p>') +
        '<p id="pn-hata" style="color:var(--kirmizi);font-size:14px" hidden></p><button class="btn btn-sari btn-blok" type="submit">Giriş yap</button></form>';
      h += "</div>";
      app.innerHTML = h;
      document.getElementById("giris-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var k = document.getElementById("pn-sofor").value, pin = document.getElementById("pn-pin").value.trim();
        Depo.pinDogru(k, pin).then(function (ok) {
          if (!ok) { var he = document.getElementById("pn-hata"); he.textContent = "PIN yanlış. Tekrar dene."; he.hidden = false; return; }
          ls("taksicim_giris", { kod: k, pin: pin });
          var b = bekleyenHizli; bekleyenHizli = null;
          sayfaPanel(b);
        });
      });
      return;
    }

    var du = durumu(s.kod);
    var yed = yedekleri(s).map(function (x) { return x.kod; });
    var secDurum = du.durum === "bilinmiyor" ? "musait" : du.durum;
    var secDk = (DURUM[s.kod] && DURUM[s.kod].donusDk) || 20;

    h += '<h1 style="margin-top:22px">' + esc(s.hitap || s.ad) + '</h1><p style="color:var(--soluk)">' + esc(s.plaka) + " · Şu an yolcular seni <b style=\"color:var(--metin)\">" + esc(ETIKET[du.durum]) + "</b> görüyor.</p>";
    h += '<div class="kutu"><p style="font-weight:700">Şu an durumun ne?</p><div class="secim" role="group" aria-label="Durum">' +
      [["musait", "Müsaitim", "Çağrılar bana gelsin"], ["yolcuda", "Yolcudayım", "Çağrılar anlaşmalı arkadaşıma gitsin"], ["kapali", "Hizmet dışı", "Bugünlük kapattım"]].map(function (o) {
        return '<button type="button" class="' + o[0] + '" data-durum="' + o[0] + '" aria-pressed="' + (secDurum === o[0]) + '"><i class="nokta"></i><span>' + o[1] + "<small>" + o[2] + "</small></span></button>";
      }).join("") + "</div>" +
      '<div id="dk-sec"' + (secDurum === "yolcuda" ? "" : " hidden") + '><p style="font-weight:600;font-size:14px;margin-bottom:8px">Ne zaman boşalırsın?</p><div class="cipler">' +
      [10, 20, 30, 60].map(function (m) { return '<button type="button" data-dk="' + m + '" aria-pressed="' + (secDk === m) + '">' + m + " dk</button>"; }).join("") + "</div></div>" +
      '<button class="btn btn-sari btn-blok" data-kaydet>Kaydet</button></div>';

    h += '<div class="kutu"><p style="font-weight:700">Meşgulken çağrılar kime gitsin?</p><p style="color:var(--soluk);font-size:14px;margin-top:-6px">Sırayla bakılır: ilk müsait olan arkadaşına gider. Sen müsaitken de onların yolcusu sana gelir.</p><div class="liste" id="yedek-liste"></div>' +
      '<label for="yedek-ekle">Arkadaş ekle<select id="yedek-ekle"><option value="">Seç…</option></select></label></div>';

    h += '<div class="kutu"><p style="font-weight:700">Bu ay</p><div class="serit" id="istatistik" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div><b>…</b><small>Sayfandan arama</small></div><div><b>…</b><small>Sana yönlendirilen</small></div></div></div>';

    h += '<div class="kutu"><p style="font-weight:700">Telefonunu da ayarla</p><p style="color:var(--soluk);font-size:14px;margin-top:-6px">Yolcu seni rehberden direkt ararsa sayfa devreye giremez. Bunun için telefonundan bir kere yönlendirme kodu çevir; meşgulken ya da açmazsan arama arkadaşına geçer. Kodu tuşlara yaz, ara tuşuna bas.</p>' +
      '<div class="tablo-kap"><table class="tablo"><tbody>' +
      (function () {
        var y0 = yed.length ? sofor(yed[0]) : null;
        var no = y0 ? "0" + waNo(y0.telefon).replace(/^90/, "") : "05XXXXXXXXX";
        return '<tr><td><span class="kod">**67*' + no + "#</span></td><td>Meşgulken yönlendir</td></tr>" +
          '<tr><td><span class="kod">**61*' + no + "#</span></td><td>Açmazsan yönlendir</td></tr>" +
          '<tr><td><span class="kod">**62*' + no + "#</span></td><td>Telefon kapalıysa yönlendir</td></tr>" +
          '<tr><td><span class="kod">##002#</span></td><td>Bütün yönlendirmeleri kapat</td></tr>';
      })() +
      '</tbody></table></div><p style="color:var(--soluk);font-size:13px">Numara listedeki ilk arkadaşınındır. Kodlar Turkcell, Vodafone ve Türk Telekom\'da genelde çalışır, ilk kurulumda bir kere deneyerek kontrol et.</p></div>';

    h += '<div class="kutu"><p style="font-weight:700">Uygulamayı hiç açma</p><p style="color:var(--soluk);font-size:14px;margin-top:-6px">Gösterge paneline iki küçük NFC etiketi yapıştırırız. Yolcu binince telefonunu <b style="color:var(--amber)">YOLCU ALDIM</b> etiketine dokundurursun, o kadar. ' + HIZLI_DK + ' dakika sonra kendiliğinden müsait olursun. Erken boşalırsan <b style="color:var(--yesil)">BOŞALDIM</b> etiketine dokundur. Bu telefonda giriş açık kaldığı sürece PIN sorulmaz.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><a class="btn" style="background:var(--amber);color:#111" href="' + link("panel", "dolu") + '">Yolcu aldım</a><a class="btn" style="background:var(--yesil);color:#06210f" href="' + link("panel", "bos") + '">Boşaldım</a></div><p style="color:var(--soluk);font-size:13px">Bu iki buton etikete dokunmanın aynısıdır, deneyebilirsin.</p></div>';

    h += '<div class="kutu" style="grid-template-columns:1fr 1fr"><a class="btn btn-hayalet" href="' + link("sofor", s.kod) + '">Sayfamı aç</a><a class="btn btn-hayalet" href="' + (HASH ? "#etiket-" + s.kod : link("etiket") + "#" + s.kod) + '">Etiketlerim</a></div>';
    h += "</div>";
    app.innerHTML = h;

    function yedekCiz() {
      var l = document.getElementById("yedek-liste");
      l.innerHTML = yed.map(function (k, i) {
        var x = sofor(k);
        return '<div class="yedek-satir"><span class="sira">' + (i + 1) + '</span><span class="ad"><b>' + esc(x.hitap || x.ad) + "</b><small>" + esc(x.plaka) + " · " + esc(ETIKET[durumu(k).durum]) + "</small></span>" +
          '<button type="button" data-yukari="' + i + '" aria-label="Yukarı taşı"' + (i === 0 ? " disabled" : "") + ">" + ik("yukari") + '</button><button type="button" data-asagi="' + i + '" aria-label="Aşağı taşı"' + (i === yed.length - 1 ? " disabled" : "") + ">" + ik("asagi") + '</button><button type="button" data-cikar="' + i + '" aria-label="Çıkar">' + ik("sil") + "</button></div>";
      }).join("") || '<p style="color:var(--soluk);font-size:14px">Henüz kimse yok. Aşağıdan arkadaş ekle.</p>';
      var e = document.getElementById("yedek-ekle");
      e.innerHTML = '<option value="">Seç…</option>' + S.soforler.filter(function (x) { return x.kod !== s.kod && yed.indexOf(x.kod) < 0; }).map(function (x) {
        var xd = duragi(x);
        return '<option value="' + x.kod + '">' + esc(x.ad) + " · " + esc(xd ? xd.ad : "Bağımsız") + "</option>";
      }).join("");
    }
    yedekCiz();
    document.getElementById("yedek-liste").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var i;
      if (b.dataset.yukari) { i = +b.dataset.yukari; yed.splice(i - 1, 0, yed.splice(i, 1)[0]); }
      if (b.dataset.asagi) { i = +b.dataset.asagi; yed.splice(i + 1, 0, yed.splice(i, 1)[0]); }
      if (b.dataset.cikar) { yed.splice(+b.dataset.cikar, 1); }
      yedekCiz();
    });
    document.getElementById("yedek-ekle").addEventListener("change", function (e) {
      if (e.target.value) { yed.push(e.target.value); yedekCiz(); }
    });

    app.querySelectorAll("[data-durum]").forEach(function (b) {
      b.addEventListener("click", function () {
        secDurum = b.dataset.durum;
        app.querySelectorAll("[data-durum]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        document.getElementById("dk-sec").hidden = secDurum !== "yolcuda";
      });
    });
    app.querySelectorAll("[data-dk]").forEach(function (b) {
      b.addEventListener("click", function () {
        secDk = +b.dataset.dk;
        app.querySelectorAll("[data-dk]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      });
    });
    app.querySelector("[data-kaydet]").addEventListener("click", function () {
      Depo.guncelle(s.kod, giris.pin, secDurum, secDurum === "yolcuda" ? secDk : null, yed.slice()).then(function () {
        var sec = hedefSec(s);
        var m = secDurum === "musait" ? "Kaydedildi. Çağrılar sana geliyor."
          : sec.hedef ? "Kaydedildi. Çağrılar şimdi " + (sec.hedef.hitap || sec.hedef.ad) + "'ye gidiyor."
          : "Kaydedildi. Anlaşmalı arkadaşların da meşgul, yolcuya durak numarası gösteriliyor.";
        sayfaPanel();
        bildir(m);
      }).catch(function (err) { bildir(err.message || "Kaydedilemedi. İnternetini kontrol et."); });
    });
    var c = app.querySelector("[data-cikis]");
    if (c) c.addEventListener("click", function () { ls("taksicim_giris", null); sayfaPanel(); });

    Depo.olaylar(s.kod).then(function (ol) {
      var ay = new Date(); ay.setDate(1); ay.setHours(0, 0, 0, 0);
      ol = ol.filter(function (o) { return !o.zaman || +new Date(o.zaman) >= +ay; });
      var arama = ol.filter(function (o) { return o.kod === s.kod && (o.tur === "arama" || o.tur === "konum"); }).length;
      var gelen = ol.filter(function (o) { return o.hedef === s.kod && o.kod !== s.kod && o.tur === "yonlendirme"; }).length;
      var el = document.getElementById("istatistik");
      if (el) el.innerHTML = "<div><b>" + arama + "</b><small>Sayfandan arama ve konum</small></div><div><b>" + gelen + "</b><small>Arkadaşlarından sana gelen</small></div>";
    });
  }

  // ======================================================
  // ETİKET (10x10 cm pleksi baskısı)
  // ======================================================
  function etiketHtml(s, yer) {
    var d = duragi(s);
    var RENK = { sari: "#ffc20e", turuncu: "#ff8a1f", yesil: "#3ddc84", mavi: "#5cc8ff" };
    var r = RENK[(d && d.renk) || s.renk] || "#ffc20e";
    return '<div class="et" style="background:' + r + '"><div class="ust"><span>' + esc(d ? d.ad : s.hitap + " Taksi") + "</span><small>" + esc(s.plaka) + "</small></div>" +
      '<div class="orta"><div class="qr">' + (S.qr && S.qr[s.kod] || "") + '</div><div class="nfc">' + ik("nfc") + "Telefonu<br>yaklaştır<br>ya da okut</div></div>" +
      '<div class="alt"><span>Taksi çağır · Konum gönder · Değerlendir</span><span>' + esc(yer) + "</span></div></div>";
  }
  function sayfaEtiket(kod) {
    var hedef = kod && kod.indexOf("d-") === 0 ? S.soforler.filter(function (x) { return x.durak === kod.slice(2); })
      : kod ? [sofor(kod)].filter(Boolean) : S.soforler;
    document.title = "Etiketler · " + S.marka.ad;
    var h = '<div class="et-sayfa kap"><div class="yazdirma-yok" style="display:grid;gap:10px;margin-bottom:20px"><a class="logo" href="' + link("tanitim") + '"><span class="lamba">TAKSİ</span>' + esc(S.marka.ad) + "</a>" +
      '<h1 style="font-size:40px;text-transform:uppercase">Araç etiketleri</h1><p style="color:var(--soluk);max-width:40em">Her araca 3 etiket: arka sol, arka sağ ve ön. Üçü de aynı linke gider. A4\'e gerçek boyutta (10x10 cm) basılır. NFC çipine de aynı link yazılır: <span class="kod">' + esc(hedef[0] ? tamLink(hedef[0]) : "") + "</span></p>" +
      (HASH ? "" : '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sari" onclick="window.print()">Yazdır</button>' + (kod ? '<a class="btn btn-hayalet" href="./">Bütün şoförler</a>' : "") + "</div>") + "</div>";
    hedef.forEach(function (s) {
      h += '<h2 class="yazdirma-yok" style="font-size:24px;margin:18px 0 10px">' + esc(s.ad) + ' <span class="kod" style="font-size:13px">' + esc(tamLink(s)) + '</span></h2><div class="et-izgara">' +
        etiketHtml(s, "Arka sol") + etiketHtml(s, "Arka sağ") + etiketHtml(s, "Ön") + "</div>";
    });
    h += '<h2 class="yazdirma-yok" style="font-size:24px;margin:26px 0 6px">Gösterge paneli etiketleri</h2><p class="yazdirma-yok" style="color:var(--soluk);max-width:40em;margin-bottom:10px">Her şoföre aynı iki etiket. Şoför telefonunu dokundurunca durumu değişir. NFC çipine yazılacak linkler: <span class="kod">' + esc(S.marka.siteUrl.replace(/\/$/, "") + "/panel/#dolu") + '</span> ve <span class="kod">' + esc(S.marka.siteUrl.replace(/\/$/, "") + "/panel/#bos") + "</span></p>" +
      '<div class="et-izgara">' + [["dolu", "Yolcu aldım", "#ffa62b"], ["bos", "Boşaldım", "#2bd47d"]].map(function (x) {
        return '<div class="et-kucuk" style="background:' + x[2] + '"><div class="qr">' + ((S.qrPanel && S.qrPanel[x[0]]) || "") + "</div><b>" + x[1] + "</b>" + ik("nfc") + "</div>";
      }).join("") + "</div>";
    h += "</div>";
    app.innerHTML = h;
  }

  // ======================================================
  // PLATFORM TANITIM SAYFASI
  // ======================================================
  function sayfaTanitim() {
    var M = S.marka;
    document.title = M.ad + " · Taksiciye özel sayfa, uygulama ve NFC";
    var ornek = sofor("ahmet") || S.soforler[0];
    var yedek = sofor("mehmet") || S.soforler[1];
    var ornekDurak = S.duraklar[0];

    var h = "";
    h += '<header class="tn-nav"><div class="kap"><a class="logo" href="' + link("tanitim") + '"><span class="lamba">TAKSİ</span>' + esc(M.ad) + "</a>" +
      '<a class="btn btn-sari" style="min-height:42px;padding:0 16px" href="#iletisim">Bize yaz</a></div><div class="dama ince" aria-hidden="true"></div></header>';

    // HERO
    h += '<section class="tn-hero"><div class="kap"><div><p class="etiket-ust">' + esc(M.sehir) + " taksicileri için</p>" +
      '<h1 style="margin-top:14px">Yolcun seni <em>bir daha bulsun.</em></h1>' +
      '<p class="giris">Araçtaki pleksiye telefonunu yaklaştıran yolcu, senin sayfanı açar. Bir dahaki sefere tek dokunuşla seni çağırır. Sen yolcudaysan, iş anlaşmalı arkadaşına gider. Yolcu kaçmaz, durakta kalır.</p>' +
      '<div class="eylemler"><a class="btn btn-sari" href="' + link("sofor", ornek.kod) + '">' + ik("tel") + "Şoför sayfasını dene</a>" +
      '<a class="btn btn-hayalet" href="' + link("durak", ornekDurak.kod) + '">' + ik("ev") + "Durak sitesini gör</a></div></div>";

    // Telefon maketi (sabit örnek: Ahmet yolcuda, Mehmet'e yönlendiriyor)
    h += '<div class="telefon" aria-label="Örnek şoför sayfası"><div class="ekran">' +
      '<div class="sf-durak"><span class="lamba">TAKSİ</span><span><b>' + esc(ornekDurak.ad) + '</b><small style="color:#a2a5aa">' + esc(M.sehir) + "</small></span></div>" +
      '<div class="sf-kart"><div class="dama ince"></div><div class="sf-kimlik"><div class="avatar">' + esc(bas(ornek.ad)) + '</div><div><h1>' + esc(ornek.ad) + '</h1><p class="alt" style="color:#a2a5aa">' + esc(ornek.arac) + "</p></div></div>" +
      '<div class="sf-bilgi">' + plaka(ornek.plaka) + '<span class="durum yolcuda">Yolcuda · ~15 dk</span></div>' +
      '<div class="yonlendir"><div class="baslik">' + ik("yonlen") + "<p><b>" + esc(ornek.hitap) + "</b> şu an yolcuda. Anlaşmalı arkadaşı <b>" + esc(yedek.hitap) + "</b> müsait.</p></div></div>" +
      '<div class="sf-cagir"><span class="btn btn-sari btn-cagir"><span class="ust">' + ik("tel") + esc(yedek.hitap) + "'yi Çağır</span><small>" + esc(yedek.plaka) + "</small></span></div></div></div></div>";
    h += "</div></section>";

    // DERT
    h += '<section class="tn-bolum" style="background:var(--yuzey)"><div class="kap"><p class="etiket-ust">Her gün olan</p><h2 style="margin-top:10px">Yolcu seni arıyor, sen yoldasın.</h2>' +
      '<div class="dert">' +
      "<div><b>Kartvizit çöpe gidiyor</b><p>Yolcu kartı cebine koyar, bir hafta sonra kart yoktur. Numaran da yoktur.</p></div>" +
      "<div><b>Meşgulken iş kaçıyor</b><p>Yolcuda olduğun saatte arayan müşteri başka taksiye biner. Bir daha seni aramaz.</p></div>" +
      "<div><b>Konum tarif etmek zor</b><p>\"Şu marketin arkası\" diye beş dakika telefonda kalırsın. Gece daha da zor.</p></div>" +
      "</div></div></section>";

    // NASIL ÇALIŞIR
    h += '<section class="tn-bolum"><div class="kap"><p class="etiket-ust">Nasıl çalışır</p><h2 style="margin-top:10px">Üç adım. Uygulama indirmek yok.</h2><div class="adimlar">' +
      '<div class="adim"><b>Okutur</b><p>Yolcu koltuktaki pleksiye telefonunu yaklaştırır ya da QR\'ı okutur.</p></div>' +
      '<div class="adim"><b>Sayfan açılır</b><p>Adın, plakan, aracın. "Ana ekrana ekle" ile telefonunda uygulama gibi kalır, rehbere de kaydedilir.</p></div>' +
      '<div class="adim"><b>Tek tuşla çağırır</b><p>Bir dahaki sefere seni arar ya da WhatsApp\'tan konumunu yollar. Adres tarifi biter.</p></div>' +
      "</div></div></section>";

    // ANLAŞMALI ŞOFÖR
    h += '<section class="tn-bolum" style="background:var(--yuzey)"><div class="kap"><p class="etiket-ust">Yeni · Anlaşmalı şoför</p><h2 style="margin-top:10px">Sen meşgulken iş arkadaşına gider.</h2>' +
      '<p class="alt-baslik">Her şoför 2-3 arkadaşını seçer. Bugün senin yolcun ona gider, yarın onunki sana gelir. Yolcu beklemez, iş başka durağa kaçmaz.</p>' +
      '<div class="akis">' +
      '<div class="akis-adim"><span class="nokta sari">' + ik("tel") + "</span><div><b>Yolcu " + esc(ornek.hitap) + "'nin sayfasını açar</b><p>Telefonunda kayıtlı, tek dokunuş.</p></div></div>" +
      '<div class="akis-adim"><span class="nokta amber">' + ik("saat") + "</span><div><b>" + esc(ornek.hitap) + " yolcuda</b><p>Yolcuyu alınca telefonunu torpidodaki etikete dokundurmuş. Sayfa bunu yolcuya gösterir.</p></div></div>" +
      '<div class="akis-adim"><span class="nokta yesil">' + ik("yonlen") + "</span><div><b>Çağrı " + esc(yedek.hitap) + "'ye gider</b><p>Listedeki ilk müsait arkadaş. Yolcu isterse yine de " + esc(ornek.hitap) + "'yi bekleyebilir.</p></div></div>" +
      '<div class="akis-adim"><span class="nokta">' + ik("uyari") + "</span><div><b>Durum güncel değilse</b><p>Yolcu aradı, " + esc(ornek.hitap) + " açmadı. Sayfaya dönünce \"Ulaşamadın mı?\" diye sorar ve müsait arkadaşı önerir.</p></div></div>" +
      "</div>" +
      '<div class="uc-katman">' +
      '<div class="katman"><span class="rozet">1 · Sayfa</span><b>Gösterge paneline dokun</b><p>Yolcu binince şoför telefonunu torpidodaki NFC etikete dokundurur. Uygulama açmak yok. 25 dakika sonra kendiliğinden müsait olur.</p></div>' +
      '<div class="katman"><span class="rozet">2 · Geri dönüş</span><b>"Ulaşamadın mı?"</b><p>Şoför düğmeye basmayı unutsa da çalışır. Cevapsız arama sonrası sıradaki müsait arkadaş önerilir.</p></div>' +
      '<div class="katman"><span class="rozet">3 · Telefon</span><b>Hat yönlendirme</b><p>Rehberden direkt arayanlar için. Şoförün telefonuna bir kere kod girilir, meşgulken arama arkadaşına geçer.</p></div>' +
      "</div>" +
      '<div style="margin-top:22px"><a class="btn btn-sari" href="' + link("panel", ornek.kod) + '">' + ik("grafik") + "Şoför panelini dene</a></div>" +
      "</div></section>";

    // PLEKSİ
    h += '<section class="tn-bolum"><div class="kap"><p class="etiket-ust">Araçta</p><h2 style="margin-top:10px">Her araçta 3 pleksi.</h2>' +
      '<div class="pleksi-alan"><div class="pleksi" aria-label="10x10 cm NFC ve QR pleksi örneği"><div class="ust"><span>' + esc(ornekDurak.ad) + '</span><span style="font-size:14px">' + esc(ornek.plaka) + '</span></div><div class="orta"><div class="qr">' + (S.qr && S.qr[ornek.kod] || "") + '</div><div class="nfc">' + ik("nfc") + 'Telefonu yaklaştır<br>ya da okut</div></div><div class="alt">Taksi çağır · Konum gönder · Değerlendir</div></div>' +
      '<div class="pleksi-maddeler">' +
      '<div class="madde">' + ik("tik") + "<p><b>10x10 cm pleksi.</b> Arka sol, arka sağ ve ön koltuk. Yolcunun gözünün önünde.</p></div>" +
      '<div class="madde">' + ik("tik") + "<p><b>NFC ve QR bir arada.</b> Yeni telefonlar dokununca açar, eski telefonlar kamerayla okutur.</p></div>" +
      '<div class="madde">' + ik("tik") + "<p><b>Link değişmez.</b> Telefonun, aracın ya da durağın değişse de pleksi aynı kalır. Bilgiyi biz güncelleriz.</p></div>" +
      '<div class="madde">' + ik("tik") + "<p><b>Google yorumu herkese açık.</b> Yolcu puanı kendisi verir. Google kurallarına uygun, filtre yok.</p></div>" +
      "</div></div></div></section>";

    // ÖZELLİKLER
    var oz = [
      ["konum", "WhatsApp'tan konum", "Yolcu tek dokunuşla konumunu gönderir. Mesaj hazır gelir, adres tarifi yok."],
      ["rehber", "Rehbere kaydet", "Numaran yolcunun rehberine \"Ahmet Abi Taksi\" diye girer. Durağın numarası da yanında."],
      ["ekle", "Telefonda uygulama", "Ana ekrana eklenir, senin adınla açılır. Mağazadan indirme yok."],
      ["ev", "Durak sitesi", "Durağın kendi sitesi. Kaç aracın müsait olduğu canlı görünür."],
      ["grafik", "Aylık rakamlar", "Sayfandan kaç arama geldi, arkadaşlarından kaç iş sana yönlendi."],
      ["kalkan", "Kişisel veri yok", "Yolcunun konumunu ve numarasını saklamayız. Konum yolcunun kendi WhatsApp'ından gider."]
    ];
    h += '<section class="tn-bolum" style="background:var(--yuzey)"><div class="kap"><p class="etiket-ust">Pakette ne var</p><h2 style="margin-top:10px">Şoförün cebindeki dükkan.</h2><div class="ozellikler">' +
      oz.map(function (o) { return '<div class="ozellik" style="background:var(--yuzey-2)"><span class="ik">' + ik(o[0]) + "</span><b>" + esc(o[1]) + "</b><p>" + esc(o[2]) + "</p></div>"; }).join("") +
      "</div></div></section>";

    // DURAK BAŞKANI
    var od = ornekDurak;
    var odSf = S.soforler.filter(function (x) { return x.durak === od.kod; });
    h += '<section class="tn-bolum" id="durak-baskani"><div class="kap"><p class="etiket-ust">Durak başkanı için</p><h2 style="margin-top:10px">Bütün araçların tek ekranda.</h2>' +
      '<p class="alt-baslik">Durağın kendi adıyla, kendi rengiyle sitesi olur. Siz de panelden kimin müsait, kimin yolcuda olduğunu ve bu ay durağa kaç çağrı geldiğini görürsünüz.</p>' +
      '<div class="baskan"><div class="baskan-ekran" aria-label="Durak paneli örneği"><div class="ozet ozet-kucuk"><div class="musait"><b>2</b><small>Müsait</small></div><div class="yolcuda"><b>1</b><small>Yolcuda</small></div><div class="kapali"><b>1</b><small>Kapalı</small></div></div>' +
      '<div class="liste">' + odSf.slice(0, 4).map(function (x, i) {
        var dd = ["yolcuda", "musait", "musait", "kapali"][i] || "musait";
        return '<div class="kisi" style="background:var(--yuzey-2)"><div class="avatar' + (dd === "musait" ? "" : " soluk") + '">' + esc(bas(x.ad)) + '</div><div class="ad"><b>' + esc(x.ad) + "</b><small>" + esc(x.plaka) + '</small></div><span class="durum ' + dd + '">' + ETIKET[dd] + "</span></div>";
      }).join("") + "</div></div>" +
      '<div class="pleksi-maddeler">' +
      '<div class="madde">' + ik("tik") + "<p><b>Durağın kendi sitesi.</b> Durağın adı, rengi, telefonu, hizmetleri. Google'da durağın adıyla bulunur.</p></div>" +
      '<div class="madde">' + ik("tik") + "<p><b>Yolcu durakta kalır.</b> Meşgul şoförün yolcusu durağın boştaki aracına gider, başka durağa değil.</p></div>" +
      '<div class="madde">' + ik("tik") + "<p><b>Aylık rakam.</b> Kaç çağrı geldi, kaçı durak içinde yönlendirildi, hangi şoför ne kadar iş aldı.</p></div>" +
      '<div class="madde">' + ik("tik") + "<p><b>Yolcu güvenliği.</b> Her aracın plakası ve şoförü belli. Yolcu yolculuğunu ailesine tek dokunuşla gönderir. Eşya unutan durağa hazır mesajla yazar.</p></div>" +
      '<div class="madde">' + ik("tik") + "<p><b>Şoföre ek iş yok.</b> Yolcu alınca torpidodaki etikete telefonunu dokundurur. 25 dakika sonra kendiliğinden müsait olur.</p></div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px"><a class="btn btn-sari" href="' + link("durak", od.kod) + '">' + ik("ev") + 'Durak sitesini gör</a><a class="btn btn-hayalet" href="' + link("yonetim", od.kod) + '">' + ik("grafik") + "Durak panelini dene</a></div>" +
      "</div></div></div></section>";

    // TEK ŞOFÖR
    var bag = S.soforler.filter(function (x) { return !x.durak; })[0];
    if (bag) {
      h += '<section class="tn-bolum" style="background:var(--yuzey)"><div class="kap"><p class="etiket-ust">Durakla çalışmayan şoför için</p><h2 style="margin-top:10px">Kendi durağın cebinde.</h2>' +
        '<p class="alt-baslik">Durağı olmayan şoför de aynı sistemi kullanır. Kendi sayfası, kendi müşteri listesi, kendi hizmetleri. Meşgulken işini güvendiği arkadaşına devreder.</p>' +
        '<div style="margin-top:22px"><a class="btn btn-sari" href="' + link("sofor", bag.kod) + '">' + ik("tel") + esc(bag.hitap || bag.ad) + "'nin sayfasını gör</a></div></div></section>";
    }

    // PAKETLER
    h += '<section class="tn-bolum" id="paketler"><div class="kap"><p class="etiket-ust">Fiyat</p><h2 style="margin-top:10px">Bir kere kur, yıl boyu çalışsın.</h2><p class="alt-baslik">Aylık abonelik yok. İlk yıl pakete dahil, sonraki yıllar küçük bir yenileme ücreti.</p><div class="paketler">' +
      (S.paketler || []).map(function (p) {
        return '<div class="paket' + (p.one ? " one" : "") + '">' + (p.one ? '<span class="one-rozet">Duraklar için</span>' : "") + "<div><h3>" + esc(p.ad) + '</h3><p class="kime">' + esc(p.kime) + '</p></div><div><p class="fiyat">' + esc(p.fiyat) + '</p><p class="fiyat-not">' + esc(p.not) + "<br>" + esc(p.yenileme) + "</p></div><ul>" +
          p.maddeler.map(function (m) { return "<li>" + ik("tik") + "<span>" + esc(m) + "</span></li>"; }).join("") + "</ul></div>";
      }).join("") + "</div>" +
      '<div class="pilot"><h3>Önce dene, sonra karar ver.</h3><p>Durağına gelip 1 araca ücretsiz kurarız. 30 gün kullan, gelen aramaları panelde kendin gör. Beğenmezsen pleksiyi sökeriz, borcun olmaz.</p><a class="btn" href="https://wa.me/' + waNo(M.iletisimTelefon) + "?text=" + encodeURIComponent("Merhaba, taksi sayfası için ücretsiz denemeyi konuşmak istiyorum.") + '" target="_blank" rel="noopener">' + ik("wa") + "Ücretsiz deneme iste</a></div>" +
      "</div></section>";

    // SSS
    var sss = [
      ["Yolcu uygulama indirmek zorunda mı?", "Hayır. Pleksiye dokununca sayfa tarayıcıda açılır. İsterse ana ekrana ekler, istemezse rehbere kaydeder."],
      ["Telefon numaram değişirse pleksiyi değiştirecek miyim?", "Hayır. Pleksideki link hep aynı kalır. Biz yeni numaranı sisteme gireriz, aynı gün güncellenir."],
      ["Anlaşmalı arkadaşımı ben mi seçiyorum?", "Evet. Panelden 2-3 arkadaşını sırayla seçersin. İstediğin zaman değiştirirsin."],
      ["Müsait düğmesine basmayı unutursam?", "Sayfa yine seni arar. Yolcu ulaşamazsa sayfaya dönünce müsait arkadaşını önerir. Telefonuna yönlendirme kodu da kurarsak açamadığın arama arkadaşına geçer."],
      ["Google yorumlarını siz mi yazıyorsunuz?", "Hayır. Butona basan yolcu Google'ın kendi ekranında puanını kendisi verir. Sahte yorum ya da filtreleme yapmayız, Google bunu yasaklıyor."],
      ["Yıllık ücret neyi kapsıyor?", "Sayfanın açık kalması, bilgi güncellemeleri, şoför paneli ve destek. Pleksi kırılırsa yenisini maliyetine basarız."]
    ];
    h += '<section class="tn-bolum" style="background:var(--yuzey)"><div class="kap" style="max-width:820px"><p class="etiket-ust">Sorular</p><h2 style="margin-top:10px">Taksicilerin sorduğu.</h2><div style="margin-top:24px">' +
      sss.map(function (q) { return '<details class="sss" style="background:var(--yuzey-2)"><summary>' + esc(q[0]) + "</summary><p>" + esc(q[1]) + "</p></details>"; }).join("") +
      "</div></div></section>";

    // İLETİŞİM
    h += '<section class="tn-bolum" id="iletisim"><div class="kap"><p class="etiket-ust">İletişim</p><h2 style="margin-top:10px">Durağına gelelim, gösterelim.</h2><p class="alt-baslik">10 dakikada telefonunda sayfanı açıp gösteririz. ' + esc(M.sehir) + ' içinde ücretsiz geliyoruz.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:22px"><a class="btn btn-wa" href="https://wa.me/' + waNo(M.iletisimTelefon) + "?text=" + encodeURIComponent("Merhaba, taksi sayfası hakkında bilgi almak istiyorum.") + '" target="_blank" rel="noopener">' + ik("wa") + "WhatsApp'tan yaz</a>" +
      '<span class="btn btn-hayalet" style="user-select:all">' + ik("tel") + esc(telGoster(M.iletisimTelefon)) + "</span></div></div></section>";

    h += '<footer class="tn-alt"><div class="dama" aria-hidden="true" style="margin-bottom:28px"></div><div class="kap"><p>© ' + new Date().getFullYear() + " " + esc(M.ad) + " · " + esc(M.gelistirici) + " · " + esc(M.iletisimEposta) + '</p><p><a href="' + link("panel") + '" style="color:var(--sari-metin)">Şoför girişi</a></p></div></footer>';
    app.innerHTML = h;
  }

  function bulunamadi() {
    app.innerHTML = '<div class="uyg" style="padding-block:60px;display:grid;gap:14px"><span class="lamba">TAKSİ</span><h1 style="font-size:44px;text-transform:uppercase">Sayfa bulunamadı</h1><p style="color:var(--soluk)">Bu link artık kullanılmıyor olabilir. Şoförünüze ya da durağa sorun.</p><a class="btn btn-sari" href="' + link("tanitim") + '">Ana sayfa</a></div>';
  }

  // Her durağın kendi rengi (data/site.json → durak.renk): sari, turuncu, yesil, mavi
  function renkAyarla(v, k) {
    var d = v === "durak" || v === "yonetim" ? durak(k) : v === "sofor" ? duragi(sofor(k)) || sofor(k) : null;
    var r = (d && d.renk) || "";
    if (r) document.documentElement.setAttribute("data-renk", r); else document.documentElement.removeAttribute("data-renk");
  }

  // ---------- yönlendirici ----------
  function rota() {
    kapat();
    var v, k;
    if (HASH) {
      var hs = location.hash.replace(/^#/, "") || "tanitim";
      if (hs.indexOf("t-") === 0) { v = "sofor"; k = hs.slice(2); }
      else if (hs.indexOf("d-") === 0) { v = "durak"; k = hs.slice(2); }
      else if (hs.indexOf("y-") === 0) { v = "yonetim"; k = hs.slice(2); }
      else if (hs.indexOf("panel") === 0) { v = "panel"; k = hs.slice(6) || null; }
      else if (hs.indexOf("etiket") === 0) { v = "etiket"; k = hs.slice(7) || null; }
      else if (hs === "tanitim") v = "tanitim";
      else return; // sayfa içi bağlantı (#iletisim gibi)
    } else {
      v = P.view; k = P.kod || (v === "panel" || v === "etiket" ? location.hash.replace(/^#/, "") || null : null);
    }
    renkAyarla(v, k);
    if (v === "sofor") sayfaSofor(k);
    else if (v === "durak") sayfaDurak(k);
    else if (v === "yonetim") sayfaYonetim(k);
    else if (v === "panel") sayfaPanel(k);
    else if (v === "etiket") sayfaEtiket(k);
    else if (v === "yok") bulunamadi();
    else sayfaTanitim();
    if (HASH) window.scrollTo(0, 0);
  }

  Depo.yukle().then(rota);
  if (HASH || P.view === "panel") window.addEventListener("hashchange", rota);

  // Başka sekmede (panelde) durum değişince sayfa tazelensin; Supabase'de 30 sn'de bir sor.
  window.addEventListener("storage", function (e) {
    if (e.key === "taksicim_durum" || e.key === "taksicim_yedek") Depo.yukle().then(function () { if (!document.querySelector(".perde") && !(P && P.view === "panel")) rota(); });
  });
  if (SUPA) setInterval(function () {
    if (document.hidden || document.querySelector(".perde") || (P && P.view === "panel")) return;
    Depo.yukle().then(rota);
  }, 30000);

  if (!HASH && "serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register(P.base + "sw.js").catch(function () {}); });
  }
})();
