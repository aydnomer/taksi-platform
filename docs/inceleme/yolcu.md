# Yolcu gözüyle inceleme (Elazığ)

> Bu notlar uygulamanın inceleme anındaki halini anlatır. Satır numaraları ve ekran görüntüsü adları o ana aittir; neyin yapıldığı `docs/INCELEME.md` içinde.

Kapsam: /t/ahmet/ (meşgul, Mehmet'e yönlendiriyor), /t/mehmet/, /t/kemal/ (bağımsız), /d/ornek-durak/, /d/kale-taksi/.
Ekranlar: 390x844 ve 360x740, açık ve koyu tema; durak sitesi 1280'de. Android, iPhone Safari ve iPhone WhatsApp içi tarayıcı kullanıcı aracısıyla. Bütün butonlara basıldı (demo pencereleri). Gerçek arama ve "Ulaşamadın mı?" akışı koddan izlendi.
Ekran görüntüleri: `scratchpad/inceleme/yolcu/*.png`. Betikler: `shot.mjs`, `pop.mjs`, `perf.mjs`, `nf.mjs`, `foot.mjs`.
Satır numaraları `src/app.js` ve `src/style.css` dosyalarına göredir.

Düşünülen yolcular: gece yarısı eve dönen biri, valizli biri, gözü iyi görmeyen bir teyze, şehre yeni gelmiş bir öğrenci veya turist, linki WhatsApp'tan açan biri. İlk 3 saniyede istedikleri: "Ara" tuşu, kimin geleceği (isim, plaka, araç) ve bunun güvenilir olduğu.

---

## P1: mutlaka düzeltilmeli

### 1. Araçtaki yolcuya "başka taksi çağır" deniyor (şoför sayfası, `?k=n` / `?k=q`)
- **Sorun:** NFC veya QR pleksi aracın içinde duruyor. Pleksiyi okutan kişi büyük ihtimalle tam o anda Ahmet'in yolcusu. Ahmet de onu aldığı için "yolcuda" demiş. Bu yüzden sayfa yolcuya ilk iş olarak "Ahmet Abi şu an yolcuda… Mehmet Abi'yi Çağır" gösteriyor. Yolcu açısından bu saçma ve kafa karıştırıcı. Ayrıca gereksiz ikinci bir çağrı riski doğuruyor. Bkz. `t_ahmet__k_n_390_dark_fold.png`, app.js:552-558. `KAYNAK` zaten "nfc" / "qr" olarak biliniyor (app.js:46-59) ama ekranı değiştirmek için kullanılmıyor.
- **Öneri:** `KAYNAK === "nfc" || "qr"` olduğunda en üstte "Bu araçtasın" kartı gösterilsin: "Ahmet Abi'nin aracındasın · 23 T 1001 · Fiat Egea Beyaz". Altında sırayla:
  1. **Yolculuğumu ailemle paylaş** (en büyük buton)
  2. **Rehbere kaydet** veya **Ana ekrana ekle** ("Bir dahaki sefere tek dokunuşla çağır")
  3. **Google'da değerlendir**
  4. Eşya unuttum

  Yönlendirme kutusu ve "Mehmet'i çağır" bu modda hiç gösterilmesin. Ana ekrandan veya düz linkten açılınca bugünkü düzen kalsın.

### 2. "Ahmet Abi'yi bekle" butonu beklemiyor, arıyor (şoför sayfası, meşgul durum)
- **Sorun:** app.js:558 ve 617-618'de `data-bekle`, doğrudan `ara(s)` çağırıyor. Yolcu "bekle"ye basınca bir şey olmamasını, en fazla bir hatırlatma bekler. Onun yerine meşgul şoför aranıyor. Ayrıca saat simgesi de yanıltıcı (`t_ahmet__k_n_390_dark_fold.png`).
- **Öneri:** Etiket "Yine de Ahmet Abi'yi ara" olsun, simgesi telefon olsun. Yeri yeterse altına küçük not: "~20 dk sonra boşalır".

### 3. "Ulaşamadın mı?" penceresi yolcuyu ikinci taksiyi çağırmaya itiyor (gerçek akış)
- **Sorun:** app.js:381-390. Aramadan sonra 2,5 sn ile 4 dk arasında sayfaya her dönüşte, görüşme başarılı olsa bile, pencere açılıyor. Pencerede en büyük sarı buton "Hasan Abi'yi ara". "Ulaştım, sağ ol" ise soluk ikincil buton (`pop_ahmet_ulasamadim.png`). Aceleci veya sarhoş bir yolcu sarıya basar ve iki taksi gelir.
  - Metindeki "Anlaşmalı arkadaşı Hasan Abi" de belirsiz. Başlık Mehmet'ten bahsediyor, oysa Hasan, Ahmet'in yedeği (app.js:359-361).
- **Öneri:** Önce iki eşit büyüklükte butonla sorulsun: "Mehmet Abi'ye ulaşabildin mi?" **[Evet, geliyor]** **[Hayır, açmadı]**. Alternatif şoför sadece "Hayır" seçilince gösterilsin. Metin "Ahmet Abi'nin anlaşmalı arkadaşı Hasan Abi müsait" olsun.

### 4. "Konum gönder" butonu WhatsApp açacağını söylemiyor (tüm sayfalar)
- **Sorun:** Buton yeşil ve üstünde konum simgesi var, ama ne WhatsApp simgesi ne de "WhatsApp" kelimesi geçiyor: app.js:557, 562, 566, 700, 748 (yapışkan barda sadece "Konum").
  - Yaşlı yolcu ne olacağını bilmiyor.
  - Tarayıcının konum izni sorması da sürpriz oluyor.
  - Durak sitesinde mesaj rastgele bir müsait şoföre gidiyor ("Merhaba Mehmet Abi", app.js:752-757). Yolcu durağa yazdığını sanıyor.
- **Öneri:**
  - Etiket "WhatsApp'tan konum at" olsun, `ik("wa")` ve konum simgesi birlikte kullanılsın.
  - Yapışkan barda "WhatsApp" yazsın.
  - Durak sitesinde ya durağın WhatsApp'ına gitsin, ya da butonun altında "Müsait şoför Mehmet Abi'ye gider" yazsın.

### 5. JavaScript yüklenene kadar ekran neredeyse boş (performans)
- **Sorun:**
  - Yavaş ağda (400 kbps, 400 ms gecikme) ilk boyama 2,9 sn, yükleme 6,1 sn sürdü (`perf.mjs`).
  - O ana kadar görünen tek şey, sol üstte 16px'lik küçük bir yedek satır: "Ahmet Demir · 23 T 1001 · 0555…" (`t_ahmet_nojs.png`, build.mjs:89).
  - `app.js` 111 KB, sıkıştırılmamış. İçinde tanıtım, panel ve rapor kodu da var.
  - `veri.js` 24 KB ve bütün şoförlerin verisini taşıyor.
  - Google Fonts render'ı engelliyor. Script'ler `defer` ile yüklenmiyor.
- **Öneri:**
  - build.mjs yedek HTML'ye satır içi kritik CSS ile 64px yüksekliğinde sarı bir `<a href="tel:">Taksi çağır · Ahmet Abi</a>` ve plaka koysun. Böylece JavaScript gelmeden de aranabilsin.
  - Script'ler `defer` ile yüklensin.
  - `veri.js` sayfa başına sadece o şoför, yedekleri ve durağıyla sınırlansın.
  - Panel ve tanıtım kodu ayrı dosyaya alınsın.
  - Fontlar kendi sunucudan, `preload` ile verilsin (ya da sistem fontu yedeği kabul edilsin).

### 6. Durak sitesinde alttaki büyük numaraya basılamıyor (footer)
- **Sorun:** app.js:743'te `<span class="tel" style="user-select:all">0555 000 00 00</span>` link değil. Telefonda büyük numaraya basan yolcu bir şey olmadığını görüyor (`d_ornek_360_light_footer.png`).
- **Öneri:** `<a class="tel" href="tel:+90…">` yapılsın. Adres de Haritalar linki olsun.

### 7. Durak başlığındaki telefon butonu 360px'te iki satıra kırılıyor
- **Sorun:** "0555 000 00 / 00" iki satıra bölünüyor, logo da "YILDIZ / TAKSİ" diye kırılıyor (`d_ornek-durak_360_dark_fold.png`, app.js:692, style.css:353).
- **Öneri:** `.dk-nav .btn { white-space: nowrap }` eklensin. 400px altında sadece telefon simgesi ve "Ara" gösterilsin. Numara zaten footer'da ve hero'da var.

### 8. Açık temada durum rozetlerinin kontrastı yetersiz
- **Sorun:** Rozetler 12-14px. Ölçülen kontrastlar:
  - "Müsait": #0f9a52 / #f0efe9 = **3,16**
  - "Yolcuda": #c26f00 / #f0efe9 = **3,27**
  - "Hizmet dışı": #8b8e93 / #f0efe9 = **2,85**

  Gündüz güneşinde, gözü zayıf yolcu için "Müsait mi?" sorusunun cevabı bu küçük yeşil yazıda (`t_kemal__k_q_390_light_full.png`, style.css:35-36, 32).
- **Öneri:** Açık temada `--yesil: #0a7a3f`, `--amber: #9a5600`, `--gri: #62666c` kullanılsın (hepsi 4,5 üstü). Rozet yazısı en az 14px olsun.

### 9. Ton tutarsız: sen ve siz karışık
- **Sorun:** Şoför sayfası "sen" diyor ("Seni bekletmeyelim", "Konumun…"). Diğer yerler "siz":
  - Durak SSS: "size en yakınsa", "gönderirseniz", "Beklemek isterseniz", "Konumunuz" (site.json, `sss`)
  - Footer: "Bize ulaşın" (app.js:743)
  - Bulunamadı sayfası: "Şoförünüze ya da durağa sorun" (app.js:1404)

  Aynı durak sayfasının hero'su "çağrın ona gider" diyor, SSS'i "size" diyor.
- **Öneri:** Yolcuya giden bütün metinler "sen" olsun: "Bize ulaş", "Şoförüne ya da durağa sor", SSS cevapları "sana / gönderirsen". Durağa ve şoföre giden WhatsApp mesajlarında "siz" kalsın, orası doğru.

---

## P2: düzeltilmeli

### 10. Fiyat ve ödeme bilgisi yok (şoför sayfası)
- **Sorun:** Şoför sayfasında hiç fiyat veya ödeme bilgisi yok. Durak sayfasında sadece "Taksimetre / Belediye tarifesi" yazıyor (app.js:708), rakam yok. `sabitFiyatlar` alanı destekleniyor (app.js:727) ama veride hiç doldurulmamış. Öğrenci ve turistin ilk sorusu "ne kadar tutar, kart geçer mi?".
- **Öneri:**
  - Şoför ve durak verisine `odeme: ["Nakit","Kart","IBAN"]` eklensin, çağır kartının altında küçük ikonlarla gösterilsin.
  - Durak sayfasında açılış ve km ücreti yazsın ("Açılış X TL · km Y TL · Belediye tarifesi, 2026").
  - `sabitFiyatlar` en az havalimanı → merkez ve otogar → üniversite için doldurulsun.

### 11. Havalimanı ve ileri saat için rezervasyon akışı yok
- **Sorun:** "Uçuş saatine göre alım" ve "randevulu çalışırım" yazıyor (site.json), ama tıklanacak bir buton yok.
- **Öneri:** Hizmetler kartına "Saat ver, ayırt" butonu eklensin. Hazır WhatsApp mesajı açsın: "Merhaba, [tarih] [saat] için [nereden] → [nereye] taksi istiyorum. Uçuş no: … Kişi/bavul: …"

### 12. Şoför fotoğrafı yok, sadece baş harfler var (güven)
- **Sorun:** "AD", "MK" gibi kutular, gece yalnız binen bir yolcu için güven vermiyor (`t_ahmet__k_n_390_dark_fold.png`, app.js:549).
- **Öneri:**
  - Veriye `foto` alanı eklensin, şoför onayıyla yüz fotoğrafı gösterilsin.
  - Yanına "Ruhsatlı ticari plaka · Elazığ Belediyesi" ve şoför belge numarası (ruhsat / SRC) satırı konsun.
  - Durak varsa "Yıldız Taksi'ye kayıtlı" rozeti eklensin.

### 13. Yönlendirme kutusunun simgesi tam ekran simgesine benziyor
- **Sorun:** app.js:554'te kullanılan `ik("yonlen")`, iki yöne çapraz ok. Video tam ekran simgesi gibi görünüyor.
- **Öneri:** Ok-yön simgesi ("→ kişi") ya da `uyari` kullanılsın, ya da hiç simge olmasın. Metin de kısalsın: "**Ahmet Abi yolcuda** (~20 dk). Yerine **Mehmet Abi** müsait." Bu bilgi rozette de tekrar ediyor.

### 14. "Anlaşmalı şoförleri" başlığı ve sıralaması
- **Sorun:**
  - Başlık kulağa yabancı geliyor (app.js:573).
  - Listenin ilk satırı, hemen üstteki büyük butonla aynı kişi (Mehmet).
  - Kemal'in sayfasında meşgul Ahmet listenin başında ve arama tuşu aktif (`t_kemal__k_q_390_light_full.png`, app.js:579).
- **Öneri:**
  - Başlık "Ahmet Abi meşgulse bunlar gelir" olsun.
  - Müsait olanlar üste sıralansın.
  - Yolcuda olanın tuşu soluk gösterilsin, kalan dakikası yazsın.
  - Büyük butonda zaten gösterilen kişi listede tekrar edilmesin.

### 15. Durak sitesinde araç kartındaki telefon simgesi bazen aramıyor
- **Sorun:** app.js:768'de şoför meşgulse telefon tuşu sayfayı şoförün sayfasına götürüyor. Yolcu telefon simgesine basıp sayfanın değiştiğini görüyor.
- **Öneri:** Meşgul şoförün tuşunda "Yönlendir" ok simgesi olsun, ya da yedek şoför doğrudan aransın ve "Ahmet Abi yolcuda, Mehmet Abi aranıyor" bildirimi çıksın.

### 16. Durak sitesinin ilk ekranında dört arama butonu var
- **Sorun:** Başlıkta numara, hero'da "Taksi çağır" ve "Konumumu gönder", altta yapışkan bar ilk yüklemede hepsi aynı anda görünüyor (`d_kale-taksi_390_light_fold.png`). Başlıktaki buton durağı arıyor, hero'daki rastgele bir şoförü. Yolcu farkı bilmiyor.
- **Öneri:**
  - Yapışkan bar `IntersectionObserver` ile hero butonları görünmez olunca çıksın.
  - "Taksi çağır" altına küçük not: "Müsait şoföre bağlanır".
  - Başlıktaki numara mobilde gizlensin (madde 7).

### 17. Masaüstünde "Taksi çağır" işe yaramıyor (durak, 1280)
- **Sorun:** Gerçek sitede `tel:` linki masaüstünde ya hiçbir şey yapmıyor ya da FaceTime veya Skype açıyor (`pop_durak_cagir_desktop.png`).
- **Öneri:** `matchMedia("(pointer:fine)")` ile tespit edilsin. Masaüstünde numara büyük yazısıyla ve "Telefonunla okut" QR koduyla bir pencerede gösterilsin.

### 18. Eşya unuttum penceresinde yanlış metinler
- **Sorun:**
  - Şoför sayfasında metin "Bilmiyorsan 'Emin değilim' de, durak bütün araçlara sorar" diyor, ama listede o seçenek yok, tek araç var (app.js:654-655).
  - Kemal'in durağı yok, ama hem bu metin hem de demo başlığı "Durağa giden mesaj" çıkıyor (app.js:668, `pop_kemal_esya.png`).
  - Mesaj "…araçta siyah cüzdan unuttum" diye kuruluyor, Türkçede ek eksik kalıyor (doğrusu "cüzdanımı").
  - Tarih hep bugün. Eşyasını ertesi sabah fark eden yolcu için yanlış.
- **Öneri:**
  - Metin `s` / `d` durumuna göre ayrılsın.
  - Başlık "{hedef.ad}'e giden mesaj" olsun.
  - Mesaj kalıbı: "Merhaba, {tarih} günü {plaka} plakalı araçta eşyamı unuttum: {ne}. Bulunursa haber verir misiniz?"
  - "Bugün / Dün" seçimi eklensin.

### 19. Ekranın altındaki bildirim pencerenin butonunu kapatıyor
- **Sorun:** "Konumun alınıyor…" bildirimi alttan açılan pencerenin son butonunun ("Tamam" / "Vazgeç") üstünde duruyor (`pop_ahmet_konum.png`, `pop_ahmet_esya.png`). Sebebi z-index 90 ve bottom 18px (style.css:326-331). Pencere değişse bile bildirim 3,2 sn kalıyor.
- **Öneri:** Pencere açıkken bildirim üstte gösterilsin (`top: calc(12px + env(safe-area-inset-top))`), ya da yeni pencere açılınca `bildirim` kaldırılsın.

### 20. iPhone ana ekran rehberinde isim tutmuyor ve WhatsApp içi tarayıcıda kolay yol yok
- **Sorun:**
  - 3. adım "Ekranında **Ahmet Abi** simgesi belirir" diyor (app.js:478), ama `apple-mobile-web-app-title` değeri "Ahmet Taksi".
  - WhatsApp içi tarayıcı penceresinde (`pop_ahmet_anaekran_ioswa.png`, app.js:470-473) tek dokunuşla "Rehbere kaydet" seçeneği yok. Asıl orada en kolay yol o.
  - Android'de WhatsApp içi tarayıcıda (UYG_ICI ama iOS değil) Android ⋮ talimatı gösteriliyor. Orada "Uygulamayı yükle" yok.
- **Öneri:**
  - Metin `esc(kisaAd)` ile manifest'teki `short_name`'den alınsın.
  - İçi tarayıcı dalına da `rehber` butonu eklensin.
  - Android içi tarayıcı için "Chrome'da aç" talimatı yazılsın.

### 21. Bağımsız şoförün sayfası kurumsal bir firma gibi görünüyor (Kemal)
- **Sorun:** Üst başlık "ELAZIĞ TAKSİ / Bağımsız şoför" (app.js:544), resmi bir firma adı gibi okunuyor. Kemal'in Google yorum satırı da yok (googleYorum boş).
- **Öneri:** Başlık "Kemal Abi · Taksi" ya da "Bağımsız taksici" olsun. Bağımsız şoförler için `googleYorum` zorunlu tutulsun, ya da "Google'da değerlendir" yerine "Kemal Abi'yi tavsiye et" (paylaşım) konsun.

### 22. Kemal'in çalışma saati çağır butonunun yanında yazmıyor
- **Sorun:** Kemal'in "Gece 02.00'ye kadar" bilgisi sayfanın en altında, Hizmetler'de kalıyor. Saat 03:00'te bakan yolcu bunu görmeden arıyor.
- **Öneri:** Veriye `calisma: "07.00-02.00"` eklensin. Saat dışındaysa çağır kartında "Şu an çalışmıyor, sabah 07.00'de" yazsın ve yedekler öne çıksın.

### 23. Yazı boyutları kullanıcının büyük yazı ayarına uymuyor
- **Sorun:** Bütün boyutlar px ile verilmiş (`.durum` 12px, `.kisi .ad small` 13px, `.kucuk-not` 12,5px, `.alt-imza` 12px, `.plaka b` 10px). Kullanıcı tarayıcıda büyük yazı ayarı açsa bile sayfa küçük yazıyla kalıyor (`t_ahmet_360_buyukyazi.png`).
- **Öneri:** Gövde ve küçük metinler `rem` ile verilsin. Hiçbir okunacak metin 14px'in altına inmesin.

### 24. Dokunma alanları 48px'in altında
- **Sorun:** Ölçülenler (`pop.mjs` çıktısı):
  - Yedek şoför arama tuşu 46x46 (style.css:262)
  - "Ana ekrana" 126x40 (app.js:545)
  - Durak başlığındaki telefon 42px
  - "Nasıl görünür?" ve "Eşyamı bildir" 42px
  - Kur-şeridindeki kapat tuşu 34x34 (style.css:735)
  - Footer linkleri 17px yüksekliğinde
- **Öneri:** Hepsi en az 48x48 olsun. `.kur-kapat` 44 + padding olsun.

### 25. Ekran okuyucu etiketleri eksik
- **Sorun:**
  - Pencerede `aria-labelledby` yok (app.js:309).
  - Plakanın `aria-label`'ı rolü olmayan `<span>` üstünde, yok sayılıyor: "TR, 23 T 1001" diye okunuyor (app.js:116).
  - Durum rozetleri canlı bölge değil.
  - Pencere kapanınca odak geri dönmüyor.
- **Öneri:**
  - Pencerede h3'e id verilsin, `aria-labelledby` bağlansın.
  - Plaka için `role="img" aria-label="Plaka 23 T 1001"` kullanılsın.
  - `kapat()` odağı açan butona geri versin.

### 26. Hareketli öğeler azaltılmış hareket ayarına uymuyor
- **Sorun:** Nabız animasyonları, `ios-ok` zıplaması ve pencere animasyonu sürekli çalışıyor. `prefers-reduced-motion` kuralı yok (style.css:132, 641).
- **Öneri:** `@media (prefers-reduced-motion: reduce) { *{animation:none!important; transition:none!important} }` eklensin.

---

## P3: olursa iyi olur

27. **Ek hizmet ikonları.** Veriye `ozellik: ["bagaj-genis","cocuk-koltugu","evcil-hayvan","engelli-uygun","klima","fatura"]` eklensin. Plakanın altında küçük ikonlar olarak gösterilsin. Valizli, bebekli veya köpekli yolcu aramadan önce bilsin.
28. **Fatura / fiş.** SSS'e "Fatura alabilir miyim?" sorusu eklensin. Şoförün e-Arşiv / fiş durumu yazsın.
29. **Son aranan.** Durak sitesine dönen yolcuya üstte "Geçen sefer: Mehmet Abi · 23 T 1002 [Ara]" gösterilsin. `localStorage`'da sadece kod tutulsun.
30. **İngilizce özet.** Üniversite öğrencileri ve Harput turistleri için `?lang=en` ya da tek bir "EN" düğmesi. Sadece çağır, WhatsApp, fiyat ve paylaş metinleri yeter.
31. **PWA ikonu.** Bütün şoförlerin ikonu aynı "TAKSİ" ikonu (`dist/assets/ikon-192.png`). İki şoförü kaydeden yolcu ayırt edemiyor. Build sırasında baş harf ya da plaka basılı ikon üretilsin.
32. **Tema rengi.** `theme-color` sabit #0d0e10 (build.mjs:72). Açık temada da durum çubuğu siyah kalıyor. `<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2ee">` eklensin.
33. **Çevrimdışı yedek sayfa.** Service worker çevrimdışıyken önbellekte olmayan bir sayfa için kök "./" adresini, yani taksicilere yönelik tanıtım sayfasını gösteriyor (`dist/sw.js` son satır). Yedek sayfa en son açılan şoför sayfası olsun. Ayrıca ağ önce denendiği ve zaman aşımı olmadığı için kötü bağlantıda uzun bekleniyor. Şoför sayfası HTML'i için 3 sn zaman aşımı ve ardından önbellek kullanılsın.
34. **Demo modunda rehber.** "Rehbere kaydet" demo modunda da gerçek .vcf indiriyor, çünkü sadece `HASH` kontrol ediliyor (app.js:431). Diğer butonlar gibi `demo` kontrolü eklensin. vCard'a `PHOTO` ve `CATEGORIES:Taksi` eklenebilir.
35. **"Yerel durak" kutusu.** `kurulus` boşsa durak şeridinin 4. kutusu "Yerel durak / Elazığ" gibi boş bir bilgiyle doluyor (app.js:708). Ya gizlensin ya da "Google 4,8 ★" gibi gerçek bir bilgi gösterilsin.
36. **Büyük harf ve isim tutarlılığı.**
    - "Taksi Çağır" (app.js:565) / "Taksi çağır" (app.js:699) / "Mehmet Abi'yi Çağır" karışık. Cümle düzeni seçilsin: "Taksi çağır", "Mehmet Abi'yi ara".
    - "Konum gönder" / "Konumumu gönder" / "Konum" da tek isim olsun.
    - "Ana ekrana" eksik, "Ana ekrana ekle" olmalı.
37. **Türkçe ek riski.** `hitap` boş bir şoför eklenirse "Ahmet Demir'yi Çağır" gibi hatalı ek çıkar (app.js:556, 562, 585). Ünlü uyumuna göre ek seçen küçük bir `ek(ad, "i")` yardımcısı yazılsın, ya da `hitap` zorunlu tutulsun.
38. **Gizlilik notu.** Notun ikinci cümlesi ("…hangi butona basıldığını isim ve numara olmadan sayarız", app.js:602) uzun ve gri. Ya kısaltılsın ("Kimin aradığını kaydetmeyiz.") ya da SSS'e taşınsın.
39. **Masaüstü kart hizası.** Masaüstünde durak kartlarındaki rozet yeri tutarsız: Ahmet'te plakanın altında, diğerlerinde yanında. "21 yıl" da kırılıyor (`d_ornek-durak_1280_light_full.png`). `.sofor-kart .alt` için `flex-wrap` ve sabit bir yükseklik verilsin.
40. **Durak sitesindeki "Nasıl görünür?" butonu** canlı sitede de hep Ahmet'in plakasıyla demo gösteriyor (app.js:773). Butonun bir demo örneği olduğu yanında açıkça yazsın ("Örnek mesaj").

---

## İyi olanlar (korunmalı)

- **Şoför sayfasının çekirdeği güçlü.** 74px'lik sarı çağır butonu, altında araç ve plaka. TR plaka görseli çok tanıdık ve güven veriyor.
- **Meşgul şoförün yerine canlı yedek önermek** gerçek bir sorunu çözüyor. "~20 dk" bilgisi dürüst.
- **WhatsApp mesajları hazır geliyor.** "Merhaba Mehmet Abi, taksi lazım. Konumum: …" mesajında "(Ahmet Abi meşguldü…)" notu şoför için çok iyi bir bağlam.
- **"Yolculuğumu ailemle paylaş"** gerçekten iyi bir güvenlik özelliği. Mesajda plaka, şoför, araç, konum ve link var. `navigator.share` ile WhatsApp yedeği doğru kurulmuş.
- **Eşya unuttum akışı** basit, hazır mesaj iyi.
- **iPhone ana ekran rehberi** ve "Paylaş burada" oku, içi tarayıcı uyarısı ve "Linki kopyala" pratik. Rehbere kaydet yedeği akıllıca.
- **İki tema da tutarlı görünüyor.** Koyu tema geceye uygun. Durak rengi (turuncu) her yerde doğru uygulanıyor.
- **JavaScript olmadan da** tel: linkli yedek satır var. Fikir doğru, sadece büyütülmeli (madde 5).
- **İlk kurulum hatırlatması** 6 sn sonra bir kez çıkıyor, sayfayı kapatmıyor.
- **Durak sitesinin bilgi düzeni doğru:** canlı müsait sayısı, araç listesi ve plakalar, "Sık gittiğimiz yerler" çipleri, SSS'deki "Konumum kaydediliyor mu?".
- **Yatay taşma yok,** 360px'te bile.
- **Koyu temada soluk metin kontrastı iyi:** 7,1:1.
