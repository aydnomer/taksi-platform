# Taksicim: şoför ve durak başkanı gözüyle inceleme

> Bu notlar uygulamanın inceleme anındaki halini anlatır. Satır numaraları ve ekran görüntüsü adları o ana aittir; neyin yapıldığı `docs/INCELEME.md` içinde.

Kim: (a) 50 yaşında, uygulamadan hoşlanmayan, telefonu arabada tek elle kullanan, Android'i ucuz bir şoför; (b) parayı ödeyecek olan Elazığlı durak başkanı.
Nasıl: Playwright ile 390x844, 360x640 ve 1280 genişlikte, açık ve koyu temada bakıldı. Panellere girildi, düğmelere basıldı, ekran görüntüleri tek tek açılıp incelendi.
Ekran görüntüleri `inceleme/sofor/ss/` klasöründe (`m-` telefon, `s-` 360px, `d-` masaüstü; `-dark`/`-light`). Betikler: `inceleme/sofor/cek.mjs`, `kes.mjs`.
Hiçbir boyutta yana kaydırma çıkmadı. Konsolda tek hata vibrate engeli; bu otomasyonun yan etkisi, gerçek dokunuşta olmaz.

---

## P1: Düzeltilmeden satılmaz

### 1. Şoför paneli: arkadaş sırası "Kaydet"e basılmazsa sessizce kayboluyor
- **Sayfa:** `/panel/`
- **Sorun:** Yukarı/aşağı/çıkar ve "Arkadaş ekle" yalnızca ekrandaki listeyi değiştiriyor. Kayıt, başka bir kutudaki (durum kutusundaki) "Kaydet" düğmesiyle oluyor (`src/app.js:929`, `:994-1003`). Test ettim: sıra Hasan, Mehmet, Kemal yapıldı; sayfa yenilenince yine Mehmet, Hasan, Kemal. Şoför "ayarladım" sanıyor, yolcu yanlış kişiye gidiyor.
- **Düzeltme:** Her değişiklik anında kaydedilsin: yukarı, aşağı, çıkar ve ekle `Depo.guncelle(..., yedekler)` çağırsın. Ardından şu bildirim çıksın: "Sıra kaydedildi. Meşgulken ilk {Hasan Abi}'ye gider." Durum kutusundaki "Kaydet" düğmesi de kalksın (bkz. 2).

### 2. Durum değiştirmek iki dokunuş, olması gereken bir
- **Sayfa:** `/panel/` (`m-dark-04b-panel-fold.png`, `s-dark-04b-panel-fold.png`)
- **Sorun:** Önce "Yolcudayım" seçiliyor, sonra dakika, sonra ekranın aşağısındaki "Kaydet". 360x640 ekranda Kaydet ilk ekrana sığmıyor (`s-dark-04b`). Yolcu kapıyı açmışken şoför ilk dokunuşla iş bitti sanıyor ama hiçbir şey kaydedilmemiş oluyor.
- **Düzeltme:** Üç büyük düğmenin her biri dokunulduğu anda kaydetsin:
  - "Müsaitim" → hemen kaydeder.
  - "Yolcudayım" → hemen 25 dk ile kaydeder. Altında küçük ikinci satır çıkar: "Süreyi değiştir: 10 · 30 · 60 dk · Şehir dışı".
  - "Hizmet dışı" → hemen kaydeder.
  - Kaydet düğmesi kalkar. Her kayıttan sonra "Geri al" düğmeli bir bildirim çıkar.

### 3. Panelde yolcular şoförü hangi durumda görüyor, ilk bakışta anlaşılmıyor
- **Sayfa:** `/panel/` (`m-dark-04-panel.png`)
- **Sorun:** "Şu an yolcular seni **Yolcuda** görüyor" yazısı başlığın altında, 14 px gri harfle duruyor. Oysa şoförün panelde görmek istediği tek bilgi bu.
- **Düzeltme:** Sayfanın en üstüne, tam genişlikte, durum renginde büyük bir bant konsun: "YOLCUDASIN · 18 dk sonra müsait · Çağrılar Mehmet Abi'ye gidiyor". Müsaitken yeşil bant: "MÜSAİTSİN · Çağrılar sana geliyor". Bant `hizliIslem` ekranının küçük bir hali olabilir.

