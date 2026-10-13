# Baştan sona inceleme ve yapılanlar

Ekim 2026. Uygulama üç gözle baştan incelendi: yolcu, taksici (şoför ve durak başkanı) ve yazılımcı. Her gözün notu öncelik sırasıyla yazıldı. P1 maddelerin hepsi, P2 ve P3 maddelerin büyük kısmı yapıldı. Aşağıda önce senden beklenenler, sonra her bakış için ne bulunduğu ve ne yapıldığı var.

## Senden beklenenler

1. **Fiyatları onayla.** Tek şoför 850 TL (sonra 400 TL/yıl), durak araç başı 700 TL (sonra 300 TL/yıl, en az 5 araç). Hesaplayıcı bunlarla çalışıyor. `data/site.json` → `paketler`.
2. **Ödeme notunu onayla.** Şu an şöyle yazıyor: "Nakit ya da havale. Durak paketinde ödemeyi durak kasası ya da şoförler tek tek yapabilir." `data/site.json` → `marka.odemeNotu`. KDV dahil mi, fatura kesiliyor mu? Bunu ekle ya da bana söyle.
3. **Supabase'i kur.** `supabase/kurulum.sql` dosyasını bir kere çalıştır. PIN'ler en az 6 rakam olsun. Kurulmadan site örnek modda çalışır (PIN 1234).
4. **Alan adı ve marka adı.** "Taksicim" ve GitHub adresi geçici. Karar verince `marka.siteUrl` değişir, her şey kendiliğinden güncellenir. Basılmış QR'lar da bu adrese gider, bu yüzden baskıdan önce karar ver.
5. **Gerçek şoför fotoğrafları** (isteğe bağlı). `soforler[].foto` alanına konursa baş harf yerine fotoğraf çıkar. Gece binen yolcuya güven verir.

## Yolcu gözüyle

**Bulunanlar (P1):** Araçtaki yolcuya "başka taksi çağır" deniyordu. "Bekle" butonu arıyordu. "Ulaşamadın mı?" penceresi görüşme olsa da çıkıp ikinci taksiyi çağırtıyordu. Konum butonu WhatsApp açacağını söylemiyordu. Durak sitesinde numaraya basılamıyordu, başlıktaki numara 360 px'te kırılıyordu. Açık temada durum rozetleri okunmuyordu. "Sen" ve "siz" karışıktı.

**Yapılanlar:**
- Pleksiyi araçta okutan yolcuya artık en üstte **"Bu araçtasın"** kartı çıkıyor: yolculuğunu ailesiyle paylaş, ana ekrana ekle, rehbere kaydet. Taksi çağırma bölümü altta "Taksi lazım olursa" başlığıyla duruyor.
- "Bekle" yerine **"Yine de Ahmet Abi'yi ara"** var.
- Aramadan dönünce önce **"Mehmet Abi'ye ulaşabildin mi?" [Evet, geliyor] [Hayır, açmadı]** soruluyor. Sadece "Hayır" denirse anlaşmalı arkadaşı öneriliyor.
- Bütün konum butonları **"WhatsApp'tan konum at"** diyor, WhatsApp simgesi var. Konum alınamazsa sahte konum gitmiyor.
- Şoför sayfasında **ödeme şekli** (nakit, kart, IBAN) ve **çalışma saati** yazıyor. Mesai dışındaysa söylüyor.
- Havalimanı ve ileri saat için **"Saat ver, ayırt"** formu: tarih, saat, nereden ve nereye; WhatsApp'a hazır mesaj gider.
- Durak sitesi: meşgul şoförün kartında arama yerine "arkadaşına yönlen" var. Büyük numara aranıyor. Dönen yolcuya **"Geçen sefer: Mehmet Abi [Ara]"** gösteriliyor. Ekran aşağı kayınca yapışkan çağır çubuğu çıkıyor, başta çift buton yok.
- Masaüstünde "ara"ya basınca numara büyük gösteriliyor (bilgisayar arayamıyor).
- Eşya unuttum: Bugün / Dün / Daha önce seçimi, doğru şoföre ya da durağa doğru mesaj.
- WhatsApp içindeki tarayıcıda "ana ekrana ekle" yerine rehbere kaydet ve Safari/Chrome adımları.
- Açık tema renkleri koyulaştırıldı (hepsi 4,5:1 üstü). Bütün yolcu metinleri "sen" diliyle. İsim ekleri ünlü uyumuna göre doğru ("Hasan Abi'ye", "Mehmet Abi'yi", "Kemal'e").
- JavaScript yüklenmeden de büyük, basılabilir arama kartı görünüyor.
- Pencereler klavye ve ekran okuyucuyla kullanılabilir. Azaltılmış hareket ayarına uyuluyor. Dokunma alanları en az 48 px.
- Sayfa internet yokken de açılıyor (son açılan hali). Hiç açılmamışsa Türkçe "İnternet yok" sayfası çıkıyor.
- Her şoförün ana ekran ikonu durak rengiyle ve kendi adıyla. WhatsApp'ta paylaşınca önizleme görseli çıkıyor.

## Taksici ve durak başkanı gözüyle

