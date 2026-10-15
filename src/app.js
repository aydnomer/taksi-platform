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
  // Türkçe ek: ek("Mehmet Abi", "e") → "Mehmet Abi'ye", ek("Kale Taksi", "in") → "Kale Taksi'nin", ek("Kemal Arslan", "a") → "Kemal Arslan'a"
  function ek(ad, tur) {
    ad = String(ad || "").trim();
    var kucuk = ad.toLocaleLowerCase("tr-TR");
    var u = (kucuk.match(/[aeıioöuü]/g) || ["e"]).pop();
    var unluyle = /[aeıioöuü]$/.test(kucuk);
    var kalin = "aıou".indexOf(u) >= 0;
    var dort = { a: "ı", ı: "ı", e: "i", i: "i", o: "u", u: "u", ö: "ü", ü: "ü" }[u];
    var e = tur === "e" || tur === "a" ? (unluyle ? "y" : "") + (kalin ? "a" : "e")
      : tur === "i" ? (unluyle ? "y" : "") + dort
      : tur === "in" ? (unluyle ? "n" : "") + dort + "n"
      : tur === "de" ? (/[fstkçşhp]$/.test(kucuk) ? "t" : "d") + (kalin ? "a" : "e") : "";
    return ad + "'" + e;
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

  // ---------- Ziyaretçi nereden geldi? ----------
  // QR kodlarda ?k=q, NFC çiplerinde ?k=n yazılı. Ana ekrandaki uygulamadan açılırsa "uygulama".
  // İsim, numara, konum yok: sadece bu telefona özel rastgele bir sayı (cihaz) tutulur.
  var KAYNAK = (function () {
    var q = (location.search.match(/[?&]k=([a-z0-9]+)/i) || [])[1];
    if (q) {
      var k = /^n/i.test(q) ? "nfc" : /^q/i.test(q) ? "qr" : "link";
      ss("taksicim_kaynak" + location.pathname, k);
      try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
      return k;
    }
    if ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true) return "uygulama";
    var once = ss("taksicim_kaynak" + location.pathname);
    if (once) return once;
    if (/\/d\//.test(document.referrer || "")) return "durak";
    return "link";
  })();
  var CIHAZ = (function () {
    var c = ls("taksicim_cihaz");
    if (!c) { c = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); ls("taksicim_cihaz", c); }
    return c;
  })();

  if ((KAYNAK === "nfc" || KAYNAK === "qr") && !ls("taksicim_ilk_kaynak")) ls("taksicim_ilk_kaynak", KAYNAK);
  // Oturum başına bir ziyaret; uygulama ana ekrandan ilk açıldığında (iPhone dahil) bir kurulum.
  function ziyaretSay(kod) {
    if (ss("taksicim_z_" + kod)) return;
    ss("taksicim_z_" + kod, 1);
    Depo.olay(kod, "ziyaret");
    if (KAYNAK === "uygulama") kurulumSay(kod);
  }
  function kurulumSay(kod) {
    if (ls("taksicim_kuruldu_" + kod)) return;
    ls("taksicim_kuruldu_" + kod, 1);
    Depo.olay(kod, "kurulum", ls("taksicim_ilk_kaynak"));
  }

  // Tema: telefonun ayarına uyar; isteyen panelden açık/koyu seçer (güneşte açık, gece koyu)
  (function () { var t = ls("taksicim_tema"); if (t) document.documentElement.setAttribute("data-theme", t); })();
  function temaDugmesi() {
    return '<button type="button" class="tema-dugme" data-tema aria-label="Açık ya da koyu görünüm">' + ik("gunes") + "</button>";
  }
  function temaBagla() {
    var b = app.querySelector("[data-tema]");
    if (!b) return;
    b.addEventListener("click", function () {
      var koyu = document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
      var yeni = koyu ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", yeni);
      ls("taksicim_tema", yeni);
    });
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
    kart: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    gunes: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
  };
  function ik(ad) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[ad] + "</svg>";
  }
  var GOOGLE_G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  // QR: önizlemede veri içinde gelir; gerçek sitede her şoförün klasöründeki qr.svg kullanılır (sayfa hafif kalsın)
  function qrHtml(kod) {
    if (S.qr && S.qr[kod]) return S.qr[kod];
    return '<img src="' + (P ? P.base : "") + "t/" + encodeURIComponent(kod) + '/qr.svg" alt="' + esc(kod) + ' QR kodu" width="200" height="200">';
  }
  function qrPanelHtml(k) {
    if (S.qrPanel && S.qrPanel[k]) return S.qrPanel[k];
    return '<img src="' + (P ? P.base : "") + "panel/qr-" + k + '.svg" alt="" width="200" height="200">';
  }
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
  var BAGLANTI_YOK = false;

  // Bir şoförün ya da durağın sayılarına giren sayfa kodları ("d:kod" = durak sitesi)
  function olayKodlari(tip, kod) {
    if (tip === "hepsi") return null;
    var ic = Object.create(null);
    if (tip === "sofor") ic[kod] = 1;
    if (tip === "durak") { ic["d:" + kod] = 1; S.soforler.forEach(function (s) { if (s.durak === kod) ic[s.kod] = 1; }); }
    return ic;
  }

  var Bulut = SUPA ? {
    yukle: function () {
      var h = { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey };
      return fetch(SUPA.supabaseUrl + "/rest/v1/durumlar?select=kod,durum,donus_dk,yedekler,guncelleme", { headers: h })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (rows) {
          // Örnek (demo) şoförlerin durumu telefonda kalır, gerçeklerinki sunucudan gelir
          Object.keys(DURUM).forEach(function (k) { if (!demoKod(k)) delete DURUM[k]; });
          Object.keys(YEDEK).forEach(function (k) { if (!demoKod(k)) delete YEDEK[k]; });
          BAGLANTI_YOK = false;
          rows.forEach(function (r) {
            if (demoKod(r.kod)) return;
            DURUM[r.kod] = { durum: r.durum, donusDk: r.donus_dk, zaman: Date.parse(r.guncelleme) };
            if (r.yedekler && r.yedekler.length) YEDEK[r.kod] = r.yedekler;
          });
        })
        .catch(function () { BAGLANTI_YOK = true; }); // internet yoksa son bilinen durum kalır; 8 saatten eskisi zaten "bilinmiyor" sayılır
    },
    guncelle: function (kod, pin, durum, donusDk, yedekler) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/durum_guncelle", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_kod: kod, p_pin: pin, p_durum: durum, p_donus_dk: donusDk || null, p_yedekler: yedekler || null })
      }).catch(function () { throw new Error("baglanti"); }).then(function (r) { if (!r.ok) throw new Error("baglanti"); return r.json(); }).then(function (ok) {
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
      }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (ok) { return ok === true; }).catch(function () { return null; });
    },
    durakPinDogru: function (durakKod, pin) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/durak_pin_kontrol", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_durak: durakKod, p_pin: pin })
      }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (ok) { return ok === true; }).catch(function () { return null; });
    },
    durakGuncelle: function (durakKod, pin, kod, durum, donusDk) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/durak_durum_guncelle", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_durak: durakKod, p_pin: pin, p_kod: kod, p_durum: durum, p_donus_dk: donusDk || null })
      }).catch(function () { throw new Error("baglanti"); }).then(function (r) { if (!r.ok) throw new Error("baglanti"); return r.json(); }).then(function (ok) {
        if (ok !== true) throw new Error("PIN yanlış");
        DURUM[kod] = { durum: durum, donusDk: donusDk, zaman: Date.now() };
      });
    },
    olay: function (kod, tur, hedef) {
      fetch(SUPA.supabaseUrl + "/rest/v1/olaylar", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ kod: kod, tur: tur, hedef: hedef || null, kaynak: KAYNAK, cihaz: CIHAZ })
      }).catch(function () {});
    },
    // Sayılar sadece PIN'le okunur: şoför kendininkini, durak başkanı durağınınkini, biz hepsini.
    // tip: "sofor" | "durak" | "hepsi". PIN yanlışsa null döner.
    olaylar: function (tip, kod, pin, baslangic) {
      return fetch(SUPA.supabaseUrl + "/rest/v1/rpc/olay_listesi", {
        method: "POST",
        headers: { apikey: SUPA.supabaseAnonKey, Authorization: "Bearer " + SUPA.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_tip: tip, p_kod: kod || null, p_pin: pin, p_baslangic: baslangic ? new Date(baslangic).toISOString() : null })
      }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (l) { return l ? l.map(function (o) { o.zaman = Date.parse(o.zaman); return o; }) : null; })
        .catch(function () { return false; }); // false: sunucuya ulaşılamadı, null: PIN yanlış
    }
  } : null;

  // Örnek sayfalar (demo) her zaman bu telefonda çalışır, PIN 1234: satışta göstermek için
  var Yerel = {
    yukle: function () {
      var kayit = ls("taksicim_durum") || {};
      var tohum = S.demoDurum || {};
      DURUM = {};
      S.soforler.forEach(function (s) {
        if (SUPA && !demoMu(s)) return;
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
      OLAYLAR.push({ kod: kod, tur: tur, hedef: hedef || null, kaynak: KAYNAK, cihaz: CIHAZ, zaman: Date.now() });
      if (OLAYLAR.length > 3000) OLAYLAR = OLAYLAR.slice(-3000);
      ls("taksicim_olay", OLAYLAR);
    },
    olaylar: function (tip, kod, pin, baslangic) {
      if (pin !== "1234") return Promise.resolve(null);
      var l = OLAYLAR.concat(ls("taksicim_ornek") || []);
      var ic = olayKodlari(tip, kod);
      return Promise.resolve(l.filter(function (o) {
        return (!baslangic || o.zaman >= baslangic) && (!ic || ic[o.kod] || ic[o.hedef]);
      }));
    }
  };

  // Kod örnek bir sayfaya mı ait? ("d:kod" durak sitesi, yoksa şoför kodu)
  function demoKod(k) {
    if (!k) return false;
    if (k.indexOf("d:") === 0) { var d = S.duraklar.filter(function (x) { return x.kod === k.slice(2); })[0]; return !!(d && d.demo); }
    var s = sofor(k); return !!(s && demoMu(s));
  }
  function demoDurak(k) { var d = S.duraklar.filter(function (x) { return x.kod === k; })[0]; return !!(d && d.demo); }

  // Supabase ayarlıysa gerçek şoförler sunucuya, örnekler telefona gider; ayarlı değilse hepsi telefonda
  var Depo = !Bulut ? Yerel : {
    yukle: function () { return Yerel.yukle().then(Bulut.yukle); },
    guncelle: function (kod, pin, durum, donusDk, yedekler) { return (demoKod(kod) ? Yerel : Bulut).guncelle(kod, pin, durum, donusDk, yedekler); },
    pinDogru: function (kod, pin) { return (demoKod(kod) ? Yerel : Bulut).pinDogru(kod, pin); },
    durakPinDogru: function (durakKod, pin) { return (demoDurak(durakKod) ? Yerel : Bulut).durakPinDogru(durakKod, pin); },
    durakGuncelle: function (durakKod, pin, kod, durum, donusDk) { return (demoDurak(durakKod) ? Yerel : Bulut).durakGuncelle(durakKod, pin, kod, durum, donusDk); },
    olay: function (kod, tur, hedef) { (demoKod(kod) ? Yerel : Bulut).olay(kod, tur, hedef); },
    olaylar: function (tip, kod, pin, baslangic) {
      var yerel = tip === "sofor" ? demoKod(kod) : tip === "durak" ? demoDurak(kod) : pin === "1234"; // rapor: 1234 örnek veriyi açar
      return (yerel ? Yerel : Bulut).olaylar(tip, kod, pin, baslangic);
    }
  };

  // Google Analytics: sadece yolcu sayfalarında, çerezsiz (yolcuya izin penceresi gerekmez).
  // Her sayaç olayı GA'ya da gider; şoför kodu ve nereden geldiği (nfc, qr, uygulama…) yanında.
  var GA_AD = { ziyaret: "sayfa_acildi", arama: "arama", konum: "whatsapp_konum", yonlendirme: "arkadasa_yonlendi", rehber: "rehbere_kaydet", google: "google_yorum", kurulum: "uygulamadan_acildi", paylas: "paylas", esya: "esya_unuttum" };
  var GA = (function () {
    var id = S.ayarlar && S.ayarlar.googleAnalytics;
    if (!id || HASH || ["sofor", "durak", "tanitim"].indexOf(P.view) < 0) return null;
    var sf = P.view === "sofor" ? sofor(P.kod) : null;
    var dk = P.view === "durak" ? S.duraklar.filter(function (x) { return x.kod === P.kod; })[0] : null;
    if ((sf && demoMu(sf)) || (dk && dk.demo)) return null; // örnek sayfalar sayıları kirletmesin
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id, { client_storage: "none", allow_google_signals: false, allow_ad_personalization_signals: false, kaynak: KAYNAK });
    var sc = document.createElement("script");
    sc.async = true; sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(sc);
    return window.gtag;
  })();
  if (GA) {
    var depoOlay = Depo.olay;
    Depo.olay = function (kod, tur, hedef) {
      depoOlay(kod, tur, hedef);
      GA("event", GA_AD[tur] || tur, { sofor: kod, hedef: hedef || "", kaynak: KAYNAK });
    };
  }

  var ETIKET = { musait: "Müsait", yolcuda: "Yolcuda", kapali: "Kapalı", bilinmiyor: "Durumu bilinmiyor" };

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
  // Yolcu sayfalarında "durumu bilinmiyor" yazmayız: şoför hiç basmasa da sayfa normal görünür
  function yolcuRozet(kod) { return durumu(kod).durum === "bilinmiyor" ? "" : durumRozet(kod); }
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
  var pencereOnce = null; // pencere kapanınca odak, açan düğmeye döner
  function pencere(html) {
    var acan = document.querySelector(".perde") ? pencereOnce : document.activeElement;
    kapat();
    pencereOnce = acan;
    var p = document.createElement("div");
    p.className = "perde";
    p.innerHTML = '<div class="pencere" role="dialog" aria-modal="true" aria-labelledby="pencere-baslik"><div class="tutac"></div><div class="ic">' + html + "</div></div>";
    var hb = p.querySelector("h3");
    if (hb) hb.id = "pencere-baslik";
    p.addEventListener("click", function (e) { if (e.target === p || e.target.closest("[data-kapat]")) kapat(); });
    document.body.appendChild(p);
    p.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = p.querySelectorAll("button:not([disabled]), a[href], input, select, textarea");
      if (!f.length) return;
      var ilk = f[0], son = f[f.length - 1];
      if (e.shiftKey && document.activeElement === ilk) { son.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === son) { ilk.focus(); e.preventDefault(); }
    });
    app.inert = true;
    var f = p.querySelector("button, a"); // giriş kutusuna odaklanırsak telefonda klavye kendiliğinden açılır
    if (f) f.focus({ preventScroll: true });
    return p;
  }
  function kapat() {
    var p = document.querySelector(".perde");
    if (!p) return;
    app.inert = false;
    p.remove();
    if (pencereOnce && document.body.contains(pencereOnce) && pencereOnce.focus) pencereOnce.focus({ preventScroll: true });
    pencereOnce = null;
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") kapat(); });
  var bildirimZaman;
  // geriAl verilirse bildirimde "Geri al" düğmesi çıkar
  function bildir(m, geriAl) {
    var b = document.querySelector(".bildirim");
    if (!b) { b = document.createElement("div"); b.className = "bildirim"; b.setAttribute("role", "status"); document.body.appendChild(b); }
    b.classList.toggle("ust", !!document.querySelector(".perde"));
    b.innerHTML = "<span>" + esc(m) + "</span>" + (geriAl ? '<button type="button">Geri al</button>' : "");
    if (geriAl) b.querySelector("button").addEventListener("click", function () { b.remove(); geriAl(); });
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(function () { b.remove(); }, geriAl ? 6000 : 3200);
  }

  // ---------- EYLEMLER: ara, konum gönder, rehbere kaydet ----------
  function ara(kisi, ctx) {
    // kisi: şoför ya da durak. ctx: { kaynak: sayfanın şoförü, yonlendi: bool }
    var demo = ctx.demo;
    var ok = ctx.olayKod || (ctx.kaynak && ctx.kaynak.kod);
    if (ok) Depo.olay(ok, ctx.yonlendi ? "yonlendirme" : "arama", kisi.kod);
    var ad = kisi.hitap || kisi.ad;
    if (demo || HASH) {
      var y = ctx.kaynak ? hedefSec(ctx.kaynak, [kisi.kod]) : null;
      pencere(
        '<p class="etiket-ust">Demo</p><h3>' + esc(ad) + " aranıyor</h3>" +
        "<p>Gerçek sayfada telefon şimdi <b>" + esc(telGoster(kisi.telefon)) + "</b> numarasını arar.</p>" +
        (y && y.hedef
          ? '<p style="color:var(--soluk)">Yolcu aradı ama ' + esc(ad) + " açmadıysa, sayfaya geri döndüğünde ona bunu sorarız:</p>" +
            '<button class="btn btn-sari btn-blok" data-ulasamadim>Sayfaya dönünce ne sorulur?</button>'
          : "") +
        '<button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>'
      );
      var u = document.querySelector("[data-ulasamadim]");
      if (u) u.addEventListener("click", function () { ulasamadim(ctx.kaynak, kisi.kod, true); });
      return;
    }
    // Bilgisayarda "tel:" bir işe yaramaz: numarayı büyük göster
    if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !("ontouchstart" in window)) {
      pencere('<p class="etiket-ust">Telefonundan ara</p><h3>' + esc(ad) + '</h3><a class="tel-buyuk" href="tel:' + esc(telSade(kisi.telefon)) + '">' + esc(telGoster(kisi.telefon)) + '</a><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
      return;
    }
    if (ctx.kaynak) ss("taksicim_son_arama", { kaynak: ctx.kaynak.kod, aranan: kisi.kod, t: Date.now() });
    location.href = "tel:" + telSade(kisi.telefon);
  }

  // Yolcu aradı, sayfaya döndü: "Ulaşabildin mi?" Değilse sıradaki müsait şoför.
  // Önce sorulur: "Ulaşabildin mi?" Evet/Hayır eşit büyüklükte; yanlışlıkla ikinci taksi çağrılmasın.
  function ulasamadim(kaynak, arananKod, demo) {
    var aranan = sofor(arananKod) || kaynak;
    var ad = aranan.hitap || aranan.ad;
    pencere('<h3>' + esc(ek(ad, "e")) + " ulaşabildin mi?</h3>" +
      '<div class="iki-secim"><button class="btn btn-hayalet" data-kapat>' + ik("tik") + "Evet, geliyor</button><button class=\"btn btn-hayalet\" data-hayir>" + ik("sil") + "Hayır, açmadı</button></div>");
    document.querySelector("[data-hayir]").addEventListener("click", function () { ulasamadimSecenek(kaynak, arananKod, demo); });
  }
  function ulasamadimSecenek(kaynak, arananKod, demo) {
    var aranan = sofor(arananKod) || kaynak;
    var y = hedefSec(kaynak, [arananKod]);
    var ad = aranan.hitap || aranan.ad;
    var d = duragi(kaynak);
    var html = '<p class="etiket-ust">Ulaşamadın</p><h3>' + esc(ad) + " açmadıysa dert etme</h3>";
    if (y.hedef) {
      html += "<p>" + (y.hedef.kod === kaynak.kod ? "" : esc(ek(kaynak.hitap || kaynak.ad, "in")) + " anlaşmalı arkadaşı ") + "<b>" + esc(y.hedef.hitap || y.hedef.ad) + "</b> şu an müsait. " + esc(y.hedef.arac) + ", " + esc(y.hedef.plaka) + ".</p>" +
        '<button class="btn btn-sari btn-blok" data-git="' + y.hedef.kod + '">' + ik("tel") + esc(ek(y.hedef.hitap || y.hedef.ad, "i")) + " ara</button>" +
        '<button class="btn btn-wa btn-blok" data-wa="' + y.hedef.kod + '">' + ik("wa") + "WhatsApp'tan konum at</button>";
    } else if (d) {
      html += "<p>Anlaşmalı şoförlerin hepsi şu an yolcuda. Durağı ara, ilk boşalan araç gelsin.</p>" +
        '<button class="btn btn-sari btn-blok" data-durak>' + ik("tel") + esc(d.ad) + " durağını ara</button>";
    } else {
      html += "<p>Anlaşmalı şoförlerin hepsi şu an yolcuda. Birkaç dakika sonra tekrar dene.</p>";
    }
    html += '<button class="btn btn-hayalet btn-blok" data-kapat>Kapat</button>';
    pencere(html);
    var c = { kaynak: kaynak, yonlendi: true, demo: demo };
    var g = document.querySelector("[data-git]");
    if (g) g.addEventListener("click", function () { ara(y.hedef, c); });
    var w = document.querySelector("[data-wa]");
    if (w) w.addEventListener("click", function () { konumGonder(y.hedef, c); });
    var dd = document.querySelector("[data-durak]");
    if (dd) dd.addEventListener("click", function () { ara(d, c); });
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
    var ok = ctx.olayKod || (ctx.kaynak && ctx.kaynak.kod);
    if (ok) Depo.olay(ok, ctx.yonlendi ? "yonlendirme" : "konum", kisi.kod);
    function gonder(lat, lng) {
      var m = "Merhaba " + ad + ", taksi lazım.";
      if (lat != null) m += "\nKonumum: https://maps.google.com/?q=" + lat.toFixed(6) + "," + lng.toFixed(6);
      else m += "\nAdresim: ";
      if (ctx.yonlendi && ctx.kaynak) m += "\n(" + (ctx.kaynak.hitap || ctx.kaynak.ad) + " meşguldü, sayfasından size yönlendirildim.)";
      if (ctx.demo || HASH) {
        pencere('<p class="etiket-ust">Demo</p><h3>WhatsApp mesajı hazır</h3><p>Gerçek sayfada ' + esc(ek(ad, "in")) + " WhatsApp'ı bu mesajla açılır. Yolcu sadece Gönder'e basar.</p>" +
          '<div class="mesaj">' + esc(m) + '</div><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
        return;
      }
      location.href = "https://wa.me/" + waNo(kisi.whatsapp || kisi.telefon) + "?text=" + encodeURIComponent(m);
    }
    if (HASH || ctx.demo) {
      var d0 = duragi(ctx.kaynak || kisi) || (kisi.konum ? kisi : null);
      return gonder(d0 && d0.konum ? d0.konum.lat : 38.6748, d0 && d0.konum ? d0.konum.lng : 39.2225);
    }
    if (!navigator.geolocation) return gonder(null, null); // sahte konum göndermeyiz, yolcu adresini yazar
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
    if (HASH || demoMu(s)) {
      pencere('<p class="etiket-ust">Demo</p><h3>Numara rehbere eklenir</h3><p>Telefonda bu butona basınca "' + esc((s.hitap || s.ad) + " Taksi") + '" kişi olarak kaydedilir. İçinde şoförün ve durağın numarası, bir de bu sayfanın linki olur.</p><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
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
      kurulumIstegi.userChoice.then(function (c) { kurulumIstegi = null; if (c && c.outcome === "accepted" && s) kurulumSay(s.kod); });
      return;
    }
    var rehber = s ? '<button class="btn btn-sari btn-blok" data-rehber-pencere>' + ik("rehber") + "Tek dokunuşla rehbere kaydet</button>" : "";
    var uygAdi = s ? (s.hitap || s.ad).replace(/ Abi$/, "") + " Taksi" : ad;
    var html = '<p class="etiket-ust">Uygulama gibi kullan</p><h3>' + esc(ad) + " telefonunda kalsın</h3>";
    if (UYG_ICI) {
      html += "<p>Bu sayfa şu an WhatsApp ya da Instagram'ın içinde açıldı. Burada ana ekrana ekleme yok. En kolayı rehbere kaydetmek:</p>" + rehber +
        (IOS ? "<p><b>Ya da:</b> sağ üstteki <b>•••</b> ya da pusula simgesine dokun, <b>Safari'de aç</b>'ı seç, açılan sayfada tekrar <b>Ana ekrana ekle</b>'ye bas.</p>"
          : "<p><b>Ya da:</b> sağ üstteki <b>⋮</b> menüsünden <b>Chrome'da aç</b>'ı seç, açılan sayfada tekrar <b>Ana ekrana ekle</b>'ye bas.</p>") +
        '<button class="btn btn-hayalet btn-blok" data-kopyala>Linki kopyala</button>';
    } else if (IOS) {
      html += '<ol class="ios-adim">' +
        "<li><span>1</span><p>Safari'nin altındaki " + PAYLAS_IK + " <b>Paylaş</b> düğmesine dokun. Görmüyorsan önce <b>•••</b>'ye bas.</p></li>" +
        "<li><span>2</span><p>Açılan listeyi yukarı kaydır, " + EKLE_IK + " <b>Ana Ekrana Ekle</b>'yi seç.</p></li>" +
        "<li><span>3</span><p>Sağ üstteki <b>Ekle</b>'ye bas. Ekranında <b>" + esc(uygAdi) + "</b> simgesi belirir.</p></li></ol>" +
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
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { bildir(IOS ? "Link kopyalandı. Safari'ye yapıştır." : "Link kopyalandı. Chrome'a yapıştır."); }, function () { bildir(u); });
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
  function demoSerit(metin) {
    return '<div class="demo-serit">' + metin + "</div>";
  }

  // ---------- ortak görsel parçalar ----------
  // Fotoğraf yoksa çizim: gece sokakta sarı taksi. Renk durağın rengini izler.
  function taksiCizim(soluk, kapak) {
    return '<svg class="cizim' + (soluk ? " soluk" : "") + '" viewBox="0 0 400 250" preserveAspectRatio="' + (kapak ? "xMidYMax meet" : "xMidYMax slice") + '" aria-hidden="true">' +
      '<defs><linearGradient id="gk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2030"/><stop offset="1" stop-color="#2b2f3d"/></linearGradient></defs>' +
      '<rect width="400" height="250" fill="url(#gk)"/>' +
      '<g fill="#3a4052"><rect x="10" y="60" width="60" height="130"/><rect x="80" y="30" width="70" height="160"/><rect x="250" y="50" width="60" height="140"/><rect x="320" y="20" width="70" height="170"/></g>' +
      '<g fill="#ffd36b" opacity=".55"><rect x="22" y="75" width="8" height="10"/><rect x="44" y="95" width="8" height="10"/><rect x="95" y="50" width="8" height="10"/><rect x="120" y="80" width="8" height="10"/><rect x="265" y="70" width="8" height="10"/><rect x="335" y="45" width="8" height="10"/><rect x="360" y="90" width="8" height="10"/></g>' +
      '<rect y="190" width="400" height="60" fill="#15171c"/><g fill="#555b66"><rect x="20" y="222" width="40" height="4"/><rect x="110" y="222" width="40" height="4"/><rect x="200" y="222" width="40" height="4"/><rect x="290" y="222" width="40" height="4"/></g>' +
      '<g transform="translate(70 112)">' +
      '<rect x="112" y="0" width="56" height="16" rx="3" fill="#111"/><text x="140" y="12" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="var(--sari)">TAKSİ</text>' +
      '<path d="M40 50 L80 18 Q90 14 110 14 L180 14 Q200 14 214 26 L248 50 Q275 52 282 66 L284 88 L8 88 L8 70 Q10 54 40 50 Z" fill="var(--sari)"/>' +
      '<path d="M84 24 Q92 20 108 20 L140 20 L140 48 L58 48 Z M148 20 L180 20 Q196 20 206 30 L224 48 L148 48 Z" fill="#26303f"/>' +
      '<rect x="8" y="66" width="276" height="6" fill="#111" opacity=".85"/><rect x="0" y="64" width="12" height="8" rx="2" fill="#ffe9a3"/><rect x="278" y="62" width="10" height="8" rx="2" fill="#ff5d5d"/>' +
      '<circle cx="70" cy="90" r="24" fill="#111"/><circle cx="70" cy="90" r="10" fill="#777"/><circle cx="222" cy="90" r="24" fill="#111"/><circle cx="222" cy="90" r="10" fill="#777"/></g></svg>';
  }
  // Fotoğraflar data/foto klasöründen gelir ("foto/ahmet-arac.jpg"); tam adres de yazılabilir
  function fotoYol(src) { return /^https?:\/\//.test(src) ? src : (P ? P.base : "") + String(src).replace(/^\//, ""); }
  function gorsel(src, soluk, kapak) {
    return src ? '<img src="' + esc(fotoYol(src)) + '" alt=""' + (kapak ? "" : ' loading="lazy"') + (soluk ? ' class="soluk"' : "") + ">" : taksiCizim(soluk, kapak);
  }
  // Ana ekrana ekle kartı: sayfayla birlikte hemen çıkar (tarayıcının "yüklenebilir" haberini beklemez)
  function kurKart(ad, s) {
    if (KURULU) return "";
    return '<div class="y-kur"><div><b>Telefonuna ekle</b><p>Bir dahakine uygulamayı aç, tek dokunuşla çağır.</p>' +
      (IOS ? '<small>Safari\'de alttaki ' + PAYLAS_IK + ' simgesine bas, <b>Ana Ekrana Ekle</b>\'yi seç.</small>' : "") +
      '</div><button class="btn btn-sari" data-ekle>' + (IOS ? "Nasıl?" : "Uygulamayı yükle") + "</button></div>";
  }
  var YORUM_RENK = ["#3b6fd8", "#c2410c", "#0f766e", "#7c3aed", "#b45309"];
  function yorumBolumu(kaynak, olayKod, link) {
    var g = kaynak.google || {};
    if (!g.puan && !link) return "";
    var h = '<section class="y-bolum"><h2>Yolcularımız ne diyor</h2><div class="y-puan">';
    if (g.puan) h += '<div class="y-puan-ust"><strong>' + esc(String(g.puan).replace(".", ",")) + '</strong><div><span class="y-yildiz" aria-label="5 üzerinden ' + esc(String(g.puan)) + ' yıldız">★★★★★</span><small>Google\'da ' + esc(String(g.sayi || "")) + " yorum</small></div><span class=\"y-g\">" + GOOGLE_G + "</span></div>";
    if (g.yorumlar && g.yorumlar.length) {
      h += '<div class="y-yorumlar">' + g.yorumlar.map(function (y, i) {
        return '<div class="y-yorum"><div class="y-yorum-kim"><i style="background:' + YORUM_RENK[i % YORUM_RENK.length] + '">' + esc((y.ad || "?").charAt(0)) + "</i>" + esc(y.ad) + '</div><span class="y-yildiz">' + "★★★★★".slice(0, y.yildiz || 5) + "</span><p>" + esc(y.metin) + "</p></div>";
      }).join("") + "</div>";
    }
    if (link) h += '<a class="y-yorum-yap" href="' + esc(link) + '" target="_blank" rel="noopener" data-google="' + esc(olayKod) + '">' + ik("yildiz") + "Google'da yorum yap</a>";
    return h + "</div></section>";
  }
  function imza() {
    var M = S.marka;
    return '<footer class="y-alt"><p>Web tasarım ve geliştirme: <a href="' + link("tanitim") + '">' + esc(M.gelistirici || M.ad) + "</a>" +
      (M.iletisimTelefon ? ' · <a href="tel:' + esc(telSade(M.iletisimTelefon)) + '">' + esc(telGoster(M.iletisimTelefon)) + "</a>" : "") + "</p></footer>";
  }
  var VARSAYILAN_OZELLIK = ["Resmi ticari plaka, sigortalı araç", "Her yolculuktan önce temizlenir", "Klimalı, ferah yolculuk", "Aileye uygun, saygılı şoförler", "Taksimetre, belediye tarifesi"];

  // ======================================================
  // ŞOFÖR SAYFASI
  // ======================================================
  // "07.00-02.00" gibi çalışma saati: şu an içinde mi?
  function calisiyorMu(c) {
    var m = String(c || "").match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/);
    if (!m) return null;
    var n = new Date(), su = n.getHours() * 60 + n.getMinutes();
    var a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
    return a <= b ? su >= a && su < b : su >= a || su < b;
  }
  var ODEME = { nakit: "Nakit", kart: "Kart geçer", iban: "IBAN / havale", fatura: "Fatura kesilir" };

  // Sade şoför sayfası: fotoğraf + kim olduğu, tek büyük ara, konum, uygulamaya ekle. Gerisi aşağıda küçük.
  function sayfaSofor(kod) {
    var s = sofor(kod);
    if (!s) return pasifSayfa(kod);
    var d = duragi(s);
    var demo = demoMu(s);
    var du = durumu(s.kod);
    var sec = hedefSec(s);
    var ad = s.hitap || s.ad;
    var aracta = KAYNAK === "nfc" || KAYNAK === "qr"; // pleksi aracın içinde: okutan büyük ihtimalle şu anki yolcusu
    var mesai = calisiyorMu(s.calisma);
    document.title = ad + " Taksi" + (d ? " · " + d.ad : "");
    ziyaretSay(s.kod);

    var h = "";
    if (demo) h += demoSerit('Örnek sayfa. Butonlar gerçek arama yapmaz. <a href="' + link("panel", s.kod) + '">Şoför panelinden durumu değiştir</a>');
    h += '<div class="y-sayfa">';
    // Kapak: aracın fotoğrafı, üstünde durak adı, altta kim olduğu
    h += '<header class="y-kapak y-kapak-sofor"><div class="y-kapak-gorsel">' + gorsel(s.aracFoto, false, true) + "</div>" +
      '<div class="y-ust"><div class="y-ic">' +
      (d ? '<a class="y-marka" href="' + link("durak", d.kod) + '">' + esc(d.ad) + "<small>" + esc(d.altAd || S.marka.sehir) + "</small></a>"
         : '<span class="y-marka">' + esc(ad) + "<small>Bağımsız taksici · " + esc(S.marka.sehir) + "</small></span>") +
      "</div></div>" +
      '<div class="y-ic y-kimlik"><div class="y-yuz" aria-hidden="true">' + (s.foto ? '<img src="' + esc(fotoYol(s.foto)) + '" alt="">' : esc(bas(s.ad))) + "</div>" +
      '<div class="y-kim"><h1>' + esc(s.ad) + "</h1><p>" + esc(s.arac) + (s.yil ? " · " + s.yil + " yıllık şoför" : "") + "</p>" +
      '<div class="y-satir">' + plaka(s.plaka) + yolcuRozet(s.kod) + "</div></div></div></header>";

    h += '<main class="y-ic y-govde">';
    if (aracta) {
      h += '<div class="y-aracta"><b>' + ik("kalkan") + "Bu araçtasın</b><p>" + esc(ek(ad, "in")) + " aracı, " + esc(s.plaka) + ". Yolculuğunu ailene bir dokunuşla gönderebilirsin.</p>" +
        '<button class="btn btn-hayalet btn-blok" data-paylas>' + ik("kalkan") + "Yolculuğumu ailemle paylaş</button></div>";
    }
    // Asıl iş: tek büyük düğme. Şoför meşgulse düğme kendiliğinden arkadaşını arar.
    if (sec.yonlendi && sec.hedef) {
      var y = sec.hedef;
      h += '<p class="y-not">' + ik("saat") + "<span><b>" + esc(ad) + "</b> " + (du.durum === "yolcuda" ? "yolcuda" + (du.kalan ? " (yaklaşık " + du.kalan + " dk)" : "") : "şu an çalışmıyor") + ". Anlaşmalı arkadaşı <b>" + esc(y.hitap || y.ad) + "</b> müsait.</span></p>" +
        '<button class="y-cagir" data-ara="' + y.kod + '"><b>' + ik("tel") + esc(ek(y.hitap || y.ad, "i")) + " ara</b><small>" + esc(y.arac) + " · " + esc(y.plaka) + "</small></button>" +
        '<button class="y-konum" data-konum="' + y.kod + '">' + ik("wa") + "Konumumu WhatsApp'tan at</button>" +
        '<button class="y-ince" data-ara="' + s.kod + '">' + ik("tel") + "Yine de " + esc(ek(ad, "i")) + " ara</button>";
    } else if (sec.yonlendi) {
      h += '<p class="y-not">' + ik("uyari") + "<span><b>" + esc(ad) + "</b> ve anlaşmalı arkadaşları şu an yolcuda." + (d ? " Durağı ara, ilk boşalan araç gelsin." : " Birkaç dakika sonra tekrar dene.") + "</span></p>" +
        (d ? '<button class="y-cagir" data-durak><b>' + ik("tel") + "Durağı ara</b><small>" + esc(d.ad) + " · " + esc(telGoster(d.telefon)) + "</small></button>" : "") +
        '<button class="y-konum" data-konum="' + s.kod + '">' + ik("wa") + "Konumumu WhatsApp'tan at</button>" +
        '<button class="y-ince" data-ara="' + s.kod + '">' + ik("tel") + "Yine de " + esc(ek(ad, "i")) + " ara</button>";
    } else {
      h += '<button class="y-cagir" data-ara="' + s.kod + '"><b>' + ik("tel") + esc(ek(ad, "i")) + " ara</b><small>" + esc(telGoster(s.telefon)) + "</small></button>" +
        '<button class="y-konum" data-konum="' + s.kod + '">' + ik("wa") + "Konumumu WhatsApp'tan at</button>";
    }
    var bilgi = [];
    if (s.calisma) bilgi.push(ik("saat") + (mesai === false ? "<b>Şu an çalışmıyor.</b> Çalışma saati " : "Çalışma saati ") + esc(s.calisma));
    var od = (s.odeme || (d && d.odeme) || []).map(function (x) { return ODEME[x] || x; });
    if (od.length) bilgi.push(ik("kart") + esc(od.join(" · ")));
    if (bilgi.length) h += '<ul class="y-bilgi">' + bilgi.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";

    h += kurKart(ad, s);

    // Meşgulken gelecekler: müsait olan üstte, büyük düğmede zaten olan tekrar edilmez
    var yed = yedekleri(s).filter(function (k) { return !(sec.hedef && sec.hedef.kod === k.kod && sec.yonlendi); });
    var sira = { musait: 0, bilinmiyor: 1, yolcuda: 2, kapali: 3 };
    yed.sort(function (a, b) { return sira[durumu(a.kod).durum] - sira[durumu(b.kod).durum]; });
    if (yed.length) {
      h += '<section class="y-bolum"><h2>' + (sec.yonlendi && sec.hedef ? "Diğer seçenekler" : esc(ad) + " meşgulse") + '</h2><div class="y-liste">';
      yed.forEach(function (k) {
        var kd = durumu(k.kod).durum;
        h += '<div class="y-kisi' + (kd === "musait" ? "" : " pasif") + '"><div class="y-kucuk-gorsel">' + gorsel(k.aracFoto, kd !== "musait") + '</div><div class="ad"><b>' + esc(k.hitap || k.ad) + "</b><small>" + esc(k.plaka) + "</small>" + yolcuRozet(k.kod) + "</div>" +
          '<button class="y-kisi-ara" data-ara="' + k.kod + '" aria-label="' + esc(ek(k.hitap || k.ad, "i")) + ' ara"' + (kd === "kapali" ? " disabled" : "") + ">" + ik("tel") + "</button></div>";
      });
      h += "</div></section>";
    }

    h += yorumBolumu(s.google ? s : (d || s), s.kod, s.googleYorum || (d && d.googleYorum));

    if (!d && s.hizmetler && s.hizmetler.length) {
      var ikn = { sehir: "sehir", ucak: "ucak", yol: "yol", ay: "ay" };
      h += '<section class="y-bolum"><h2>Neler yapıyorum</h2><div class="y-serit">' +
        s.hizmetler.map(function (x) { return "<div>" + ik(ikn[x.ikon] || "sehir") + esc(x.baslik) + "</div>"; }).join("") + "</div></section>";
    }

    // Az kullanılanlar: küçük satırlar, en altta
    h += '<section class="y-bolum"><div class="y-kucuk-liste">' +
      (aracta ? '<button data-esya>' + ik("uyari") + "Araçta eşya mı unuttun?</button>" : '<button data-rehber>' + ik("rehber") + "Rehbere kaydet</button>") +
      '<button data-rezervasyon>' + ik("saat") + "İleri saate taksi ayırt</button>" +
      (aracta ? "" : '<button data-paylas>' + ik("kalkan") + "Yolculuğumu ailemle paylaş</button>") +
      (!aracta ? '<button data-esya>' + ik("uyari") + "Araçta eşya mı unuttun?</button>" : "") +
      (!d ? '<button data-tavsiye>' + ik("yildiz") + esc(ek(ad, "i")) + " tavsiye et</button>" : "") +
      (d ? '<a href="' + link("durak", d.kod) + '">' + ik("ev") + esc(d.ad) + ", bütün araçlar</a>" : "") +
      "</div></section>";

    h += '<p class="y-gizlilik">Konumunu ve numaranı saklamayız. Konum sadece senin WhatsApp\'ından şoföre gider.</p>';
    h += "</main>" + imza() + "</div>";
    app.innerHTML = h;

    app.querySelectorAll("[data-ara]").forEach(function (b) {
      b.addEventListener("click", function () { var k = sofor(b.dataset.ara); ara(k, { kaynak: s, yonlendi: k.kod !== s.kod, demo: demo }); });
    });
    app.querySelectorAll("[data-konum]").forEach(function (b) {
      b.addEventListener("click", function () { var k = sofor(b.dataset.konum); konumGonder(k, { kaynak: s, yonlendi: k.kod !== s.kod, demo: demo }); });
    });
    app.querySelectorAll("[data-rehber]").forEach(function (b) { b.addEventListener("click", function () { rehbereKaydet(s); }); });
    app.querySelectorAll("[data-ekle]").forEach(function (b) { b.addEventListener("click", function () { anaEkranaEkle(ad, s); }); });
    app.querySelectorAll("[data-paylas]").forEach(function (b) { b.addEventListener("click", function () { yolculukPaylas(s, demo); }); });
    app.querySelectorAll("[data-esya]").forEach(function (b) { b.addEventListener("click", function () { esyaUnuttum(d, demo, s); }); });
    var dk = app.querySelector("[data-durak]");
    if (dk) dk.addEventListener("click", function () { ara(d, { kaynak: s, yonlendi: true, demo: demo }); });
    app.querySelectorAll("[data-google]").forEach(function (g) { g.addEventListener("click", function () { Depo.olay(g.dataset.google, "google"); }); });
    var tv = app.querySelector("[data-tavsiye]");
    if (tv) tv.addEventListener("click", function () {
      var m = "Taksi lazım olursa " + ad + "'i tavsiye ederim (" + s.plaka + "). Tek dokunuşla buradan çağırılıyor:\n" + tamLink(s);
      Depo.olay(s.kod, "paylas");
      if (navigator.share && !HASH && !demo) { navigator.share({ text: m }).catch(function (e) { if (e && e.name !== "AbortError") location.href = "https://wa.me/?text=" + encodeURIComponent(m); }); return; }
      if (HASH || demo) return pencere('<p class="etiket-ust">Demo</p><h3>Arkadaşına giden mesaj</h3><div class="mesaj">' + esc(m) + '</div><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
      location.href = "https://wa.me/?text=" + encodeURIComponent(m);
    });
    var rz = app.querySelector("[data-rezervasyon]");
    if (rz) rz.addEventListener("click", function () { rezervasyon(s, demo); });
  }


  // Havalimanı, otogar, sabah erken: hazır WhatsApp mesajıyla taksi ayırt
  function rezervasyon(hedef, demo) {
    var yarin = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    pencere('<p class="etiket-ust">Taksi ayırt</p><h3>Ne zaman, nereye?</h3>' +
      '<label class="secim-alan" for="rz-gun">Gün<input id="rz-gun" type="date" value="' + yarin + '"></label>' +
      '<label class="secim-alan" for="rz-saat">Saat<input id="rz-saat" type="time" value="06:00"></label>' +
      '<label class="secim-alan" for="rz-nereden">Nereden<input id="rz-nereden" maxlength="80" placeholder="Örneğin Üniversite, Yemişlik"></label>' +
      '<label class="secim-alan" for="rz-nereye">Nereye<input id="rz-nereye" maxlength="80" placeholder="Örneğin Havalimanı"></label>' +
      '<button class="btn btn-wa btn-blok" data-rz-gonder>' + ik("wa") + "WhatsApp'tan gönder</button><button class=\"btn btn-hayalet btn-blok\" data-kapat>Vazgeç</button>");
    document.querySelector("[data-rz-gonder]").addEventListener("click", function () {
      var v = function (id) { return document.getElementById(id).value.trim(); };
      var gun = v("rz-gun") ? new Date(v("rz-gun") + "T12:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" }) : "";
      var m = "Merhaba " + (hedef.hitap || hedef.ad) + ", " + gun + " saat " + v("rz-saat") + " için taksi ayırtmak istiyorum." +
        (v("rz-nereden") ? "\nNereden: " + v("rz-nereden") : "") + (v("rz-nereye") ? "\nNereye: " + v("rz-nereye") : "") + "\nUygun musunuz?";
      if (demo || HASH) return pencere('<p class="etiket-ust">Demo</p><h3>' + esc(ek(hedef.hitap || hedef.ad, "e")) + " giden mesaj</h3><div class=\"mesaj\">" + esc(m) + '</div><button class="btn btn-hayalet btn-blok" data-kapat>Tamam</button>');
      location.href = "https://wa.me/" + waNo(hedef.whatsapp || hedef.telefon) + "?text=" + encodeURIComponent(m);
    });
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
      if (navigator.share) { navigator.share({ text: m }).catch(function (e) { if (e && e.name !== "AbortError") location.href = "https://wa.me/?text=" + encodeURIComponent(m); }); return; }
      location.href = "https://wa.me/?text=" + encodeURIComponent(m);
    }
    if (HASH || demo || !navigator.geolocation) return gonder(null, null);
    bildir("Konumun alınıyor…");
    navigator.geolocation.getCurrentPosition(function (p) { gonder(p.coords.latitude, p.coords.longitude); }, function () { gonder(null, null); }, { timeout: 8000, maximumAge: 60000 });
  }

  function esyaUnuttum(d, demo, s) {
    var liste = s ? [s] : S.soforler.filter(function (x) { return d && x.durak === d.kod; });
    var hedef = d || s;
    var html = '<p class="etiket-ust">Kayıp eşya</p><h3>Araçta bir şey mi unuttun?</h3>' +
      (s ? "<p>Mesaj " + esc(ek(hedef.ad, "e")) + " gider" + (d ? ", şoföre o ulaştırır" : "") + ".</p>" : "<p>Hangi araçtaydın? Bilmiyorsan \"Emin değilim\" seç, durak bütün araçlara sorar.</p>" +
        '<label class="secim-alan" for="esya-arac">Araç<select id="esya-arac"><option value="">Emin değilim</option>' +
        liste.map(function (x) { return '<option value="' + x.kod + '">' + esc(x.plaka) + " · " + esc(x.ad) + "</option>"; }).join("") + "</select></label>") +
      '<label class="secim-alan" for="esya-gun">Ne zaman?<select id="esya-gun"><option value="0">Bugün</option><option value="1">Dün</option><option value="2">Daha önce</option></select></label>' +
      '<label class="secim-alan" for="esya-ne">Ne unuttun?<input id="esya-ne" placeholder="Örneğin siyah cüzdan" maxlength="80"></label>' +
      '<button class="btn btn-wa btn-blok" data-esya-gonder>' + ik("wa") + "WhatsApp'tan bildir</button>" +
      '<button class="btn btn-hayalet btn-blok" data-kapat>Vazgeç</button>';
    pencere(html);
    document.querySelector("[data-esya-gonder]").addEventListener("click", function () {
      var a = s || sofor(document.getElementById("esya-arac").value);
      var ne = document.getElementById("esya-ne").value.trim();
      var g = +document.getElementById("esya-gun").value;
      var zaman = g === 0 ? "bugün" : g === 1 ? "dün" : "geçenlerde";
      Depo.olay(s ? s.kod : "d:" + d.kod, "esya", a ? a.kod : null);
      var m = "Merhaba, " + zaman + " " + (a ? a.plaka + " plakalı araçta" : "aracınızda") + " eşyamı unuttum" + (ne ? ": " + ne : "") + ". Bulunursa bana haber verir misiniz?";
      if (demo || HASH) {
        pencere('<p class="etiket-ust">Demo</p><h3>' + esc(ek(hedef.ad, "e")) + ' giden mesaj</h3><div class="mesaj">' + esc(m) + '</div><p class="pn-not">Gerçek sayfada bu mesaj ' + esc(ek(hedef.ad, "in")) + " WhatsApp'ına hazır gelir.</p><button class=\"btn btn-hayalet btn-blok\" data-kapat>Tamam</button>");
        return;
      }
      location.href = "https://wa.me/" + waNo(hedef.whatsapp || hedef.telefon) + "?text=" + encodeURIComponent(m);
    });
  }

  // ======================================================
  // DURAK SİTESİ
  // ======================================================
  // Sade durak sitesi: fotoğraflı giriş + tek çağır, fotoğraflı şoför kartları, araçlar, Google yorumları.
  function sayfaDurak(kod) {
    var d = durak(kod);
    if (!d) return bulunamadi();
    var demo = !!d.demo;
    var sf = S.soforler.filter(function (s) { return s.durak === d.kod; });
    var musait = sf.filter(function (s) { return durumu(s.kod).durum === "musait"; });
    // Durumunu hiç girmeyen şoför de aranabilir: çağrı ona gider, açmazsa telefonu arkadaşına yönlendirir
    var bos = musait.length ? musait : sf.filter(function (s) { return durumu(s.kod).durum === "bilinmiyor"; });
    document.title = d.ad + " · " + S.marka.sehir + " Taksi";
    ziyaretSay("d:" + d.kod);
    var ikonlar = { sehir: "sehir", ucak: "ucak", yol: "yol", ay: "ay", kalkan: "kalkan", saat: "saat" };
    var sonSofor = sofor(ls("taksicim_son_" + d.kod));
    if (sonSofor && sonSofor.durak !== d.kod) sonSofor = null;
    var sira = { musait: 0, bilinmiyor: 1, yolcuda: 2, kapali: 3 };
    var sirali = sf.slice().sort(function (a, b) { return sira[durumu(a.kod).durum] - sira[durumu(b.kod).durum]; });
    var slogan = d.slogan ? d.slogan.split("|") : [S.marka.sehir + "'da taksin", "bir dokunuş", "uzağında"];

    var h = "";
    if (demo) h += demoSerit('Örnek durak sitesi. Butonlar gerçek arama yapmaz. <a href="' + link("yonetim", d.kod) + '">Durak panelini gör</a>');
    h += '<div class="y-sayfa">';
    h += '<header class="y-kapak"><div class="y-kapak-gorsel">' + gorsel(d.kapakFoto || (sf[0] && sf[0].aracFoto), false, true) + "</div>" +
      '<div class="y-ust"><div class="y-ic"><span class="y-marka">' + esc(d.ad) + "<small>" + esc(S.marka.sehir) + " · " + esc(d.acik || "7/24") + ' açık</small></span>' +
      '<button class="y-tel" data-durak-ara aria-label="Durağı ara: ' + esc(telGoster(d.telefon)) + '">' + esc(telGoster(d.telefon)) + "</button></div></div>" +
      '<div class="y-ic y-giris"><span class="y-canli' + (bos.length ? "" : " yok") + '">' + (musait.length ? "Şu an " + musait.length + " şoför müsait" : bos.length ? esc(d.acik || "7/24") + " hizmetinizdeyiz" : "Şu an bütün araçlar yolcuda") + "</span>" +
      "<h1>" + esc(slogan[0]) + (slogan[1] ? " <em>" + esc(slogan[1]) + "</em>" : "") + (slogan[2] ? " " + esc(slogan[2]) : "") + "</h1>" +
      "<p>" + esc(d.tanitim || "Gece gündüz, şehir içi ve havalimanı. Bas, ara, birkaç dakikada kapında.") + "</p>" +
      '<div id="dk-eylem" class="y-eylem"><button class="y-cagir" data-musait-cagir><b>' + ik("tel") + "Taksi çağır</b><small>" + (bos.length ? "Müsait bir şoförümüze bağlanırsın" : "Çağrın durağa gider") + "</small></button>" +
      '<button class="y-konum cam" data-durak-konum>' + ik("wa") + "Konumumu WhatsApp'tan at</button></div></div></header>";

    h += '<main class="y-ic y-govde">';
    if (sonSofor) h += '<div class="y-son"><span>Geçen sefer: <b>' + esc(sonSofor.hitap || sonSofor.ad) + "</b> · " + esc(sonSofor.plaka) + '</span><a class="btn btn-hayalet" href="' + link("sofor", sonSofor.kod) + '">' + ik("tel") + "Yine onu çağır</a></div>";
    h += kurKart(d.ad, null);
    h += '<div class="y-serit">' + (d.hizmetler || []).slice(0, 4).map(function (x) { return "<div>" + ik(ikonlar[x.ikon] || "sehir") + esc(x.baslik) + "</div>"; }).join("") + "</div>";

    // Şoförler: fotoğraflı kartlar, müsait olan üstte
    h += '<section class="y-bolum" id="soforler"><div class="y-bolum-ust"><h2>Şoförlerimiz</h2><span>' + sf.length + " araç</span></div><div class=\"y-soforler\">";
    sirali.forEach(function (s) {
      var kd = durumu(s.kod).durum;
      var bos = kd === "musait" || kd === "bilinmiyor";
      var yer = bos ? null : hedefSec(s).hedef;
      h += '<article class="y-sofor' + (bos ? "" : " yolda") + '"><a class="y-sofor-gorsel" href="' + link("sofor", s.kod) + '" aria-label="' + esc(s.ad) + ' sayfası">' + gorsel(s.aracFoto, !bos) + yolcuRozet(s.kod) + plaka(s.plaka) + "</a>" +
        '<div class="y-sofor-alt"><div class="y-yuz" aria-hidden="true">' + (s.foto ? '<img src="' + esc(fotoYol(s.foto)) + '" alt="">' : esc(bas(s.ad))) + '</div><div class="ad"><b>' + esc(s.ad) + "</b><small>" + esc(s.arac) + (s.yil ? " · " + s.yil + " yıllık şoför" : "") + "</small></div>" +
        (bos ? '<button class="y-sofor-ara" data-sofor-ara="' + s.kod + '">' + ik("tel") + esc(ek(s.hitap || s.ad, "i")) + " ara</button>"
          : yer ? '<button class="y-sofor-ara ikinci" data-sofor-ara="' + yer.kod + '">' + ik("tel") + (kd === "kapali" ? "Kapalı · " : "Yolcuda · ") + esc(ek(yer.hitap || yer.ad, "i")) + " ara</button>"
          : '<a class="y-sofor-ara ikinci" href="' + link("sofor", s.kod) + '">' + (kd === "kapali" ? "Şu an kapalı" : "Şu an yolcuda") + "</a>") +
        "</div></article>";
    });
    h += "</div></section>";

    var oz = d.ozellikler || VARSAYILAN_OZELLIK;
    h += '<section class="y-bolum"><h2>Araçlarımız</h2><ul class="y-ozellik">' + oz.map(function (x) { return "<li>" + ik("tik") + esc(x) + "</li>"; }).join("") + "</ul></section>";

    h += yorumBolumu(d, "d:" + d.kod, d.googleYorum);

    if (d.sss && d.sss.length) {
      h += '<section class="y-bolum"><h2>Sık sorulanlar</h2><div class="y-sss">' + d.sss.slice(0, 4).map(function (q) { return "<details><summary>" + esc(q.s) + "</summary><p>" + esc(q.c) + "</p></details>"; }).join("") + "</div></section>";
    }

    h += '<section class="y-bolum"><div class="y-kucuk-liste">' +
      '<button data-rezervasyon>' + ik("saat") + "İleri saate taksi ayırt</button>" +
      '<button data-esya>' + ik("uyari") + "Araçta eşya mı unuttun?</button></div></section>";

    h += '<section class="y-bolum" id="iletisim"><div class="y-adres"><div><b>' + esc(d.ad) + "</b><span>" + esc(d.adres) + "</span></div>" +
      '<a href="https://www.google.com/maps/search/?api=1&query=' + d.konum.lat + "," + d.konum.lng + '" target="_blank" rel="noopener">Haritada aç</a></div></section>';
    h += '<p class="y-gizlilik"><a href="' + link("yonetim", d.kod) + '">Durak yönetimi</a></p>';
    h += "</main>" + imza() + "</div>";

    h += '<div class="y-yapiskan" id="dk-yapiskan"><button class="y-cagir-kucuk" data-musait-cagir>' + ik("tel") + 'Taksi çağır</button><button class="y-wa-kucuk" data-durak-konum>' + ik("wa") + "WhatsApp</button></div>";
    app.innerHTML = h;

    app.querySelectorAll("[data-durak-ara]").forEach(function (b) { b.addEventListener("click", function () { ara(d, { demo: demo, olayKod: "d:" + d.kod }); }); });
    // Konum: durağın WhatsApp'ı varsa ona, yoksa müsait bir şoföre
    app.querySelectorAll("[data-durak-konum]").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = !d.whatsapp && bos.length ? bos[Math.floor(Math.random() * bos.length)] : null;
        if (m) ls("taksicim_son_" + d.kod, m.kod);
        konumGonder(m || d, { demo: demo, kaynak: m, yonlendi: false, olayKod: "d:" + d.kod });
      });
    });
    var rz = app.querySelector("[data-rezervasyon]");
    if (rz) rz.addEventListener("click", function () { rezervasyon(d, demo); });
    app.querySelectorAll("[data-ekle]").forEach(function (b) { b.addEventListener("click", function () { anaEkranaEkle(d.ad, null); }); });
    app.querySelectorAll("[data-google]").forEach(function (g) { g.addEventListener("click", function () { Depo.olay(g.dataset.google, "google"); }); });
    // Alttaki sabit çubuk, üstteki büyük düğmeler görünmezken çıkar
    var ey = document.getElementById("dk-eylem"), yp = document.getElementById("dk-yapiskan");
    if (ey && yp && "IntersectionObserver" in window) {
      yp.classList.add("gizli");
      new IntersectionObserver(function (g) { yp.classList.toggle("gizli", g[0].isIntersecting); }).observe(ey);
    }
    app.querySelectorAll("[data-musait-cagir]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!bos.length) return ara(d, { demo: demo, olayKod: "d:" + d.kod });
        var m = bos[Math.floor(Math.random() * bos.length)];
        ls("taksicim_son_" + d.kod, m.kod);
        ara(m, { kaynak: m, yonlendi: false, demo: demo, olayKod: "d:" + d.kod });
      });
    });
    app.querySelectorAll("[data-sofor-ara]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = sofor(b.dataset.soforAra);
        ls("taksicim_son_" + d.kod, s.kod);
        ara(s, { kaynak: s, yonlendi: false, demo: demo, olayKod: "d:" + d.kod });
      });
    });
    var eb = app.querySelector("[data-esya]");
    if (eb) eb.addEventListener("click", function () { esyaUnuttum(d, demo); });
  }

  // ======================================================
  // DURAK YÖNETİMİ (durak başkanının ekranı)
  // ======================================================
  function onceYaz(t) {
    if (!t) return "";
    var dk = Math.round((Date.now() - t) / 60000);
    if (dk < 1) return "az önce";
    if (dk < 60) return dk + " dk önce";
    if (dk < 24 * 60) return Math.floor(dk / 60) + " saat önce";
    return Math.floor(dk / 1440) + " gün önce";
  }
  function sayfaYonetim(kod) {
    var d = durak(kod);
    if (!d) return bulunamadi();
    var anahtar = "taksicim_yonetim_" + d.kod;
    var giris = ls(anahtar);
    var sf = S.soforler.filter(function (s) { return s.durak === d.kod; });
    document.title = d.ad + " · Durak paneli";
    var h = '<div class="pn kap" style="max-width:980px">';
    h += '<div class="pn-ust"><a class="sf-durak" href="' + link("durak", d.kod) + '"><span class="lamba">TAKSİ</span><span><b>' + esc(d.ad) + "</b><small>Durak paneli</small></span></a>" + temaDugmesi() + "</div>";

    if (!giris) {
      h += '<h1 style="margin-top:22px">Durak paneli</h1><p class="pn-alt">Bütün araçların tek ekranda: kim müsait, kim yolcuda, bu ay kime kaç çağrı geldi.</p>' +
        '<form class="kutu" id="yn-form" style="max-width:480px"><label for="yn-pin">Durak PIN<input id="yn-pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" placeholder="Durak PIN"' + (SUPA ? "" : ' value="1234"') + "></label>" +
        (SUPA ? "" : '<p class="pn-not">Demo PIN: <span class="kod">1234</span></p>') +
        '<p id="yn-hata" class="pn-hata" role="alert" hidden></p><button class="btn btn-sari btn-blok" type="submit">Giriş yap</button></form></div>';
      app.innerHTML = h;
      temaBagla();
      document.getElementById("yn-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var pin = document.getElementById("yn-pin").value.trim();
        Depo.durakPinDogru(d.kod, pin).then(function (ok) {
          var he = document.getElementById("yn-hata");
          if (ok === null) { he.textContent = "İnternete ulaşılamadı. Bağlantını kontrol et."; he.hidden = false; return; }
          if (!ok) { he.textContent = "PIN yanlış."; he.hidden = false; return; }
          ls(anahtar, { pin: pin });
          sayfaYonetim(d.kod);
        });
      });
      return;
    }

    var say = { musait: 0, yolcuda: 0, kapali: 0, bilinmiyor: 0 };
    sf.forEach(function (s) { say[durumu(s.kod).durum]++; });
    h += '<h1 style="margin-top:22px">Şu an durakta</h1>';
    h += '<div class="ozet"><div class="musait"><b>' + say.musait + '</b><small>Müsait</small></div><div class="yolcuda"><b>' + say.yolcuda + '</b><small>Yolcuda</small></div><div class="kapali"><b>' + say.kapali + '</b><small>Kapalı</small></div><div><b id="ay-toplam">…</b><small>Bu ay gelen çağrı</small></div></div>';
    if (say.bilinmiyor) h += '<p class="pn-uyari">' + ik("uyari") + say.bilinmiyor + " şoför " + ((S.ayarlar && S.ayarlar.eskiDurumSaat) || 8) + " saattir hiç basmamış, durumu bilinmiyor. Yolcu yine arayabilir; ama bu şoförlere çağrı yönlendirilmez.</p>";
    h += '<div class="kutu"><div class="yn-baslik"><p class="kutu-baslik">Araçlar</p><p class="pn-not">Şoför unuttuysa durumunu buradan sen de değiştirebilirsin.</p></div><div class="liste" id="yn-liste">';
    sf.forEach(function (s) {
      var x = durumu(s.kod), kd = x.durum, r = DURUM[s.kod];
      h += '<div class="yn-satir"><div class="kisi" style="background:transparent;padding:0"><div class="avatar' + (kd === "musait" ? "" : " soluk") + '" aria-hidden="true">' + esc(bas(s.ad)) + '</div><div class="ad"><b>' + esc(s.ad) + "</b><small>" + esc(s.plaka) + ' · <span data-ay="' + s.kod + '">…</span></small><small>' + durumRozet(s.kod) + (r && r.zaman && kd !== "bilinmiyor" ? ' <span class="yn-zaman">' + onceYaz(r.zaman) + "</span>" : "") + "</small></div></div>" +
        '<div class="yn-dugmeler" role="group" aria-label="' + esc(s.ad) + ' durumu">' +
        [["musait", "Müsait"], ["yolcuda", "Yolcuda"], ["kapali", "Kapalı"]].map(function (o) {
          return '<button type="button" class="' + o[0] + '" data-yn="' + s.kod + '" data-yn-durum="' + o[0] + '" aria-pressed="' + (kd === o[0]) + '">' + o[1] + "</button>";
        }).join("") + "</div></div>";
    });
    h += "</div></div>";
    h += '<div class="kutu"><p class="kutu-baslik">Bu ay, şoför başına iş</p><p class="pn-not" style="margin-top:-6px">Yolcunun aradığı ya da konum attığı şoför. Meşgulken arkadaşına giden çağrı, işi alana yazılır.</p><div id="yn-sira" class="yn-sira"><p class="pn-not">Sayılar geliyor…</p></div></div>';
    h += '<div class="kutu"><p class="kutu-baslik">Yolcu durakta kaldı mı?</p><p class="pn-not" style="margin-top:-6px">Bir şoför meşgulken gelen çağrının durağın başka aracına gitmesi. Bu çağrılar eskiden başka durağa giderdi.</p><div class="serit" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div><b id="ay-yonlenen">…</b><small>Durak içinde yönlendirilen</small></div><div><b id="ay-konum">…</b><small>WhatsApp konumla gelen</small></div></div></div>';
    h += '<div class="kutu"><details class="pn-detay" id="yn-detay"><summary>Durağın bütün sayıları (pleksi, uygulama, Google)</summary><div id="yn-sayilar"></div></details></div>';
    h += '<div class="kutu" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))"><a class="btn btn-hayalet" href="' + link("durak", d.kod) + '">Durak sitesini aç</a><a class="btn btn-hayalet" href="' + (HASH ? "#etiket-d-" + d.kod : link("etiket") + "#d-" + d.kod) + '">Etiketleri yazdır</a><a class="btn btn-hayalet" href="https://wa.me/' + waNo(S.marka.iletisimTelefon) + "?text=" + encodeURIComponent(d.ad + " için yeni şoför eklemek istiyorum.") + '" target="_blank" rel="noopener">' + ik("wa") + "Yeni şoför ekle (bize yaz)</a></div>";
    h += '<button class="pn-cikis" data-cikis>Bu telefondan çıkış yap</button>';
    h += "</div>";
    app.innerHTML = h;
    temaBagla();

    app.querySelectorAll("[data-yn]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = sofor(b.dataset.yn), yeni = b.dataset.ynDurum;
        var o = durumu(s.kod), oh = DURUM[s.kod] || {};
        Depo.durakGuncelle(d.kod, giris.pin, s.kod, yeni, yeni === "yolcuda" ? HIZLI_DK : null).then(function () {
          sayfaYonetim(d.kod);
          bildir(s.ad + ": " + ETIKET[yeni], o.durum === "bilinmiyor" ? null : function () {
            Depo.durakGuncelle(d.kod, giris.pin, s.kod, o.durum, o.durum === "yolcuda" && oh.donusDk ? Math.max(1, o.kalan || oh.donusDk) : null).then(function () { sayfaYonetim(d.kod); bildir("Geri alındı."); });
          });
        }).catch(function (err) { bildir(err.message === "PIN yanlış" ? "PIN değişmiş. Çıkış yapıp tekrar gir." : "Kaydedilemedi. İnternetini kontrol et."); });
      });
    });
    app.querySelector("[data-cikis]").addEventListener("click", function () {
      pencere("<h3>Çıkış yapılsın mı?</h3><p>Bu telefonda durak paneline tekrar girmek için PIN gerekir.</p>" +
        '<button class="btn btn-kirmizi btn-blok" data-evet>Çıkış yap</button><button class="btn btn-hayalet btn-blok" data-kapat>Vazgeç</button>');
      document.querySelector("[data-evet]").addEventListener("click", function () { kapat(); ls(anahtar, null); sayfaYonetim(d.kod); });
    });

    Depo.olaylar("durak", d.kod, giris.pin, donemAraligi("bu-ay").bas).then(function (ol) {
      var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
      var sira = document.getElementById("yn-sira");
      if (ol === null) { ls(anahtar, null); return sayfaYonetim(d.kod); }
      if (ol === false) { if (sira) sira.innerHTML = '<p class="pn-hata">Sayılar şu an alınamadı. İnternetini kontrol et.</p>'; ["ay-toplam", "ay-yonlenen", "ay-konum"].forEach(function (i) { set(i, "–"); }); return; }
      var r = sayilar(ol, olayKodlari("durak", d.kod));
      var is = sf.map(function (s) {
        return { s: s, n: ol.filter(function (o) { return CAGRI[o.tur] && (o.hedef || o.kod) === s.kod; }).length };
      }).sort(function (a, b) { return b.n - a.n; });
      is.forEach(function (x) { var el = app.querySelector('[data-ay="' + x.s.kod + '"]'); if (el) el.textContent = "bu ay " + x.n + " çağrı"; });
      var enCok = Math.max(1, is[0] ? is[0].n : 1);
      if (sira) sira.innerHTML = r.cagri ? is.map(function (x) {
        return '<div class="yn-sira-satir"><span>' + esc(x.s.hitap || x.s.ad) + '</span><i style="width:' + Math.round(x.n / enCok * 100) + '%"></i><b>' + x.n + "</b></div>";
      }).join("") : '<p class="pn-not">Bu ay henüz çağrı yok. İlk yolcu pleksiyi okuttuğunda burada görünür.</p>';
      set("ay-toplam", r.cagri); set("ay-yonlenen", r.kurtarilan); set("ay-konum", r.konum);
    });
    var det = document.getElementById("yn-detay");
    det.addEventListener("toggle", function () {
      if (det.open && !det.dataset.yuklendi) { det.dataset.yuklendi = 1; sayiPaneli(document.getElementById("yn-sayilar"), "durak", d.kod, giris.pin, d.ad, null); }
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
    var once = DURUM[s.kod] ? { durum: durumu(s.kod).durum, kalan: durumu(s.kod).kalan, ham: DURUM[s.kod] } : null;
    var su = durumu(s.kod).durum;
    var yeni = islem === "dolu" ? "yolcuda" : islem === "bos" ? "musait" : (su === "yolcuda" ? "musait" : "yolcuda");
    Depo.guncelle(s.kod, giris.pin, yeni, yeni === "yolcuda" ? HIZLI_DK : null, null).then(function () {
      var sec = hedefSec(s);
      var renk = yeni === "musait" ? "var(--yesil)" : "var(--amber)";
      app.innerHTML = '<div class="hizli" style="--renk:' + renk + '"><div class="hizli-ic"><span class="hizli-nokta"></span>' +
        "<h1>" + (yeni === "musait" ? "Müsaitsin" : "Yolcudasın") + "</h1><p>" +
        (yeni === "musait" ? "Çağrılar artık sana geliyor."
          : (sec.hedef ? "Çağrılar " + esc(ek(sec.hedef.hitap || sec.hedef.ad, "e")) + " gidiyor. " : "Arkadaşların da meşgul, yolcuya durak numarası gösteriliyor. ") + HIZLI_DK + " dakika sonra kendiliğinden müsait olursun.") +
        '</p><div class="hizli-dugmeler">' +
        (yeni === "yolcuda" ? '<button class="btn btn-hayalet" data-uzun>Uzun yol (süre dolmasın)</button>' : "") +
        '<button class="btn btn-hayalet" data-geri>Yanlış oldu, geri al</button><a class="btn btn-hayalet" href="' + link("panel") + '" data-panele>Panele git</a></div></div></div>';
      if (navigator.vibrate) try { navigator.vibrate(yeni === "musait" ? 60 : [60, 80, 60]); } catch (e) {}
      var pg = app.querySelector("[data-panele]");
      if (pg && HASH) pg.addEventListener("click", function (e) { e.preventDefault(); location.hash = "#panel"; });
      var uz = app.querySelector("[data-uzun]");
      if (uz) uz.addEventListener("click", function () {
        Depo.guncelle(s.kod, giris.pin, "yolcuda", null, null).then(function () { sayfaPanel(); bildir("Uzun yol. Dönünce Müsaitim'e bas."); });
      });
      app.querySelector("[data-geri]").addEventListener("click", function () {
        var d = once && once.durum !== "bilinmiyor" ? once.durum : yeni === "musait" ? "yolcuda" : "musait";
        var dk = d === "yolcuda" ? (once && once.ham.donusDk ? Math.max(1, once.kalan || once.ham.donusDk) : once ? null : HIZLI_DK) : null;
        Depo.guncelle(s.kod, giris.pin, d, dk, null).then(function () { sayfaPanel(); bildir("Geri alındı. Şu an: " + ETIKET[d] + "."); });
      });
      if (!HASH && history.replaceState) history.replaceState(null, "", location.pathname);
    }).catch(function (err) { bildir(err.message === "PIN yanlış" ? "PIN değişmiş. Panelden tekrar giriş yap." : "Kaydedilemedi. İnternetini kontrol et."); });
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
    h += '<div class="pn-ust"><a class="logo" href="' + link("tanitim") + '"><span class="lamba">TAKSİ</span>' + esc(S.marka.ad) + "</a>" + temaDugmesi() + "</div>";

    if (!s) {
      // Her şoföre kendi panel linki verilir: /panel/#ahmet. O linkte ad seçili gelir.
      var sabit = kod && sofor(kod) ? sofor(kod) : null;
      h += '<h1 style="margin-top:22px">Şoför paneli</h1><p class="pn-alt">Müsait misin, yolcuda mısın? Buradan değiştirirsin, yolcuların sayfası anında güncellenir.</p>';
      if (bekleyenHizli) h += '<p class="pn-uyari">' + ik("nfc") + "Etiket çalıştı ama bu telefonda giriş yok. Bir kere PIN'ini gir, bir daha sorulmaz.</p>";
      h += '<form class="kutu" id="giris-form">';
      if (sabit) {
        h += '<div class="pn-kim"><div class="avatar" aria-hidden="true">' + esc(bas(sabit.ad)) + "</div><div><b>" + esc(sabit.ad) + "</b><small>" + esc(sabit.plaka) + '</small></div><input type="hidden" id="pn-sofor" value="' + esc(sabit.kod) + '"></div>' +
          '<a href="' + link("panel") + '" class="pn-link" data-baskasi>Ben değilim</a>';
      } else {
        var gruplar = S.duraklar.map(function (d) { return [d.ad, S.soforler.filter(function (x) { return x.durak === d.kod; })]; })
          .concat([["Bağımsız", S.soforler.filter(function (x) { return !x.durak; })]]).filter(function (g) { return g[1].length; });
        h += '<label for="pn-sofor">Adın<select id="pn-sofor"><option value="">Seç…</option>' + gruplar.map(function (g) {
          return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (x) { return '<option value="' + x.kod + '">' + esc(x.ad) + " · " + esc(x.plaka) + "</option>"; }).join("") + "</optgroup>";
        }).join("") + "</select></label>";
      }
      h += '<label for="pn-pin">PIN<input id="pn-pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" placeholder="Sana verdiğimiz PIN"' + (SUPA ? "" : ' value="1234"') + "></label>" +
        (SUPA ? "" : '<p class="pn-not">Demo PIN: <span class="kod">1234</span></p>') +
        '<p id="pn-hata" class="pn-hata" role="alert" hidden></p><button class="btn btn-sari btn-blok" type="submit">Giriş yap</button>' +
        '<p class="pn-not">Bu telefonda giriş açık kalır. Torpidodaki etiketler de bu sayede PIN sormadan çalışır.</p></form>';
      h += "</div>";
      app.innerHTML = h;
      temaBagla();
      var bk = app.querySelector("[data-baskasi]");
      if (bk && HASH) bk.addEventListener("click", function (e) { e.preventDefault(); sayfaPanel(); });
      document.getElementById("giris-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var k = document.getElementById("pn-sofor").value, pin = document.getElementById("pn-pin").value.trim();
        var he = document.getElementById("pn-hata");
        if (!k) { he.textContent = "Önce adını seç."; he.hidden = false; return; }
        Depo.pinDogru(k, pin).then(function (ok) {
          if (ok === null) { he.textContent = "İnternete ulaşılamadı. Bağlantını kontrol et."; he.hidden = false; return; }
          if (!ok) { he.textContent = "PIN yanlış. Tekrar dene."; he.hidden = false; return; }
          ls("taksicim_giris", { kod: k, pin: pin });
          var b = bekleyenHizli; bekleyenHizli = null;
          sayfaPanel(b);
        });
      });
      return;
    }

    var d = duragi(s);
    var du = durumu(s.kod);
    var yed = yedekleri(s).map(function (x) { return x.kod; });
    var sec = hedefSec(s);
    var hedefAd = sec.hedef ? ek(sec.hedef.hitap || sec.hedef.ad, "e") : null;
    var ham = DURUM[s.kod] || {};
    var uzunYol = du.durum === "yolcuda" && !ham.donusDk;
    var bant = {
      musait: ["MÜSAİTSİN", "Çağrılar sana geliyor."],
      yolcuda: [uzunYol ? "UZUN YOLDASIN" : "YOLCUDASIN", (uzunYol ? "Dönünce Müsaitim'e bas. " : du.kalan ? "Yaklaşık " + du.kalan + " dk sonra kendiliğinden müsait olursun. " : "") + (hedefAd ? "Çağrılar " + hedefAd + " gidiyor." : "Arkadaşların da meşgul, yolcuya durak numarası gösteriliyor.")],
      kapali: ["KAPALISIN", hedefAd ? "Yolcular seni kapalı görüyor, çağrılar " + hedefAd + " gidiyor." : "Yolcular seni kapalı görüyor."],
      bilinmiyor: ["DURUMUN BELLİ DEĞİL", "Uzun süredir basmadın. Yolcular seni \"durumu bilinmiyor\" görüyor. Aşağıdan seç."]
    }[du.durum];
    h += '<div class="pn-bant ' + du.durum + '" role="status"><span class="hizli-nokta" aria-hidden="true"></span><div><b>' + bant[0] + "</b><p>" + esc(bant[1]) + "</p></div></div>";
    h += '<p class="pn-merhaba">' + esc(s.hitap || s.ad) + " · " + esc(s.plaka) + (d ? " · " + esc(d.ad) : "") + "</p>";

    // Tek dokunuşla kaydeder, Kaydet düğmesi yok
    h += '<div class="kutu"><p class="kutu-baslik">Durumun</p><div class="secim" role="group" aria-label="Durum">' +
      [["musait", "Müsaitim", "Çağrılar bana gelsin"], ["yolcuda", "Yolcudayım", "Çağrılar arkadaşıma gitsin"], ["kapali", "Kapalıyım", "Bugünlük bıraktım"]].map(function (o) {
        return '<button type="button" class="' + o[0] + '" data-durum="' + o[0] + '" aria-pressed="' + (du.durum === o[0]) + '"><i class="nokta"></i><span>' + o[1] + "<small>" + o[2] + "</small></span></button>";
      }).join("") + "</div>" +
      (du.durum === "yolcuda" ? '<div><p class="pn-not" style="margin-bottom:8px">Ne zaman boşalırsın?</p><div class="cipler" role="group" aria-label="Süre">' +
        [[15, "15 dk"], [25, "25 dk"], [45, "45 dk"], [0, "Uzun yol"]].map(function (m) {
          var secili = m[0] ? ham.donusDk === m[0] : uzunYol;
          return '<button type="button" data-dk="' + m[0] + '" aria-pressed="' + secili + '">' + m[1] + "</button>";
        }).join("") + '</div><p class="pn-not" style="margin-top:8px">Uzun yolda süre dolmaz; dönünce Müsaitim\'e basarsın.</p></div>' : "") + "</div>";

    // Yolcuya göstermek ve paylaşmak için
    h += '<div class="pn-iki"><button class="btn btn-hayalet" data-qr>' + ik("qr") + "QR'ımı göster</button><button class=\"btn btn-hayalet\" data-gonder>" + ik("wa") + "Sayfamı gönder</button></div>";

    h += '<div class="kutu"><p class="kutu-baslik">Bu ay</p><div class="pn-sayi" id="pn-sayi"><div><b>…</b><small>Sayfandan çağrı</small></div><div><b>…</b><small>Arkadaşlarından sana gelen</small></div><div><b>…</b><small>Sen meşgulken arkadaşına giden</small></div></div><p class="pn-not" id="pn-sayi-not" hidden></p>' +
      '<details class="pn-detay" id="pn-detay"><summary>Bütün sayılar</summary><div id="istatistik"></div></details></div>';

    var adaylar = S.soforler.filter(function (x) { return x.kod !== s.kod && (!d || d.disariYonlendirme || x.durak === s.durak); });
    var ekleyenler = S.soforler.filter(function (x) { return x.kod !== s.kod && yedekleri(x).some(function (y) { return y.kod === s.kod; }); });
    h += '<div class="kutu"><p class="kutu-baslik">Meşgulken çağrılar kime gitsin?</p><p class="pn-alt" style="margin-top:-6px">Sırayla bakılır, ilk müsait olana gider. Değişiklik hemen kaydedilir.</p><div class="liste" id="yedek-liste"></div>' +
      '<label for="yedek-ekle">Arkadaş ekle<select id="yedek-ekle"></select></label>' +
      (ekleyenler.length ? '<p class="pn-not">Seni listesine ekleyenler: <b>' + ekleyenler.map(function (x) { return esc(x.hitap || x.ad); }).join(", ") + "</b>. Onlar meşgulken yolcuları sana gelir.</p>" : "") + "</div>";

    var y0 = yed.length ? sofor(yed[0]) : null;
    var no = y0 ? "0" + waNo(y0.telefon).replace(/^90/, "") : null;
    h += '<div class="kutu"><p class="kutu-baslik">Rehberden arayanlar için</p><p class="pn-alt" style="margin-top:-6px">Yolcu seni rehberden direkt ararsa sayfa devreye giremez. Hattına bir kere yönlendirme kur; meşgulken ya da açmazsan arama ' + (y0 ? "<b>" + esc(ek(y0.hitap || y0.ad, "e")) + "</b>" : "listendeki ilk arkadaşına") + " geçer. Düğmeye bas, açılan ekranda ara tuşuna bas.</p>" +
      (no ? '<div class="yon-liste">' + [["**67*" + no + "#", "Meşgulken yönlendir"], ["**61*" + no + "#", "Açmazsan yönlendir"], ["**62*" + no + "#", "Telefon kapalıyken yönlendir"]].map(function (r) {
        return '<a class="yon-satir" href="tel:' + r[0].replace(/#/g, "%23") + '"><span><b>' + r[1] + '</b><small class="kod">' + esc(r[0]) + "</small></span><span class=\"yon-kur\">Kur</span></a>";
      }).join("") + '<a class="yon-satir kapat" href="tel:' + "##002#".replace(/#/g, "%23") + '"><span><b>Bütün yönlendirmeleri kapat</b><small class="kod">##002#</small></span><span class="yon-kur">Kapat</span></a></div>' +
        '<p class="pn-not">Arkadaş sıran değişirse kodu yeniden kur. Yönlendirilen arama hattının tarifesine göre ücretlendirilebilir. Kodlar Turkcell, Vodafone ve Türk Telekom\'da genelde çalışır; ilk kurulumda bir kere dene.</p>'
        : '<p class="pn-not">Önce yukarıdan bir arkadaş ekle.</p>') + "</div>";

    h += '<div class="kutu"><p class="kutu-baslik">Uygulamayı hiç açma</p><p class="pn-alt" style="margin-top:-6px">Torpidoya iki küçük etiket yapıştırırız. Yolcu binince telefonunu <b style="color:var(--amber)">YOLCU ALDIM</b> etiketine dokundurursun, o kadar. ' + HIZLI_DK + ' dakika sonra kendiliğinden müsait olursun. Erken boşalırsan <b style="color:var(--yesil)">BOŞALDIM</b> etiketine dokundur.</p>' +
      '<div class="pn-iki"><a class="btn" style="background:var(--amber);color:#111" href="' + link("panel", "dolu") + '">Yolcu aldım</a><a class="btn" style="background:var(--yesil);color:#06210f" href="' + link("panel", "bos") + '">Boşaldım</a></div><p class="pn-not">Bu iki düğme etikete dokunmanın aynısıdır, deneyebilirsin.</p></div>';

    h += '<div class="pn-iki" style="margin-top:14px"><a class="btn btn-hayalet" href="' + link("sofor", s.kod) + '">Sayfamı aç</a><a class="btn btn-hayalet" href="' + (HASH ? "#etiket-" + s.kod : link("etiket") + "#" + s.kod) + '">Etiketlerim</a></div>';
    h += '<button class="pn-cikis" data-cikis>Bu telefondan çıkış yap</button>';
    h += "</div>";
    app.innerHTML = h;
    temaBagla();

    function simdiki() {
      var x = durumu(s.kod), r = DURUM[s.kod] || {};
      if (x.durum === "bilinmiyor") return { durum: "musait", dk: null };
      return { durum: x.durum, dk: x.durum === "yolcuda" && r.donusDk ? Math.max(1, x.kalan || r.donusDk) : null };
    }
    function kaydet(durum, dk, yedekler, mesaj) {
      var once = simdiki();
      var onceYed = yedekleri(s).map(function (x) { return x.kod; });
      return Depo.guncelle(s.kod, giris.pin, durum, durum === "yolcuda" ? dk : null, yedekler || null).then(function () {
        sayfaPanel();
        bildir(mesaj, function () {
          Depo.guncelle(s.kod, giris.pin, once.durum, once.dk, yedekler ? onceYed : null).then(function () { sayfaPanel(); bildir("Geri alındı."); });
        });
      }).catch(function (err) { bildir(err.message === "PIN yanlış" ? "PIN değişmiş. Çıkış yapıp tekrar gir." : "Kaydedilemedi. İnternetini kontrol et."); });
    }
    app.querySelectorAll("[data-durum]").forEach(function (b) {
      b.addEventListener("click", function () {
        var yeni = b.dataset.durum;
        var hs = hedefSec(s).hedef;
        kaydet(yeni, yeni === "yolcuda" ? HIZLI_DK : null, null,
          yeni === "musait" ? "Müsaitsin. Çağrılar sana geliyor." : yeni === "yolcuda" ? (hs ? "Yolcudasın. Çağrılar " + ek(hs.hitap || hs.ad, "e") + " gidiyor." : "Yolcudasın.") : "Kapalısın. İyi dinlenmeler.");
      });
    });
    app.querySelectorAll("[data-dk]").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = +b.dataset.dk;
        kaydet("yolcuda", m || null, null, m ? m + " dakika sonra kendiliğinden müsait olursun." : "Uzun yol. Dönünce Müsaitim'e bas.");
      });
    });

    function yedekCiz() {
      var l = document.getElementById("yedek-liste");
      l.innerHTML = yed.map(function (k, i) {
        var x = sofor(k), xd = durumu(k).durum;
        return '<div class="yedek-satir"><span class="sira">' + (i + 1) + '</span><span class="ad"><b>' + esc(x.hitap || x.ad) + "</b><small>" + esc(x.plaka) + ' · <span class="durum-yazi ' + xd + '">' + esc(ETIKET[xd]) + "</span></small></span>" +
          '<button type="button" data-yukari="' + i + '" aria-label="' + esc(x.hitap || x.ad) + ' yukarı"' + (i === 0 ? " disabled" : "") + ">" + ik("yukari") + '</button><button type="button" data-asagi="' + i + '" aria-label="' + esc(x.hitap || x.ad) + ' aşağı"' + (i === yed.length - 1 ? " disabled" : "") + ">" + ik("asagi") + '</button><button type="button" data-cikar="' + i + '" aria-label="' + esc(x.hitap || x.ad) + ' listeden çıkar">' + ik("sil") + "</button></div>";
      }).join("") || '<p class="pn-not">Henüz kimse yok. Aşağıdan arkadaş ekle; meşgulken yolcun ona gitsin.</p>';
      var e = document.getElementById("yedek-ekle");
      var kalan = adaylar.filter(function (x) { return yed.indexOf(x.kod) < 0; });
      e.innerHTML = '<option value="">' + (kalan.length ? "Seç…" : "Eklenecek kimse kalmadı") + "</option>" + kalan.map(function (x) {
        var xd = duragi(x);
        return '<option value="' + x.kod + '">' + esc(x.ad) + " · " + esc(x.plaka) + (xd && xd.kod !== s.durak ? " · " + esc(xd.ad) : !xd && s.durak ? " · Bağımsız" : "") + "</option>";
      }).join("");
      e.disabled = !kalan.length;
    }
    function sirayiKaydet() {
      var su = simdiki();
      var ilk = yed.length ? sofor(yed[0]) : null;
      kaydet(su.durum, su.dk, yed.slice(), ilk ? "Sıra kaydedildi. Meşgulken önce " + ek(ilk.hitap || ilk.ad, "e") + " gider." : "Sıra kaydedildi. Listende kimse yok.");
    }
    yedekCiz();
    document.getElementById("yedek-liste").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var i;
      if (b.dataset.yukari) { i = +b.dataset.yukari; yed.splice(i - 1, 0, yed.splice(i, 1)[0]); }
      if (b.dataset.asagi) { i = +b.dataset.asagi; yed.splice(i + 1, 0, yed.splice(i, 1)[0]); }
      if (b.dataset.cikar) { yed.splice(+b.dataset.cikar, 1); }
      sirayiKaydet();
    });
    document.getElementById("yedek-ekle").addEventListener("change", function (e) {
      if (e.target.value) { yed.push(e.target.value); sirayiKaydet(); }
    });

    app.querySelector("[data-qr]").addEventListener("click", function () {
      pencere('<div class="qr-buyuk">' + qrHtml(s.kod) + '</div><h3 style="text-align:center">' + esc(s.hitap || s.ad) + '</h3><p style="text-align:center;margin-top:-6px">' + plaka(s.plaka) + '</p><p class="pn-not" style="text-align:center">Yolcu kamerayla okutsun, sayfan açılır. Ana ekrana eklerse bir dahaki sefere tek dokunuşla seni çağırır.</p><button class="btn btn-hayalet btn-blok" data-kapat>Kapat</button>');
    });
    app.querySelector("[data-gonder]").addEventListener("click", function () {
      var m = "Bir dahaki sefere beni buradan tek dokunuşla çağırabilirsin. " + (s.hitap || s.ad) + ", " + s.plaka + "\n" + tamLink(s);
      if (navigator.share && !HASH) { navigator.share({ text: m }).catch(function (e) { if (e && e.name !== "AbortError") location.href = "https://wa.me/?text=" + encodeURIComponent(m); }); return; }
      window.open("https://wa.me/?text=" + encodeURIComponent(m), "_blank", "noopener");
    });
    app.querySelector("[data-cikis]").addEventListener("click", function () {
      pencere("<h3>Çıkış yapılsın mı?</h3><p>Çıkış yaparsan torpidodaki etiketler bu telefonda çalışmaz, tekrar PIN girmen gerekir.</p>" +
        '<button class="btn btn-kirmizi btn-blok" data-evet>Çıkış yap</button><button class="btn btn-hayalet btn-blok" data-kapat>Vazgeç</button>');
      document.querySelector("[data-evet]").addEventListener("click", function () { kapat(); ls("taksicim_giris", null); sayfaPanel(); });
    });

    // Sayılar: önce 3 büyük sayı; ayrıntı isteyene
    Depo.olaylar("sofor", s.kod, giris.pin, donemAraligi("bu-ay").bas).then(function (ol) {
      var el = document.getElementById("pn-sayi");
      if (!el || ol === null) return;
      if (ol === false) { var n0 = document.getElementById("pn-sayi-not"); n0.textContent = "Sayılar şu an alınamadı. İnternetini kontrol et."; n0.hidden = false; return; }
      var r = sayilar(ol, olayKodlari("sofor", s.kod));
      el.innerHTML = "<div><b>" + r.cagri + "</b><small>Sayfandan çağrı</small></div><div><b>" + r.gelen + "</b><small>Arkadaşlarından sana gelen</small></div><div><b>" + r.kurtarilan + "</b><small>Sen meşgulken arkadaşına giden</small></div>";
      if (!r.cagri && !r.gelen && !r.ziyaret) { var n = document.getElementById("pn-sayi-not"); n.textContent = "Bu ay henüz çağrı yok. İlk yolcun pleksini okuttuğunda burada görünür."; n.hidden = false; }
    });
    var det = document.getElementById("pn-detay");
    det.addEventListener("toggle", function () {
      if (det.open && !det.dataset.yuklendi) { det.dataset.yuklendi = 1; sayiPaneli(document.getElementById("istatistik"), "sofor", s.kod, giris.pin, s.ad, null); }
    });
  }

  // ======================================================
  // SAYILAR: kim, nereden geldi, ne yaptı (satışta ve yenilemede gösterilir)
  // ======================================================
  var DONEMLER = [["bu-ay", "Bu ay"], ["gecen-ay", "Geçen ay"], ["7-gun", "Son 7 gün"], ["hepsi", "Başından beri"]];
  function donemAraligi(k) {
    var n = new Date(), ay = new Date(n.getFullYear(), n.getMonth(), 1);
    if (k === "gecen-ay") return { bas: +new Date(n.getFullYear(), n.getMonth() - 1, 1), bit: +ay, ad: new Date(n.getFullYear(), n.getMonth() - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) };
    if (k === "7-gun") return { bas: Date.now() - 7 * 864e5, bit: null, ad: "son 7 gün" };
    if (k === "hepsi") return { bas: null, bit: null, ad: "başından beri" };
    return { bas: +ay, bit: null, ad: n.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) };
  }
  // Günler Türkiye saatine göre (gece 01.30'daki çağrı bir önceki güne yazılmasın)
  var GUN_BICIM = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" });
  function gunAnahtar(t) { return GUN_BICIM.format(new Date(t)); }
  function bosNesne() { return Object.create(null); }
  var PLEKSI = { nfc: 1, qr: 1 };
  var CAGRI = { arama: 1, konum: 1, yonlendirme: 1 };

  // ol: olay listesi, ic: sayılacak sayfa kodları (null = hepsi)
  function sayilar(ol, ic) {
    var r = { ziyaret: 0, durakZiyaret: 0, nfc: 0, qr: 0, uygulama: 0, tekil: 0, tekrar: 0, kurulum: 0, plekKurulum: 0, rehber: 0, arama: 0, konum: 0,
      kurtarilan: 0, cagri: 0, uygArama: 0, plekCagri: 0, gelen: 0, google: 0, plekGoogle: 0, paylas: 0, esya: 0, gun: bosNesne() };
    var plekCihaz = bosNesne(), cihazGun = bosNesne();
    var icinde = function (k) { return !ic || !!ic[k]; };
    ol.forEach(function (o) { if (icinde(o.kod) && PLEKSI[o.kaynak] && o.cihaz) plekCihaz[o.cihaz] = 1; });
    ol.forEach(function (o) {
      // Başka şoförün/durağın sayfasından bu gruba gelen çağrı
      if (ic && CAGRI[o.tur] && ic[o.hedef] && !ic[o.kod]) r.gelen++;
      if (!icinde(o.kod)) return;
      var p = !!PLEKSI[o.kaynak];
      var gun = gunAnahtar(o.zaman);
      if (o.tur === "ziyaret") {
        if (String(o.kod).indexOf("d:") === 0) r.durakZiyaret++; else r.ziyaret++;
        if (o.kaynak === "nfc") r.nfc++;
        if (o.kaynak === "qr") r.qr++;
        if (o.kaynak === "uygulama") r.uygulama++;
        if (o.cihaz) (cihazGun[o.cihaz] = cihazGun[o.cihaz] || bosNesne())[gun] = 1;
      } else if (o.tur === "kurulum") {
        r.kurulum++;
        if (p || PLEKSI[o.hedef] || plekCihaz[o.cihaz]) r.plekKurulum++;
      } else if (CAGRI[o.tur]) {
        r.cagri++;
        r.gun[gun] = (r.gun[gun] || 0) + 1;
        if (o.tur === "arama") r.arama++;
        if (o.tur === "konum") r.konum++;
        if (o.tur === "yonlendirme" && (!ic || ic[o.hedef])) r.kurtarilan++;
        if (o.kaynak === "uygulama") r.uygArama++;
        if (p) r.plekCagri++;
      } else if (o.tur === "google") { r.google++; if (p) r.plekGoogle++; }
      else if (r[o.tur] != null) r[o.tur]++;
    });
    var cs = Object.keys(cihazGun);
    r.tekil = cs.length;
    r.tekrar = cs.filter(function (c) { return Object.keys(cihazGun[c]).length > 1; }).length;
    return r;
  }

  var KUTULAR = [
    ["Araçtaki pleksi", [["nfc", "Telefonu dokundurup açan"], ["qr", "QR okutan"], ["plekKurulum", "Pleksiden uygulamayı kuran"], ["plekCagri", "Pleksiden çağıran"], ["plekGoogle", "Pleksiden Google yorumuna giden"]]],
    ["Uygulama", [["kurulum", "Uygulamayı kuran"], ["uygulama", "Uygulamadan açılış"], ["uygArama", "Uygulamadan çağıran"], ["tekrar", "Tekrar gelen yolcu"]]],
    ["Çağrılar", [["cagri", "Toplam çağrı"], ["arama", "Telefonla arama"], ["konum", "WhatsApp'tan konum"], ["kurtarilan", "Meşgulken arkadaşa giden"], ["gelen", "Başka sayfalardan gelen"]]],
    ["Diğer", [["ziyaret", "Sayfa açılışı"], ["durakZiyaret", "Durak sitesi açılışı"], ["tekil", "Farklı telefon"], ["rehber", "Rehbere kaydeden"], ["google", "Google yorumuna giden"], ["paylas", "Yolculuğunu ailesine gönderen"], ["esya", "Kayıp eşya bildirimi"]]]
  ];
  function sayiKutulari(r, tip) {
    return KUTULAR.map(function (g) {
      var k = g[1].filter(function (x) { return !(x[0] === "durakZiyaret" && tip === "sofor") && !(x[0] === "gelen" && tip === "hepsi"); });
      return '<div class="sy-grup"><p class="sy-baslik">' + g[0] + '</p><div class="sy-izgara">' + k.map(function (x) {
        return '<div class="sy"><b>' + r[x[0]] + "</b><small>" + x[1] + "</small></div>";
      }).join("") + "</div></div>";
    }).join("") + gunGrafik(r.gun) +
      '<p class="sy-not">Google yorumuna giden: butona basan sayısı; yorumu yazıp yazmadığını Google bize söylemez. WhatsApp: mesaj ekranı açılan sayısı. Uygulamayı kuran: Android\'de "Yükle" onayı ve iPhone\'da ana ekrandan ilk açılış. İsim, numara ve konum kaydedilmez.</p>';
  }
  // Son 14 günün çağrıları, küçük çubuk grafik
  function gunGrafik(gun) {
    var g = [], enCok = 1;
    for (var i = 13; i >= 0; i--) {
      var t = gunAnahtar(Date.now() - i * 864e5);
      g.push([t, gun[t] || 0]); enCok = Math.max(enCok, gun[t] || 0);
    }
    return '<div class="sy-grup"><p class="sy-baslik">Son 14 gün, günlük çağrı</p><div class="sy-grafik" role="img" aria-label="Son 14 günün günlük çağrı sayısı">' + g.map(function (x) {
      return '<span title="' + x[0].slice(8) + "." + x[0].slice(5, 7) + ": " + x[1] + ' çağrı"><i style="height:' + Math.max(3, Math.round(x[1] / enCok * 100)) + '%"></i><small>' + (+x[0].slice(8)) + "</small></span>";
    }).join("") + "</div></div>";
  }
  function raporMetni(ad, r, donemAd) {
    return ad + " · " + donemAd + " raporu (" + S.marka.ad + ")\n\n" +
      "Toplam çağrı: " + r.cagri + " (telefon " + r.arama + ", WhatsApp konum " + r.konum + ")\n" +
      "Meşgulken arkadaşa giden, kaçmayan yolcu: " + r.kurtarilan + "\n" +
      "Pleksiyi okutan: " + (r.nfc + r.qr) + " (NFC " + r.nfc + ", QR " + r.qr + ")\n" +
      "Uygulamayı telefonuna kuran yolcu: " + r.kurulum + " (pleksiden " + r.plekKurulum + ")\n" +
      "Uygulamadan çağıran: " + r.uygArama + "\n" +
      "Tekrar gelen yolcu: " + r.tekrar + "\n" +
      "Rehbere kaydeden: " + r.rehber + "\n" +
      "Google yorumuna yönlenen: " + r.google;
  }

  // Bir kutunun içine dönem seçici + sayılar çizer. tip: sofor | durak
  function sayiPaneli(kap, tip, kod, pin, ad, tel) {
    var donem = ss("taksicim_donem") || "bu-ay";
    kap.classList.add("sy-kap");
    function ciz() {
      var a = donemAraligi(donem);
      kap.innerHTML = '<div class="cipler" role="group" aria-label="Dönem">' + DONEMLER.map(function (x) { return '<button type="button" data-donem="' + x[0] + '" aria-pressed="' + (x[0] === donem) + '">' + x[1] + "</button>"; }).join("") + '</div><p class="sy-yukleniyor">Sayılar geliyor…</p>';
      kap.querySelectorAll("[data-donem]").forEach(function (b) { b.addEventListener("click", function () { donem = b.dataset.donem; ss("taksicim_donem", donem); ciz(); }); });
      Depo.olaylar(tip, kod, pin, a.bas).then(function (ol) {
        var y = kap.querySelector(".sy-yukleniyor");
        if (!y) return;
        if (!ol) { y.textContent = "Sayılar şu an alınamadı. İnternetini kontrol et."; return; }
        ol = ol.filter(function (o) { return !a.bit || o.zaman < a.bit; });
        var r = sayilar(ol, olayKodlari(tip, kod));
        y.outerHTML = ornekUyari() + sayiKutulari(r, tip) +
          '<a class="btn btn-wa btn-blok" target="_blank" rel="noopener" href="https://wa.me/' + (tel ? waNo(tel) : "") + "?text=" + encodeURIComponent(raporMetni(ad, r, a.ad)) + '">' + ik("wa") + "Raporu WhatsApp'tan gönder</a>";
      });
    }
    ciz();
  }
  function ornekUyari() {
    return (ls("taksicim_ornek") || []).length ? '<p class="sy-ornek">' + ik("uyari") + "Ekrandaki sayıların çoğu örnek veridir, gerçek değildir. Sunumda böyle görüneceğini göstermek için.</p>" : "";
  }

  // Demo: sunumda panel boş görünmesin diye açıkça "örnek" yazan veri üretir. Gerçek sitede (Supabase) bu yoktur.
  function ornekVeriUret() {
    var l = [], tohum = 7;
    var rnd = function () { tohum = (tohum * 9301 + 49297) % 233280; return tohum / 233280; };
    var sayfalar = S.soforler.map(function (s) { return s.kod; }).concat(S.duraklar.map(function (d) { return "d:" + d.kod; }));
    var cihazlar = [];
    for (var c = 0; c < 260; c++) cihazlar.push("ornek" + c);
    for (var g = 45; g >= 0; g--) {
      sayfalar.forEach(function (k) {
        var dk = k.indexOf("d:") === 0, n = Math.round(rnd() * (dk ? 5 : 4));
        for (var i = 0; i < n; i++) {
          var z = Date.now() - g * 864e5 - Math.round(rnd() * 864e5 * 0.9);
          if (z > Date.now()) z = Date.now() - 60000;
          var r1 = rnd(), kaynak = dk ? (r1 < 0.6 ? "link" : "uygulama") : r1 < 0.32 ? "nfc" : r1 < 0.55 ? "qr" : r1 < 0.8 ? "uygulama" : "link";
          var cihaz = cihazlar[Math.floor(rnd() * cihazlar.length)];
          var ekle = function (tur, hedef) { l.push({ kod: k, tur: tur, hedef: hedef || null, kaynak: kaynak, cihaz: cihaz, zaman: z, ornek: 1 }); };
          ekle("ziyaret");
          var s = sofor(k), r2 = rnd();
          var hedef = s ? (yedekleri(s)[0] || s).kod : S.soforler.filter(function (x) { return x.durak === k.slice(2); })[0];
          hedef = typeof hedef === "string" ? hedef : hedef ? hedef.kod : null;
          if (r2 < 0.42) ekle("arama", s ? k : hedef);
          else if (r2 < 0.55) ekle("konum", s ? k : hedef);
          else if (r2 < 0.63 && s) ekle("yonlendirme", hedef);
          if (s && kaynak !== "uygulama" && rnd() < 0.09) ekle("kurulum", kaynak);
          if (s && rnd() < 0.05) ekle("rehber");
          if (rnd() < 0.05) ekle("google");
          if (s && rnd() < 0.02) ekle("paylas");
        }
      });
    }
    ls("taksicim_ornek", l);
  }

  // ======================================================
  // RAPOR: bütün müşteriler (sadece biz görürüz)
  // ======================================================
  function sayfaRapor() {
    var giris = ss("taksicim_rapor");
    document.title = "Rapor · " + S.marka.ad;
    var h = '<div class="pn kap" style="max-width:1080px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><a class="logo" href="' + link("tanitim") + '"><span class="lamba">TAKSİ</span>' + esc(S.marka.ad) + "</a>" +
      (giris ? '<button class="btn btn-hayalet" style="min-height:40px;font-size:14px" data-cikis>Çıkış</button>' : "") + "</div>";
    if (!giris) {
      h += '<h1 style="margin-top:22px">Rapor</h1><p style="color:var(--soluk);margin-top:6px">Bütün duraklar ve şoförler tek ekranda: kim pleksiyi okuttu, kim uygulamayı kurdu, kim aradı. Bu sayfa sadece bizim için.</p>' +
        '<form class="kutu" id="rp-form" style="max-width:480px"><label for="rp-pin">Yönetici PIN<input id="rp-pin" type="password" autocomplete="current-password" placeholder="Yönetici PIN"' + (SUPA ? "" : ' value="1234"') + "></label>" +
        (SUPA ? "" : '<p style="color:var(--soluk);font-size:14px">Demo PIN: <span class="kod">1234</span></p>') +
        '<p id="rp-hata" style="color:var(--kirmizi);font-size:14px" hidden></p><button class="btn btn-sari btn-blok" type="submit">Giriş yap</button></form></div>';
      app.innerHTML = h;
      document.getElementById("rp-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var pin = document.getElementById("rp-pin").value.trim();
        Depo.olaylar("hepsi", null, pin, Date.now()).then(function (ol) {
          var he = document.getElementById("rp-hata");
          if (ol === null) { he.textContent = "PIN yanlış."; he.hidden = false; return; }
          if (ol === false) { he.textContent = "Sunucuya ulaşılamadı. İnternetini kontrol et."; he.hidden = false; return; }
          ss("taksicim_rapor", { pin: pin }); // yönetici PIN'i telefonda kalıcı tutulmaz
          sayfaRapor();
        });
      });
      return;
    }
    var donem = ss("taksicim_donem") || "bu-ay";
    var a = donemAraligi(donem);
    h += '<h1 style="margin-top:22px">Rapor</h1><div class="cipler" role="group" aria-label="Dönem" style="margin-top:12px">' + DONEMLER.map(function (x) { return '<button type="button" data-donem="' + x[0] + '" aria-pressed="' + (x[0] === donem) + '">' + x[1] + "</button>"; }).join("") + "</div>";
    h += '<div id="rp-icerik"><p class="sy-yukleniyor" style="margin-top:18px">Sayılar geliyor…</p></div>';
    if (!SUPA) h += '<div class="kutu"><p style="font-weight:700">Sunum için örnek veri</p><p style="color:var(--soluk);font-size:14px;margin-top:-6px">Demo sitede gerçek yolcu yok. Panelin dolu hali nasıl görünür, göstermek için 45 günlük örnek veri yükleyebilirsin. Ekranda "örnek veri" uyarısı çıkar. Gerçek sitede bu düğme yoktur.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn btn-sari" data-ornek>Örnek veriyle doldur</button><button class="btn btn-hayalet" data-ornek-sil>Örnek veriyi sil</button></div></div>';
    h += "</div>";
    app.innerHTML = h;
    app.querySelectorAll("[data-donem]").forEach(function (b) { b.addEventListener("click", function () { ss("taksicim_donem", b.dataset.donem); sayfaRapor(); }); });
    var c = app.querySelector("[data-cikis]");
    if (c) c.addEventListener("click", function () { ss("taksicim_rapor", null); sayfaRapor(); });
    var o1 = app.querySelector("[data-ornek]"), o2 = app.querySelector("[data-ornek-sil]");
    if (o1) o1.addEventListener("click", function () { ornekVeriUret(); sayfaRapor(); bildir("Örnek veri yüklendi."); });
    if (o2) o2.addEventListener("click", function () { ls("taksicim_ornek", null); sayfaRapor(); bildir("Örnek veri silindi."); });

    Depo.olaylar("hepsi", null, giris.pin, a.bas).then(function (ol) {
      if (ol === null) { ss("taksicim_rapor", null); return sayfaRapor(); }
      if (ol === false) { var ic0 = document.getElementById("rp-icerik"); if (ic0) ic0.innerHTML = '<p class="pn-hata">Sunucuya ulaşılamadı. İnternetini kontrol et.</p>'; return; }
      ol = ol.filter(function (o) { return !a.bit || o.zaman < a.bit; });
      var top = sayilar(ol, null);
      var musteriler = S.duraklar.map(function (d) {
        var n = S.soforler.filter(function (s) { return s.durak === d.kod; }).length;
        return { ad: d.ad, alt: "Durak · " + n + " araç", tel: d.whatsapp || d.telefon, tip: "durak", kod: d.kod, demo: d.demo, r: sayilar(ol, olayKodlari("durak", d.kod)) };
      }).concat(S.soforler.filter(function (s) { return !s.durak; }).map(function (s) {
        return { ad: s.ad, alt: "Tek şoför · " + s.plaka, tel: s.telefon, tip: "sofor", kod: s.kod, demo: s.demo, r: sayilar(ol, olayKodlari("sofor", s.kod)) };
      }));
      musteriler.sort(function (x, y) { return y.r.cagri - x.r.cagri; });
      var arac = S.soforler.length;
      var satis = S.marka.sehir + "'da " + arac + " taksi " + S.marka.ad + " kullanıyor. " + a.ad.charAt(0).toUpperCase() + a.ad.slice(1) + ": " + top.cagri + " çağrı, " + (top.nfc + top.qr) + " pleksi okutma, " + top.kurulum + " yolcu uygulamayı telefonuna kurdu, " + top.kurtarilan + " yolcu şoför meşgulken kaçmadı, arkadaşına gitti.";
      var h2 = ornekUyari();
      h2 += '<div class="ozet"><div><b>' + top.cagri + "</b><small>Toplam çağrı</small></div><div><b>" + (top.nfc + top.qr) + "</b><small>Pleksi okutma</small></div><div><b>" + top.kurulum + "</b><small>Uygulamayı kuran</small></div><div><b>" + top.kurtarilan + "</b><small>Kaçmayan yolcu</small></div></div>";
      h2 += '<div class="kutu"><p style="font-weight:700">Bütün müşteriler, ' + esc(a.ad) + "</p>" + sayiKutulari(top, "hepsi") + "</div>";
      h2 += '<div class="kutu"><p style="font-weight:700">Satışta söylenecek cümle</p><div class="mesaj" id="rp-satis">' + esc(satis) + '</div><button class="btn btn-hayalet" data-kopyala>Kopyala</button></div>';
      h2 += '<h2 style="font-size:28px;margin:26px 0 10px">Müşteriler</h2><div class="rp-liste">' + musteriler.map(function (m, i) {
        return '<div class="rp-kart"><div class="rp-ust"><div><b>' + esc(m.ad) + "</b><small>" + esc(m.alt) + (m.demo ? " · demo" : "") + '</small></div><a class="btn btn-hayalet" style="min-height:38px;padding:0 12px;font-size:14px" href="' + link(m.tip === "durak" ? "durak" : "sofor", m.kod) + '">Siteyi aç</a></div>' +
          '<div class="rp-dort"><div><b>' + m.r.cagri + "</b><small>Çağrı</small></div><div><b>" + (m.r.nfc + m.r.qr) + "</b><small>Pleksi okutma</small></div><div><b>" + m.r.kurulum + "</b><small>Uygulama kuran</small></div><div><b>" + m.r.kurtarilan + "</b><small>Kaçmayan yolcu</small></div></div>" +
          '<details><summary>Bütün sayılar</summary><div class="sy-kap">' + sayiKutulari(m.r, m.tip) + "</div></details>" +
          '<a class="btn btn-wa btn-blok" target="_blank" rel="noopener" href="https://wa.me/' + waNo(m.tel) + "?text=" + encodeURIComponent(raporMetni(m.ad, m.r, a.ad)) + '">' + ik("wa") + "Raporu " + esc(ek(m.ad, "e")) + " gönder</a></div>";
      }).join("") + "</div>";
      var ic = document.getElementById("rp-icerik");
      if (!ic) return;
      ic.innerHTML = h2;
      var k = ic.querySelector("[data-kopyala]");
      if (k) k.addEventListener("click", function () {
        (navigator.clipboard ? navigator.clipboard.writeText(satis) : Promise.reject()).then(function () { bildir("Kopyalandı."); }, function () { bildir("Kopyalanamadı, elle seç."); });
      });
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
      '<div class="orta"><div class="qr">' + qrHtml(s.kod) + '</div><div class="nfc">' + ik("nfc") + "Telefonu<br>yaklaştır<br>ya da okut</div></div>" +
      '<div class="alt"><span>Taksi çağır · Konum gönder · Değerlendir</span><span>' + esc(yer) + "</span></div></div>";
  }
  function sayfaEtiket(kod) {
    var hedef = kod && kod.indexOf("d-") === 0 ? S.soforler.filter(function (x) { return x.durak === kod.slice(2); })
      : kod ? [sofor(kod)].filter(Boolean) : S.soforler;
    document.title = "Etiketler · " + S.marka.ad;
    var h = '<div class="et-sayfa kap"><div class="yazdirma-yok" style="display:grid;gap:10px;margin-bottom:20px"><a class="logo" href="' + link("tanitim") + '"><span class="lamba">TAKSİ</span>' + esc(S.marka.ad) + "</a>" +
      '<h1 style="font-size:40px;text-transform:uppercase">Araç etiketleri</h1><p style="color:var(--soluk);max-width:40em">Her araca 3 etiket: arka sol, arka sağ ve ön. Üçü de aynı linke gider. A4\'e gerçek boyutta (10x10 cm) basılır. NFC çipine şu link yazılır (sondaki ?k=n okutmaları saymak için): <span class="kod">' + esc(hedef[0] ? tamLink(hedef[0]) + "?k=n" : "") + "</span></p>" +
      (HASH ? "" : '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sari" onclick="window.print()">Yazdır</button>' + (kod ? '<a class="btn btn-hayalet" href="./">Bütün şoförler</a>' : "") + "</div>") + "</div>";
    hedef.forEach(function (s) {
      h += '<h2 class="yazdirma-yok" style="font-size:24px;margin:18px 0 10px">' + esc(s.ad) + ' <span class="kod" style="font-size:13px">' + esc(tamLink(s) + "?k=n") + '</span></h2><div class="et-izgara">' +
        etiketHtml(s, "Arka sol") + etiketHtml(s, "Arka sağ") + etiketHtml(s, "Ön") + "</div>";
    });
    h += '<h2 class="yazdirma-yok" style="font-size:24px;margin:26px 0 6px">Gösterge paneli etiketleri</h2><p class="yazdirma-yok" style="color:var(--soluk);max-width:40em;margin-bottom:10px">Her şoföre aynı iki etiket. Şoför telefonunu dokundurunca durumu değişir. NFC çipine yazılacak linkler: <span class="kod">' + esc(S.marka.siteUrl.replace(/\/$/, "") + "/panel/#dolu") + '</span> ve <span class="kod">' + esc(S.marka.siteUrl.replace(/\/$/, "") + "/panel/#bos") + "</span></p>" +
      '<div class="et-izgara">' + [["dolu", "Yolcu aldım", "#ffa62b"], ["bos", "Boşaldım", "#2bd47d"]].map(function (x) {
        return '<div class="et-kucuk" style="background:' + x[2] + '"><div class="qr">' + qrPanelHtml(x[0]) + "</div><b>" + x[1] + "</b>" + ik("nfc") + "</div>";
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
      '<span class="tn-nav-sag"><a class="tn-tel" href="tel:' + esc(telSade(M.iletisimTelefon)) + '">' + ik("tel") + esc(telGoster(M.iletisimTelefon)) + '</a><a class="btn btn-sari" style="min-height:48px;padding:0 16px" href="#iletisim">Bize yaz</a></span></div><div class="dama ince" aria-hidden="true"></div></header>';

    // HERO
    h += '<section class="tn-hero"><div class="kap"><div><p class="etiket-ust">' + esc(M.sehir) + " taksicileri için</p>" +
      '<h1 style="margin-top:14px">Yolcun seni <em>bir daha bulsun.</em></h1>' +
      '<p class="giris">Araçtaki pleksiye telefonunu yaklaştıran yolcu, senin sayfanı açar. Bir dahaki sefere tek dokunuşla seni çağırır. Sen yolcudaysan, iş anlaşmalı arkadaşına gider. Yolcu kaçmaz, durakta kalır.</p>' +
      '<div class="eylemler"><a class="btn btn-sari" href="' + link("sofor", ornek.kod) + '">Şoför sayfasını dene' + ik("ok") + "</a>" +
      '<a class="btn btn-hayalet" href="' + link("durak", ornekDurak.kod) + '">' + ik("ev") + "Durak sitesini gör</a>" +
      '<a class="btn btn-wa" href="https://wa.me/' + waNo(M.iletisimTelefon) + "?text=" + encodeURIComponent("Merhaba, taksi sayfası için ücretsiz denemeyi konuşmak istiyorum.") + '" target="_blank" rel="noopener">' + ik("wa") + "1 araca 30 gün ücretsiz dene</a></div></div>";

    // Telefon maketi (sabit örnek: Ahmet yolcuda, Mehmet'e yönlendiriyor)
    h += '<div class="telefon" aria-label="Örnek şoför sayfası"><div class="ekran">' +
      '<div class="sf-durak"><span class="lamba">TAKSİ</span><span><b>' + esc(ornekDurak.ad) + '</b><small style="color:#a2a5aa">' + esc(M.sehir) + "</small></span></div>" +
      '<div class="sf-kart"><div class="dama ince"></div><div class="sf-kimlik"><div class="avatar">' + esc(bas(ornek.ad)) + '</div><div><h1>' + esc(ornek.ad) + '</h1><p class="alt" style="color:#a2a5aa">' + esc(ornek.arac) + "</p></div></div>" +
      '<div class="sf-bilgi">' + plaka(ornek.plaka) + '<span class="durum yolcuda">Yolcuda · ~15 dk</span></div>' +
      '<div class="yonlendir"><div class="baslik">' + ik("yonlen") + "<p><b>" + esc(ornek.hitap) + "</b> şu an yolcuda. Anlaşmalı arkadaşı <b>" + esc(yedek.hitap) + "</b> müsait.</p></div></div>" +
      '<div class="sf-cagir"><span class="btn btn-sari btn-cagir"><span class="ust">' + ik("tel") + esc(ek(yedek.hitap, "i")) + " Çağır</span><small>" + esc(yedek.plaka) + "</small></span></div></div></div></div>";
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
      '<div class="akis-adim"><span class="nokta sari">' + ik("tel") + "</span><div><b>Yolcu " + esc(ek(ornek.hitap, "in")) + " sayfasını açar</b><p>Telefonunda kayıtlı, tek dokunuş.</p></div></div>" +
      '<div class="akis-adim"><span class="nokta amber">' + ik("saat") + "</span><div><b>" + esc(ornek.hitap) + " yolcuda</b><p>Yolcuyu alınca telefonunu torpidodaki etikete dokundurmuş. Sayfa bunu yolcuya gösterir.</p></div></div>" +
      '<div class="akis-adim"><span class="nokta yesil">' + ik("yonlen") + "</span><div><b>Çağrı " + esc(ek(yedek.hitap, "e")) + " gider</b><p>Listedeki ilk müsait arkadaş. Yolcu isterse yine de " + esc(ek(ornek.hitap, "i")) + " bekleyebilir.</p></div></div>" +
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
      '<div class="pleksi-alan"><div class="pleksi" aria-label="10x10 cm NFC ve QR pleksi örneği"><div class="ust"><span>' + esc(ornekDurak.ad) + '</span><span style="font-size:14px">' + esc(ornek.plaka) + '</span></div><div class="orta"><div class="qr">' + qrHtml(ornek.kod) + '</div><div class="nfc">' + ik("nfc") + 'Telefonu yaklaştır<br>ya da okut</div></div><div class="alt">Taksi çağır · Konum gönder · Değerlendir</div></div>' +
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
        '<div style="margin-top:22px"><a class="btn btn-sari" href="' + link("sofor", bag.kod) + '">' + ik("tel") + esc(ek(bag.hitap || bag.ad, "in")) + " sayfasını gör</a></div></div></section>";
    }

    // PAKETLER
    var dp = (S.paketler || []).filter(function (p) { return p.aracBasi && p.enAz > 1; })[0];
    var tl = function (n) { return n.toLocaleString("tr-TR") + " TL"; };
    h += '<section class="tn-bolum" id="paketler"><div class="kap"><p class="etiket-ust">Fiyat</p><h2 style="margin-top:10px">Bir kere kur, yıl boyu çalışsın.</h2><p class="alt-baslik">Aylık abonelik yok. İlk yıl pakete dahil, sonraki yıllar küçük bir yenileme ücreti.</p><div class="paketler">' +
      (S.paketler || []).map(function (p) {
        return '<div class="paket' + (p.one ? " one" : "") + '">' + (p.one ? '<span class="one-rozet">Duraklar için</span>' : "") + "<div><h3>" + esc(p.ad) + '</h3><p class="kime">' + esc(p.kime) + '</p></div><div><p class="fiyat">' + esc(p.fiyat) + '</p><p class="fiyat-not">' + esc(p.not) + "<br>" + esc(p.yenileme) + "</p></div><ul>" +
          p.maddeler.map(function (m) { return "<li>" + ik("tik") + "<span>" + esc(m) + "</span></li>"; }).join("") + "</ul></div>";
      }).join("") + "</div>";
    if (dp) {
      h += '<div class="hesap"><div><p class="etiket-ust">Durağın için hesapla</p><p class="hesap-soru">Durağında kaç araç var?</p><div class="cipler" role="group" aria-label="Araç sayısı">' +
        [5, 8, 10, 15, 20].map(function (n, i) { return '<button type="button" data-arac="' + n + '" aria-pressed="' + (i === 2) + '">' + n + " araç</button>"; }).join("") + "</div></div>" +
        '<div class="hesap-sonuc" aria-live="polite" id="hesap-sonuc"></div></div>';
    }
    h += '<div class="geri-oder"><b>Kendini nasıl öder?</b><p>Araç başı yıllık ücret birkaç yolculuğun parası. Şoför meşgulken ayda bir yolcu bile kaçmasa paket kendini çıkarır. Panelde "kaçmayan yolcu" sayısı bunu her ay sana gösterir; tahmin değil, gerçek sayı.</p></div>';
    if (M.odemeNotu) h += '<p class="odeme-not">' + ik("kart") + esc(M.odemeNotu) + "</p>";
    h += '<div class="kurulum-adim"><p class="etiket-ust">Nasıl başlıyoruz</p><ol>' +
      "<li><b>Durağa geliriz.</b> 10 dakikada telefonunda gösteririz.</li>" +
      "<li><b>1 araca ücretsiz kurarız.</b> 30 gün dene, gelen çağrıları panelde kendin gör.</li>" +
      "<li><b>Beğenirsen bütün araçlara takarız.</b> Pleksi ve torpido etiketleri dahil, şoförlere 5 dakika anlatırız.</li>" +
      "<li><b>Her ay sonu raporun gelir.</b> Kaç çağrı, kaç kaçmayan yolcu, WhatsApp'ına.</li></ol></div>" +
      '<div class="pilot"><h3>Önce dene, sonra karar ver.</h3><p>Durağına gelip 1 araca ücretsiz kurarız. 30 gün kullan, gelen aramaları panelde kendin gör. Beğenmezsen pleksiyi sökeriz, borcun olmaz.</p><a class="btn" href="https://wa.me/' + waNo(M.iletisimTelefon) + "?text=" + encodeURIComponent("Merhaba, taksi sayfası için ücretsiz denemeyi konuşmak istiyorum.") + '" target="_blank" rel="noopener">' + ik("wa") + "Ücretsiz deneme iste</a></div>" +
      '<div class="kim"><span class="lamba">TAKSİ</span><div><b>' + esc(M.gelistirici) + " · " + esc(M.sehir) + "</b><p>Sistemi ben yaptım, durağına da ben gelip kurarım. Bir sorun olursa aracı bekletmeden WhatsApp'tan yazarsın, ben ilgilenirim.</p></div></div>" +
      "</div></section>";

    // SSS
    var sss = [
      ["Yolcu uygulama indirmek zorunda mı?", "Hayır. Pleksiye dokununca sayfa tarayıcıda açılır. İsterse ana ekrana ekler, istemezse rehbere kaydeder."],
      ["Telefon numaram değişirse pleksiyi değiştirecek miyim?", "Hayır. Pleksideki link hep aynı kalır. Biz yeni numaranı sisteme gireriz, aynı gün güncellenir."],
      ["Anlaşmalı arkadaşımı ben mi seçiyorum?", "Evet. Panelden 2-3 arkadaşını sırayla seçersin. İstediğin zaman değiştirirsin."],
      ["Müsait düğmesine basmayı unutursam?", "Sayfa yine seni arar. Yolcu ulaşamazsa sayfaya dönünce müsait arkadaşını önerir. Telefonuna yönlendirme kodu da kurarsak açamadığın arama arkadaşına geçer."],
      ["Google yorumlarını siz mi yazıyorsunuz?", "Hayır. Butona basan yolcu Google'ın kendi ekranında puanını kendisi verir. Sahte yorum ya da filtreleme yapmayız, Google bunu yasaklıyor."],
      ["Yıllık ücret neyi kapsıyor?", "Sayfanın açık kalması, bilgi güncellemeleri, şoför paneli ve destek. Pleksi kırılırsa yenisini maliyetine basarız."],
      ["Şoförlerim bunu kullanmaz ki.", "Şoförün tek işi var: yolcu binince telefonunu torpidodaki etikete dokundurmak. Unutsa bile 25 dakika sonra kendiliğinden müsait olur, yolcu \"Ulaşamadın mı?\" ile arkadaşına geçer. Hiç dokunmasa da sayfa ve pleksi çalışır, yolcu yine o şoförü arar."],
      ["İnternet giderse ne olur?", "Sayfa telefonda kayıtlı kalır, yolcu yine şoförü arar. Sadece \"müsait mi\" bilgisi o an görünmez."],
      ["Durağın sabit telefonu ne olacak?", "Aynen kalır. Durak sitesindeki numara sizin numaranız. Bütün araçlar meşgulse yolcuya durağın numarası gösterilir."],
      ["Bırakırsam ne olur?", "Yenilemezsen pleksiyi okutan yolcuya durağının numarası gösterilir; yolcu yine size düşer. Bağımsız şoförün sayfası kapanır. Sözleşmeyle bağlamıyoruz, istediğin yıl bırakırsın."],
      ["Yolcunun ya da şoförün bilgisi sizde mi?", "Şoförün konumunu hiç almıyoruz. Yolcudan da isim, numara, konum tutmuyoruz. Sadece \"şu butona basıldı\" sayısı tutulur."],
      ["Durağımızda 5'ten az araç var, olur mu?", "Olur. 5'ten az araçlı duraklar tek şoför fiyatından değil, araç sayısına göre konuşulur. Yazman yeter."]
    ];
    h += '<section class="tn-bolum" style="background:var(--yuzey)"><div class="kap" style="max-width:820px"><p class="etiket-ust">Sorular</p><h2 style="margin-top:10px">Taksicilerin ve durak başkanlarının sorduğu.</h2><div style="margin-top:24px">' +
      sss.map(function (q) { return '<details class="sss" style="background:var(--yuzey-2)"><summary>' + esc(q[0]) + "</summary><p>" + esc(q[1]) + "</p></details>"; }).join("") +
      "</div></div></section>";

    // İLETİŞİM
    h += '<section class="tn-bolum" id="iletisim"><div class="kap"><p class="etiket-ust">İletişim</p><h2 style="margin-top:10px">Durağına gelelim, gösterelim.</h2><p class="alt-baslik">10 dakikada telefonunda sayfanı açıp gösteririz. ' + esc(M.sehir) + ' içinde ücretsiz geliyoruz.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:22px"><a class="btn btn-wa" href="https://wa.me/' + waNo(M.iletisimTelefon) + "?text=" + encodeURIComponent("Merhaba, taksi sayfası hakkında bilgi almak istiyorum.") + '" target="_blank" rel="noopener">' + ik("wa") + "WhatsApp'tan yaz</a>" +
      '<a class="btn btn-hayalet" href="tel:' + esc(telSade(M.iletisimTelefon)) + '">' + ik("tel") + "Ara: " + esc(telGoster(M.iletisimTelefon)) + "</a></div></div></section>";

    h += '<footer class="tn-alt"><div class="dama" aria-hidden="true" style="margin-bottom:28px"></div><div class="kap"><p>© ' + new Date().getFullYear() + " " + esc(M.ad) + " · " + esc(M.gelistirici) + " · " + esc(M.iletisimEposta) + '</p><p><a href="' + link("panel") + '" style="color:var(--sari-metin)">Şoför girişi</a> · <a href="' + link("rapor") + '" style="color:var(--soluk)">Rapor</a></p></div></footer>';
    app.innerHTML = h;

    var sonuc = document.getElementById("hesap-sonuc");
    function tl(x) { return x.toLocaleString("tr-TR") + " TL"; }
    function hesapla(n) {
      if (!sonuc || !dp) return;
      var ilk = n * dp.aracBasi, sonra = n * dp.yenilemeAracBasi;
      sonuc.innerHTML = '<div><b>' + tl(ilk) + "</b><small>İlk yıl, " + n + " araç (pleksi ve kurulum dahil)</small></div>" +
        "<div><b>" + tl(sonra) + "</b><small>Sonraki yıllar, yıllık</small></div>" +
        "<div><b>" + tl(Math.round(dp.aracBasi / 12)) + "</b><small>Araç başı aylık (ilk yıl)</small></div>";
    }
    app.querySelectorAll("[data-arac]").forEach(function (b) {
      b.addEventListener("click", function () {
        app.querySelectorAll("[data-arac]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        hesapla(+b.dataset.arac);
      });
    });
    hesapla(10);
  }

  // Paketini yenilemeyen şoförün pleksisi boşa düşmesin: okutan yolcu durağa gider
  function pasifSayfa(kod) {
    var ps = (S.pasifler || []).filter(function (x) { return x.kod === kod; })[0];
    var d = ps && ps.durak ? S.duraklar.filter(function (x) { return x.kod === ps.durak; })[0] : null;
    if (!d) return bulunamadi();
    document.title = d.ad + " · Taksi çağır";
    ziyaretSay("d:" + d.kod);
    app.innerHTML = '<div class="uyg" style="padding-block:48px;display:grid;gap:14px"><span class="lamba">TAKSİ</span><p class="etiket-ust">' + esc(d.ad) + '</p><h1 style="font-size:40px;text-transform:uppercase;line-height:1">Taksi mi lazım?</h1><p style="color:var(--soluk)">Bu araç artık bu sayfayı kullanmıyor. Durağı ara, sana en yakın aracı göndersinler.</p>' +
      '<a class="btn btn-sari btn-blok" href="tel:' + esc(telSade(d.telefon)) + '">' + ik("tel") + "Durağı ara · " + esc(telGoster(d.telefon)) + "</a>" +
      '<a class="btn btn-hayalet btn-blok" href="' + link("durak", d.kod) + '">' + esc(d.ad) + " sitesi</a></div>";
  }

  function bulunamadi() {
    app.innerHTML = '<div class="uyg" style="padding-block:60px;display:grid;gap:14px"><span class="lamba">TAKSİ</span><h1 style="font-size:44px;text-transform:uppercase">Sayfa bulunamadı</h1><p style="color:var(--soluk)">Bu link artık kullanılmıyor olabilir. Şoförüne ya da durağa sor.</p><a class="btn btn-sari" href="' + link("tanitim") + '">Ana sayfa</a></div>';
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
      else if (hs === "rapor") v = "rapor";
      else { // sayfa içi bağlantı (#iletisim gibi): görünüm aynı kalır, sadece kaydır
        var hedefEl = document.getElementById(hs);
        if (hedefEl) { hedefEl.scrollIntoView(); return; }
        if (app.children.length) return;
        v = "tanitim";
      }
    } else {
      v = P.view; k = P.kod || (v === "panel" || v === "etiket" ? location.hash.replace(/^#/, "") || null : null);
    }
    renkAyarla(v, k);
    if (v === "sofor") sayfaSofor(k);
    else if (v === "durak") sayfaDurak(k);
    else if (v === "yonetim") sayfaYonetim(k);
    else if (v === "panel") sayfaPanel(k);
    else if (v === "etiket") sayfaEtiket(k);
    else if (v === "rapor") sayfaRapor();
    else if (v === "yok") bulunamadi();
    else sayfaTanitim();
    if (HASH) window.scrollTo(0, 0);
  }

  Depo.yukle().then(rota);
  if (HASH || P.view === "panel") window.addEventListener("hashchange", rota);

  // Canlı durum: sayfayı değil veriyi tazeleriz. Yolcu bir şey yazarken, pencere açıkken ya da
  // değişiklik yoksa ekrana dokunmayız; yeniden çizersek kaydırma ve açık bölümler korunur.
  function aktifGorunum() { return HASH ? (location.hash.indexOf("#t-") === 0 ? "sofor" : location.hash.indexOf("#d-") === 0 ? "durak" : location.hash.indexOf("#panel") === 0 ? "panel" : "") : P.view; }
  function mesgul() {
    var a = document.activeElement;
    return !!document.querySelector(".perde") || (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));
  }
  function tazele() {
    var v = aktifGorunum();
    if (document.hidden || !(v === "sofor" || v === "durak" || v === "panel")) return;
    var once = JSON.stringify([DURUM, YEDEK]);
    Depo.yukle().then(function () {
      if (JSON.stringify([DURUM, YEDEK]) === once && v !== "panel") return;
      if (mesgul() || aktifGorunum() !== v) return;
      if (v === "panel" && location.hash.replace(/^#/, "").match(/^(dolu|bos|degistir)$/)) return;
      var y = window.scrollY, acik = [].map.call(app.querySelectorAll("details"), function (d) { return d.open; });
      if (v === "sofor") sayfaSofor(HASH ? location.hash.slice(3) : P.kod);
      else if (v === "durak") sayfaDurak(HASH ? location.hash.slice(3) : P.kod);
      else if (app.querySelector(".pn-bant")) sayfaPanel();
      app.querySelectorAll("details").forEach(function (d, i) { d.open = !!acik[i]; });
      window.scrollTo(0, y);
    });
  }
  window.addEventListener("storage", function (e) { if (e.key === "taksicim_durum" || e.key === "taksicim_yedek") tazele(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tazele(); });
  if (SUPA) setInterval(tazele, 30000);
  // Süre dolunca "yolcuda" kendiliğinden "müsait" olur; ekrandaki yazı da dakikada bir güncellensin
  setInterval(function () { if (!SUPA) tazele(); }, 60000);

  if (!HASH && "serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(P.base + "sw.js").then(function (reg) {
        // Bu sayfayı ve dosyalarını telefona koy: internet yokken de açılsın, şoför aranabilsin
        navigator.serviceWorker.ready.then(function (r) {
          var v = "?v=" + (P.surum || "");
          if (r.active) r.active.postMessage({ onbellek: [location.pathname, P.base + "assets/style.css" + v, P.base + "assets/app.js" + v, P.base + "assets/veri.js" + v] });
        });
        document.addEventListener("visibilitychange", function () { if (!document.hidden) reg.update().catch(function () {}); });
      }).catch(function () {});
    });
    // Yeni sürüm yayınlanınca, kimse bir şey yazmıyorsa sayfayı sessizce yenile
    // İlk ziyarette de controllerchange gelir (yeni kurulum); o zaman yenilemeye gerek yok, sayfa zaten taze
    var ilkKurulum = !navigator.serviceWorker.controller, yenilendi = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (ilkKurulum) { ilkKurulum = false; return; }
      if (yenilendi || mesgul()) return;
      yenilendi = true; location.reload();
    });
  }
})();