### 4. Şoför paneli ana ekrana eklenince satış sayfası açılıyor
- **Dosya:** `dist/panel/index.html` (`<link rel="manifest" href="../manifest.webmanifest">`) ve `dist/manifest.webmanifest` (`start_url: "./"`, `name: "Taksicim"`)
- **Sorun:** Şoför paneli "uygulama" diye telefonuna ekliyor. Simgeye bastığında tanıtım ve satış sayfası `/` açılıyor, panel değil. Simgenin adı da "Taksicim", "Şoför Paneli" değil.
- **Düzeltme:** Panele ayrı bir manifest yazılsın: `panel/manifest.webmanifest`, `start_url: "./"`, `scope: "./"`, `name: "Şoför Paneli"`, `short_name: "Panelim"`. Mümkünse ayrı bir ikon (yeşil/turuncu nokta) verilsin.

### 5. Satış sayfasında telefon numarasına dokunulunca aranmıyor
- **Sayfa:** `/` iletişim bölümü (`src/app.js:1397`, `kes-iletisim.png`)
- **Sorun:** Numara bir `span` (`user-select:all`). Telefondan bakan başkan dokunur, hiçbir şey olmaz. Satış sayfasındaki tek gerçek numara bu.
- **Düzeltme:** `<a class="btn btn-hayalet" href="tel:+905307652147">` + ikon + "Ara: 0530 765 21 47". Masaüstü üst çubuğuna "Bize yaz"ın yanına telefon numarası da yazılsın.

### 6. Fiyat net değil: toplam, KDV ve ödeme şekli yazmıyor
- **Sayfa:** `/#paketler` (`kes-paketler.png`, `data/site.json` → `paketler`)
- **Sorun:** "Araç başı 700 TL, en az 5 araç" yazıyor. Başkan kafadan çarpmak zorunda kalıyor. KDV dahil mi, fatura kesiliyor mu, peşin mi taksitle mi, kim ödüyor (durak kasası mı, şoför mü), hiçbiri yazmıyor. Sonraki yıl ücretinin zamanla artıp artmayacağı da belirsiz.
- **Düzeltme:** Durak paketinin altına bir örnek hesap satırı eklensin: "10 araçlık durak: ilk yıl 7.000 TL (araç başı ayda yaklaşık 58 TL). Sonraki yıllar 3.000 TL." Altına küçük bir satır: "Fiyatlar KDV dahil · Fatura kesilir · Nakit, havale ya da kart · İstersen 2 taksit." (Bunlar gerçekte nasılsa öyle yazılsın.) Bir de araç sayısı seçici olabilir: 5 · 10 · 15 · 20 araç → toplam.

### 7. Başkan için 30 saniyede "kim yaptı, niye güveneyim, param çıkar mı" cevabı yok
- **Sayfa:** `/`
- **Sorun:**
  - Yapan kişi yalnızca altbilgide geçiyor ("Ömer Faruk Aydın · e-posta"). Yerel olduğu, yüzü, durağa gelip kurduğu hiçbir yerde anlatılmıyor.
  - Referans yok. Kural gereği uydurma referans konamaz, bu doğru, ama boşluğun yerine hiçbir şey konmamış.
  - Para hesabı soyut: "Yolcu kaçmaz" deniyor ama TL olarak hesap yok.
  - İlk ekrandaki iki düğme (`src/app.js:1278-1279`) şoför demolarına gidiyor, başkanın düğmesi değil. "Şoför sayfasını dene" düğmesinde telefon ikonu var, "arayacak" gibi duruyor.
- **Düzeltme:**
  - İlk ekrana üçüncü bir düğme: "Ücretsiz deneme iste" (WhatsApp). "Şoför sayfasını dene" düğmesinin ikonu telefon değil göz ya da ok olsun.
  - Fiyatın hemen üstüne "Kendini kaç ayda öder?" kutusu: "Ayda sadece 2 yolcu kaçmasa (2 × ortalama yolculuk ücretin) paket ilk aylarda kendini öder. Panelde 'Meşgulken arkadaşa giden' sayısı bunu sana her ay gösterir." Somut tutar gerçek Elazığ tarifesiyle yazılsın, uydurma rakam olmasın.
  - Güven bloğu: "Elazığ'dan, Ömer Faruk Aydın. Durağına gelip kendim kurarım. Sorun olursa WhatsApp'tan aynı gün dönerim." Fotoğraf bulunsun. İlk müşteriler gelene kadar referans yerine: "İlk 10 durağa kurulum ücretsiz / indirimli."
  - Bir de "İnternet giderse ne olur?" (bkz. 8) ve "Bırakırsam ne olur?" soruları.