**Bulunanlar (P1):** Panelde arkadaş sırası "Kaydet"e basılmazsa kayboluyordu. Durum değiştirmek iki dokunuştu. Yolcunun şoförü nasıl gördüğü belli değildi. Panel ana ekrana eklenince satış sayfası açılıyordu. Satış sayfasında numara aranmıyordu. Fiyatın toplamı belli değildi. Başkana "kim yaptı, param çıkar mı" cevabı yoktu. Boş panelde 21 tane "0" vardı.

**Yapılanlar:**
- **Tek dokunuşla durum:** Müsaitim / Yolcudayım / Kapalıyım basınca hemen kaydediliyor, 6 saniye "Geri al" çıkıyor. Süre çipleri: 15, 25, 45 dk ve **Uzun yol**.
- En üstte durum renginde **büyük bant:** "YOLCUDASIN · 20 dk sonra kendiliğinden müsait olursun · Çağrılar Mehmet Abi'ye gidiyor".
- **Arkadaş listesi** her değişiklikte kaydediliyor. Liste sadece kendi durağından (durak isterse açılır). "Seni listesine ekleyenler" görünüyor.
- Panelin **kendi uygulaması** var: ana ekrana eklenince panel açılıyor. Her şoföre kendi panel linki (`/panel/#ahmet`): adı seçili gelir, sadece PIN sorar.
- **QR'ımı göster** ve **Sayfamı gönder** düğmeleri.
- Sayılar: üç büyük sayı (sayfadan çağrı, arkadaşlarından gelen, arkadaşına giden). Ayrıntı isteyene açılır. Boşken "henüz çağrı yok" yazıyor.
- Telefon yönlendirme kodları tek dokunuşla kuruluyor.
- Durak paneli: durumu bilinmeyen şoför uyarısı, her şoförde "X dk önce", şoför bazında çağrı sıralaması, "Geri al", çıkış onayı.
- Torpido etiketinde **Uzun yol** ve **Yanlış oldu, geri al**.
- Satış sayfası: üstte tıklanabilir telefon, **"1 araca 30 gün ücretsiz dene"**, **durak hesaplayıcı** (5/8/10/15/20 araç: ilk yıl, sonraki yıllar, araç başı aylık), "Kendini nasıl öder?", 4 adımda kurulum, kim yaptı kutusu, başkanların itirazlarına 6 yeni soru.
- Paketini yenilemeyen şoför için `"pasif": true`: pleksiyi okutan yolcu durağın numarasına yönlenir, şoförün numarası artık gösterilmez.

## Yazılımcı gözüyle

**Bulunanlar (P1):** Bütün uygulamalar aynı kimliği taşıyordu (iki şoför ana ekrana eklenemiyordu). 4 haneli PIN deneme-yanılmayla kırılabiliyordu. Bir internet kesintisi bütün canlı durumu siliyordu, yönlendirme bozuluyordu. 30 saniyelik yenileme açık pencereyi kapatıyor, yazılan PIN'i siliyordu. Çevrimdışı açılış çalışmıyordu.

**Yapılanlar:**
- Her sayfanın ayrı uygulama kimliği ve ayrı manifesti (şoför, durak, durak paneli, şoför paneli, rapor).
- **PIN kilidi:** 5 yanlışta 15 dakika, tekrarında katlanarak. Sayaç deneyen adrese göre: biri yanlış PIN deneyerek gerçek şoförü kilitleyemez. PIN'ler bcrypt ile saklı.
- **Sayaç güvenliği:** sadece var olan sayfaya kayıt, saatte telefon başı en çok 60, zamanı sunucu yazar (geriye tarih atılamaz). Yolcu kimseyi okuyamaz.
- Hepsi PostgreSQL 16'da denendi: iki kez çalıştırma, yetkisiz okuma/yazma, geriye tarih, kilit.
- Bağlantı koparsa son bilinen durum korunuyor. "İnternete ulaşılamadı" ile "PIN yanlış" ayrı mesajlar.
- Yenileme sadece bir şey değiştiyse oluyor. Pencere açıkken ya da yazı yazılırken beklemede kalıyor, kaydırma yeri korunuyor.
- Service worker: sayfa her zaman internetten taze, yoksa telefondaki son hali. Yeni sürüm sessizce geliyor.
- Günler İstanbul saatine göre sayılıyor (gece 00-03 çağrıları doğru güne düşüyor).
- Yazı tipleri sitenin içinde (Google'a istek yok), JavaScript ve CSS küçültülüyor, script'ler sayfayı bekletmiyor.
- Gizli sayfalarda `noindex`, açık sayfalarda `sitemap.xml`, durak sayfalarında Google için işletme bilgisi (yapılandırılmış veri).
- Derleme veriyi kontrol ediyor: telefon biçimi, tekrar eden kod, kendini yedek gösteren şoför, https adresler. Hatalı veri yayına çıkmıyor.

## Bilerek bırakılanlar

- **Şoför PIN'i telefonda saklanıyor.** Torpido etiketine tek dokunuşla durum değiştirmek için gerekli. Çıkış yapınca siliniyor. Rapor (yönetici) PIN'i ise sadece sekme açıkken tutuluyor.
- **İngilizce sayfa, ek hizmet simgeleri (bagaj, çocuk koltuğu):** gerçek talep görülünce eklenir.
- **Etiket sayfasına baskı özeti:** küçük iş, baskı dükkânı ile çalışma şekli belli olunca.

Ayrıntılı notlar: `docs/inceleme/` (yolcu, taksici, kod).