### 8. Başkanın itirazlarına cevap yok (SSS eksik)
- **Sayfa:** `/` sorular (`src/app.js:1382-1389`)
- **Sorun:** Sorular şoför ağzından yazılmış. Satın alacak kişinin asıl soruları yok.
- **Düzeltme:** Şu sorular eklensin (cevaplar gerçeğe göre düzeltilsin):
  - "Şoförlerim kullanmaz ki." → "Şoförün tek işi var: yolcu binince telefonunu torpidodaki etikete dokundurmak. Unutsa da 25 dakika sonra kendiliğinden müsait olur, yolcu 'Ulaşamadın mı?' ile arkadaşına geçer. Hiç dokunmasa bile sayfa ve pleksi çalışır."
  - "İnternet giderse ya da sizin sisteminiz çökerse?" → "Sayfa telefonda kayıtlı kalır, yolcu yine şoförü arar. Sadece 'müsait mi' bilgisi görünmez."
  - "Durağın sabit telefonu ne olacak?" → "Aynen kalır. Durak sitesindeki numara sizin numaranız. Hepsi meşgulse yolcu durağı arar."
  - "Bırakırsam ne olur?" → "Yenilemezsen sayfa 'Bu şoför artık hizmet vermiyor, durağı ara: …' der. Pleksi yolcuyu yine durağa yollar."
  - "Yolcunun bilgisi, şoförün konumu sizde mi?" → "Hayır. Şoförün konumunu hiç almıyoruz. Yolcudan da isim, numara, konum tutmuyoruz. Sadece sayı."
  - "Paramı nasıl öderim, fatura var mı?" → gerçek cevap.
  - "Durağımızda 4 araç var, olur mu?" → "En az 5" kuralı ne olacak, açıkça yazılsın.

### 9. Panel boşken 21 tane "0" kutusu görünüyor: şoför "bu çalışmıyor" der
- **Sayfa:** `/panel/` ve `/d/ornek-durak/yonetim/` (`m-dark-04-panel.png`, `d-light-14-yonetim.png`)
- **Sorun:** Şoför panelinin uzunluğu 3765 px; yarısı sıfırla dolu sayı kutuları (`KUTULAR`, `src/app.js:1063-1068`). "Pleksiden Google yorumuna giden", "Durak sitesi açılışı" gibi kutular şoförü ilgilendirmiyor. İlk hafta hepsi 0 ve ekran şoföre "bu iş yaramıyor" diyor. Kesin bırakma sebebi.
- **Düzeltme:**
  - Şoför panelinde yalnızca 3 büyük sayı kalsın: "Bu ay seni arayan", "Arkadaşından sana gelen iş", "Sen meşgulken arkadaşına giden". Geri kalanı "Bütün sayılar" altında kapalı dursun.
  - Boşken tek satır yazsın: "Henüz çağrı yok. İlk yolcun pleksini okuttuğunda burada görünür."
  - Başkan panelinde de 4 grubun ilk açılışta kapalı olması yeterli.

### 10. Yönetim panelinde aynı durumun iki adı var ve "Kapalı" sayısı yanıltıyor
- **Sayfa:** `/d/ornek-durak/yonetim/` (`m-light-14-yonetim.png`)
- **Sorun:**
  - Ali Şahin'in rozetinde "Hizmet dışı", hemen altındaki düğmede "Kapalı" yazıyor (`src/app.js:269` ve `:819`). Şoför panelinde de "Hizmet dışı".
  - Üstteki "Kapalı" sayısı, durumu bilinmeyenleri de sayıyor (`say.kapali + say.bilinmiyor`, `src/app.js:813`). Başkan "1 araç kapalı" diye okuyor; aslında belki o şoför sadece hiç basmamış.
- **Düzeltme:**
  - Her yerde tek kelime kullanılsın: "Kapalı". Hem kısa, hem tabelaya benziyor.
  - Bilinmeyenler ayrı gösterilsin: "Bilinmiyor (8 saattir basmamış)". Ya da kutunun adı "Kapalı / bilinmiyor" olsun.

---

## P2: Yapılmalı

### 11. Telefonun hat yönlendirme kodları elle yazdırılıyor
- **Sayfa:** `/panel/` (`src/app.js:936-946`)
- **Sorun:** Yorgun şoför `**67*05550000002#` kodunu tuş takımına elle yazmayacak. Panel arkadaş sırası değişince kodun da değişmesi gerektiğini söylemiyor. Yönlendirilen aramanın şoförün kendi hattından ücretlendirilebileceği uyarısı da yok.
- **Düzeltme:**
  - Her satır tıklanabilir bir bağlantı olsun: `<a href="tel:**67*05550000002%23">Kur</a>`. Not: bazı Android'lerde `#` karakteri `%23` olarak verilmezse kod çevrilmiyor; kurulumda denenmeli.
  - Altına uyarı: "Arkadaş sıran değişirse kodu yeniden kur. Yönlendirilen arama tarifene göre ücretlendirilebilir."
  - "Hepsini kapat" düğmesi kırmızı olsun.

### 12. Arkadaş eklerken bütün şehrin şoförleri listeleniyor, arkadaşın haberi olmuyor
- **Sayfa:** `/panel/` "Arkadaş ekle" (`src/app.js:963`)
- **Sorun:**
  - Seçmede başka duraktaki ve bağımsız şoförler de çıkıyor (Ahmet'in listesinde bağımsız Kemal var). Başkan "Yolcu durakta kalır" diye para veriyor, ama şoför işi başka durağa yönlendirebiliyor. Başkan bunu görünce sorun eder.
  - Eklenen kişinin onayı alınmıyor.
  - Panelde şu yazıyor: "Sen müsaitken de onların yolcusu sana gelir." Bu doğru değil; bu, onların listesine bağlı.
- **Düzeltme:**
  - Liste önce kendi durağının şoförleriyle sınırlansın. Başka duraktan ekleme durak ayarıyla açılsın ("Durak dışına yönlendirme: kapalı/açık", yönetimde).
  - Cümle şöyle olsun: "Seni kendi listesine ekleyen arkadaşların yolcusu, onlar meşgulken sana gelir."
  - Mümkünse panelde "Seni listesine ekleyenler: Mehmet Abi, Hasan Abi" satırı gösterilsin.

### 13. Uzun yol, mola ve "geri al" yok
- **Sayfa:** `/panel/` ve `/panel/#dolu` (`m-dark-07-nfc-dolu.png`, `src/app.js:862-880`)
- **Sorun:**
  - Malatya'ya yola çıkan şoför etikete dokunuyor. 25 dk sonra "Müsait" görünüyor, yolcu yolda olan şoförü arıyor.
  - Çay molası için bir durum yok.
  - Yanlışlıkla dokunulduğunda geri almanın bir yolu yok.
  - "Panele git" düğmesi tek seçenek.
- **Düzeltme:**
  - Durumlara "Molada (15 dk)" ve "Şehir dışı (dönünce ben açarım)" eklensin. İkincisinin süresi dolmasın.
  - Hızlı ekrana iki düğme: "Yanlış oldu, geri al" ve "Uzun yol: 2 saat".
  - Ekran 4 saniye sonra kendiliğinden kapansın ya da kilit ekranına dönsün.

### 14. Giriş ekranı: bütün şoförler bir açılır listede, PIN'in kaç haneli olduğu çelişkili
- **Sayfa:** `/panel/` giriş (`m-light-12-nfc-girissiz.png`, `src/app.js:897-899`)
- **Sorun:**
  - Bütün müşterilerin ad ve plakası herkese açık bir listede duruyor. 100 şoför olunca hem bulmak zor, hem gizlilik sorunu.
  - Kutuda "4 haneli PIN" yazıyor; README Supabase için "6 haneli" diyor.
  - Etiketten girişsiz gelindiğinde ("YOLCU ALDIM" etiketine dokundu ama giriş yapmamış) sadece giriş formu çıkıyor, neden çıktığı söylenmiyor.
- **Düzeltme:**
  - Her şoföre kendi panel linki verilsin: `/panel/#ahmet` (ya da `/t/ahmet/panel`). Bu linkte ad seçili ve sabit olur. Liste kalacaksa durağa göre süzülsün.
  - PIN kutusunun yazısı: "PIN (sana verdiğimiz 6 rakam)". Rakam sayısı tek bir yerden gelsin.
  - Etiketten girişsiz gelindiyse üstte sarı bir şerit çıksın: "Etiket çalıştı ama bu telefonda giriş yok. Bir kere PIN gir, bir daha sorulmaz."

### 15. Çıkış onaysız; yönetimdeki "Yeni şoför ekle" WhatsApp'a atıyor
- **Sayfa:** `/panel/`, `/d/.../yonetim/` (`src/app.js:1005`, `:840`, `:826`)
- **Sorun:**
  - Panelde "Çıkış" sağ üstte, "Taksicim" logosunun yanında. Şoför ona dokunursa etiketler çalışmamaya başlıyor ve kendisinin bundan haberi olmuyor.
  - Yönetimdeki "Yeni şoför ekle" düğmesi beklenmedik şekilde WhatsApp'ı açıyor.
- **Düzeltme:**
  - Çıkış onay istesin: "Çıkış yaparsan torpidodaki etiketler bu telefonda çalışmaz. Emin misin?" [Çıkış yap] [Vazgeç]. Düğme sayfanın en altına taşınsın.
  - Yönetimdeki düğmenin adı "Yeni şoför ekle (bize WhatsApp'tan yaz)" olsun.

### 16. Şoför kendi QR'ını gösteremiyor, sayfasını paylaşamıyor
- **Sayfa:** `/panel/` en alt kutu (`src/app.js:951`)
- **Sorun:** Yolcu "numaranı ver" dediğinde şoförün elinde gösterecek bir şey yok. En çok işe yarayacak tek şey bu.
- **Düzeltme:** Panelin üst kısmına iki büyük düğme:
  - "QR'ımı göster": tam ekran QR açılsın, altında "23 T 1001 · Ahmet Abi" yazsın.
  - "Sayfamı WhatsApp'tan gönder": `wa.me/?text=Beni bir dahaki sefere buradan çağır: https://…/t/ahmet/` açsın.

### 17. Başkan panelinde eksik bilgiler
- **Sayfa:** `/d/ornek-durak/yonetim/`
- **Sorun:**
  - Hangi şoförün en son ne zaman durum değiştirdiği görünmüyor.
  - Bu ay şoför başına çağrı sıralaması yok.
  - Başkan bir şoförün durumunu değiştirince şoförün haberi olmuyor, geri alma da yok.
- **Düzeltme:**
  - Her satıra "12 dk önce güncelledi" yazılsın.
  - "Bu ay en çok iş alan" diye sıralı küçük bir tablo eklensin.
  - Durum değiştirince çıkan bildirimde "Geri al" olsun.
  - Şoför panelinde "Durak başkanı seni Müsait yaptı (14:05)" satırı görünsün.

### 18. Türkçe ek hataları
- **Dosya:** `src/app.js:1218`
- **Sorun:** `"Raporu " + m.ad + "'ya gönder"` her ada "'ya" ekliyor. Sonuç: "Raporu **Yıldız Taksi'ya** gönder", "Raporu **Kemal Arslan'ya** gönder".
  - Benzer şekilde `'yi` ve `'ye` her yerde sabit yazılmış (`:362`, `:556`, `:558`, `:873`, `:998`). Hitap bugün hep "Abi" ile bittiği için doğru çıkıyor, ama "Kemal Usta" yazılırsa "Usta'yi" olur.
- **Düzeltme:** Küçük bir `ek(ad, "e"|"i"|"a")` yardımcısı yazılsın: son ünlüye göre ünlü uyumu, kelime ünlüyle bitiyorsa "y" kaynaştırması. Ya da cümle eksiz kurulsun: "Raporu gönder: Yıldız Taksi".

### 19. Etiket sayfası: başkan baskıya ne yollayacağını bilmiyor
- **Sayfa:** `/etiket/`
- **Sorun:** NFC çipine yazılacak linkler ham `span.kod` olarak duruyor. Kopyala düğmesi yok. Kaç adet basılacağının özeti yok.
- **Düzeltme:**
  - Her linkin yanına "Kopyala" düğmesi.
  - Üstte özet: "Bu durak için: 12 pleksi (4 araç × 3) + 8 torpido etiketi."

### 20. Başkana kurulum adımları anlatılmıyor
- **Sayfa:** `/`
- **Sorun:** "Durağına gelelim" deniyor ama sonrası anlatılmıyor.
- **Düzeltme:** Fiyatın altına 4 adım:
  1. "Durağa geliriz, 10 dk gösteririz."
  2. "1 araca ücretsiz kurarız, 30 gün denersin."
  3. "Beğenirsen bütün araçlara pleksi ve etiket takarız, şoförlere 5 dk anlatırız."
  4. "Her ay sonu durağın raporu WhatsApp'ına gelir."

---

## P3: Olsa iyi olur

21. **Tek etiket yeter mi?** Kodda `#degistir` diye bir aç/kapa işlemi zaten var (`src/app.js:861`). Torpidoya tek bir "DOKUN: YOLCU ALDIM / BOŞALDIM" etiketi yapıştırmak daha az kafa karıştırır. Şoföre bu seçenek sunulsun.
22. **Bildirim:** "Arkadaşın Mehmet Abi'nin yolcusu sana yönlendirildi" gibi bir anlık bildirim, şoförün sistemi her gün açması için en güçlü sebep olur. Supabase + Web Push ile yapılabilir; ilk sürümde WhatsApp mesajı da olur.
23. **Kazanç defteri:** "Bugün kaç yolcu, ne kadar kazandım" ekranı. Bunu sadece isteyen kullansın: "Bugünkü yolculuk: +1" sayacı yeter. Sayfayı kalabalıklaştırmamalı. Önce P1 maddeleri bitsin.
24. **Arkadaşların durumu:** Panelde arkadaş listesinde durum yazıyor ("Müsait"), ama küçük gri yazıyla. Yeşil ve turuncu nokta kullanılsın; durak sitesindeki rozetle aynı olsun.
25. **Dakika çipleri:** Ekranda 4 tane var, 360 px'te "60 dk" ikinci satıra düşüyor (`s-dark-04b`). 3'e indirilebilir (15 · 30 · 60) ya da tek satıra sığacak hale getirilebilir.
26. **Dokunma alanları:** Yukarı/aşağı/çıkar düğmeleri 38x38 px, dakika ve dönem çipleri 42 px yüksekliğinde. Sarsılan arabada tek elle kullanımda en az 48 px olmalı. Bu, TASARIM.md'deki "en az 48 px" kuralına da aykırı.
27. **Masaüstü telefon maketi:** Tanıtım sayfasındaki telefon maketinde dama şeridi kartın üst sol köşesinden dışarı taşıyor (`d-dark-01b-landing-fold.png`). Küçük bir hizalama sorunu.
28. **Yükleniyor durumu:** Başkan panelinde sayılar gelmeden kutuda "…" görünüyor. "Yükleniyor" yazısı ya da iskelet görünüm olmalı. Supabase hatasında `.catch` boş liste döndürdüğü için (`src/app.js:219`) ekranda "0" yazıyor: hata olduğu anlaşılmıyor. Düzeltme: "Sayılar şu an alınamadı. İnternetini kontrol et." yazsın.
29. **Tema düğmesi yok:** Gündüz güneşte açık tema, gece koyu tema lazım; şoför seçemiyor. Panel başlığına güneş/ay düğmesi konsun. CSS'te `data-theme` zaten destekleniyor (`src/style.css:40`).
30. **PIN kutusu:** Demo dışında `type="password"` kullanılsın, ama yanına "Göster" düğmesi olsun. Ayrıca `autocomplete="one-time-code"` yanlış; `"current-password"` olmalı.

---

## Kalsın (iyi olanlar)

- **Torpido NFC'si ve "YOLCUDASIN" ekranı:** Dev, renkli, tek mesajlı (`m-dark-07`). Şoförün gerçekten kullanacağı tek şey bu ve iyi yapılmış. 25 dk sonra kendiliğinden müsait olması doğru karar.
- **"Ulaşamadın mı?" geri dönüşü:** Şoför unutsa da yolcu kaçmıyor. Başkana anlatılacak en güçlü cümle.
- **Dürüstlük:** Uydurma yorum veya referans yok, "örnek veri" uyarısı var, Google filtresi yok, sayıların sınırları açıkça yazılmış. Başkanın güveni için çok iyi.
- **Aylık abonelik olmaması ve "1 araca 30 gün ücretsiz, beğenmezsen sökeriz":** Elazığ'daki başkanın dilinde, güçlü bir teklif.
- **Pazarlama dili:** "Kartvizit çöpe gidiyor", "Şu marketin arkası" tam taksicinin derdi.
- **Görünüm:** Açık ve koyu temada okunaklı, renkler tutarlı (yeşil müsait, turuncu yolcuda). 360 px'te yana kaydırma yok. Başlık yazı tipi tabela hissi veriyor.
- **Başkan panelinde şoförün durumunu değiştirebilmek:** Yaşlı şoförler için gerçek bir kurtarıcı.
- **Hat yönlendirme kodlarının şoförün kendi arkadaşının numarasıyla hazır gelmesi:** Fikir doğru, sadece tek dokunuşla çalışır hale getirilmeli (P2-11).
