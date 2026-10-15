# Taksicim · Taksi Platformu

Elazığ'daki taksicilere ve duraklara satılan web platformu. Tek site, tek alan adı. Her durağın kendi sitesi, her şoförün kendi sayfası ve telefonda kendi "uygulaması" var. Araçtaki 3 adet 10x10 cm NFC + QR pleksi, şoförün sayfasına gider.

> "Taksicim" geçici marka adıdır. `data/site.json` içinde `marka.ad` alanından değişir.

## Sayfalar

| Link | Ne |
|---|---|
| `/` | Platformun tanıtım ve satış sayfası (taksiciye gösterilen) |
| `/d/<durak-kodu>/` | Durağın web sitesi: kaç araç müsait, şoförler, hizmetler, iletişim |
| `/d/<durak-kodu>/yonetim/` | Durak paneli: bütün araçların durumu, bu ayki çağrılar, durak başkanı şoförün durumunu da değiştirebilir |
| `/t/<şoför-kodu>/` | Şoförün sayfası. Pleksideki NFC ve QR buraya gider. Ana ekrana eklenince şoförün adıyla uygulama olur |
| `/panel/` | Şoför paneli: tek dokunuşla Müsaitim / Yolcudayım / Kapalıyım, anlaşmalı şoför sırası, aylık sayılar. Her şoföre kendi linki: `/panel/#ahmet` |
| `/etiket/` | 10x10 cm pleksi baskısı (her araca 3 tane: arka sol, arka sağ, ön) |
| `/rapor/` | Sadece bizim için: bütün müşterilerin sayıları, satışta söylenecek cümle, müşteriye WhatsApp'tan rapor |

Demo: `/t/ahmet/` (Ahmet yolcuda, çağrı Mehmet'e yönleniyor), `/d/ornek-durak/` (sarı), `/d/kale-taksi/` (turuncu), `/t/kemal/` (tek şoför), `/panel/` ve `/d/ornek-durak/yonetim/` (demo PIN `1234`).

**Hazır şablonlar ve tasarım kuralları:** `sablonlar/` klasörü ve [TASARIM.md](TASARIM.md). Yeni durak ya da şoför eklerken buradan başla.

## Meşgul şoförün yolcusu nasıl arkadaşına gider

Yolcu kendi şoförünü çağırmak istiyor, şoför yolcuda. Üç katman var, birbirini tamamlar:

**1. Gösterge paneline dokunma (asıl sistem).** Torpidoya iki küçük NFC etiketi yapışır: *YOLCU ALDIM* (`/panel/#dolu`) ve *BOŞALDIM* (`/panel/#bos`). Yolcu binince şoför telefonunu etikete dokundurur; uygulama açmaz, PIN yazmaz (telefonda giriş açık kalır). "Yolcuda" durumu 25 dakika sonra kendiliğinden "Müsait"e döner, yani çoğu yolculukta tek dokunuş yeter. İsteyen panelden elle de seçebilir: *Müsait*, *Yolcuda (10-60 dk)*, *Hizmet dışı*. Her şoförün 2-3 kişilik sıralı bir "anlaşmalı şoför" listesi var. Yolcu sayfayı açtığında:
- Şoför müsaitse büyük buton onu arar.
- Şoför yolcudaysa sayfa bunu söyler ve büyük buton listedeki **ilk müsait** arkadaşı arar. Yolcu isterse "Ahmet Abi'yi bekle" ile yine kendi şoförünü arayabilir.
- Listedekilerin hepsi meşgulse durağın numarası çıkar.
- WhatsApp'tan konum gönder butonu da aynı kurala uyar, mesaj doğru şoföre gider.

**2. "Ulaşamadın mı?" (şoför düğmeye basmayı unutursa).** Yolcu şoförü arar, şoför açmaz. Yolcu sayfaya geri döndüğünde sayfa sorar: "Ahmet Abi açmadıysa dert etme, Mehmet Abi müsait." Böylece durum güncel olmasa da yolcu kaçmaz. 8 saatten eski durumlar "bilinmiyor" sayılır.

**Taksimetre bağlantısı neden şimdi yok:** Taksimetre mühürlü, ayarlı bir cihaz; markası araçtan araca değişiyor ve dışarıya veri vermiyor. Kabloya müdahale mühürü ve garantiyi bozabilir. İleride en temiz yol, taksimetre yerine tavandaki TAKSİ lambasının (boşken yanar) elektriğini okuyan küçük bir GSM'li cihaz olur; önce bir oto elektrikçisi ve belediye ile konuşulmalı.

**3. Telefon hattı yönlendirme (rehberden direkt arayanlar için).** Yolcu numarayı rehberden arıyorsa sayfa devreye giremez. Şoför telefonuna bir kere operatör kodu girer, meşgulken ya da açmazsa arama arkadaşına geçer:

| Kod | Ne yapar |
|---|---|
| `**67*05XXXXXXXXX#` | Meşgulken yönlendir |
| `**61*05XXXXXXXXX**10#` | 10 saniyede açmazsa yönlendir (süre 5-30 sn arası seçilebilir) |
| `**62*05XXXXXXXXX#` | Telefon kapalıysa yönlendir |
| `##002#` | Bütün yönlendirmeleri kapat |

Bu kodlar standart GSM kodlarıdır, operatörlerde genelde çalışır ama her şoförde kurulumda bir kere denenmeli. Panelde şoförün kendi arkadaşının numarasıyla hazır yazılı gelir.

İleride istenirse: durağa sanal santral numarası (sırayla çaldırma) alınabilir. Bu ücretli bir operatör hizmetidir, şimdilik gerek yok.

## iPhone'da "uygulamayı yükle" sorunu

Android'de Chrome kendi "Yükle" penceresini açar, sayfadaki **Ana ekrana** butonu bunu tek dokunuşla tetikler. iPhone'da Apple hiçbir sitenin kendiliğinden yüklenmesine izin vermez, yolcunun Paylaş → Ana Ekrana Ekle demesi şart. Bu yüzden iPhone için:

- **Adım adım rehber:** Butona basınca Paylaş simgesinin resmiyle 3 adım çıkar, ekranın altında zıplayan bir ok "Paylaş burada" diye gösterir.
- **Instagram/WhatsApp içinde açıldıysa:** O tarayıcılarda ana ekrana ekleme hiç yok. Sayfa bunu anlar ve "Safari'de aç" der, linki kopyalama butonu verir.
- **İlk ziyarette hatırlatma:** Sayfa ilk açılışta 6 saniye sonra bir kere "Ahmet Abi telefonunda dursun mu?" şeridi gösterir.
- **Tek dokunuşla yedek: Rehbere kaydet.** iPhone kişi kartını direkt açar, yolcu sadece "Kaydet"e basar. İçinde şoförün ve durağın numarası, bir de sayfanın linki olur. iPhone'da en garantili "kalıcı buton" budur.
- Ana ekrana eklenen simgenin adı şoförün adıdır ("Ahmet Taksi"), çünkü her şoförün kendi uygulama dosyası (manifest) var.

## Sayılar ve rapor

Her ziyaret ve buton kaydedilir, üç yerde gösterilir:

| Kim | Nerede | Ne görür |
|---|---|---|
| Şoför | `/panel/` | Sadece kendi sayıları |
| Durak başkanı | `/d/<kod>/yonetim/` | Durağın bütün araçlarının toplamı ve araç başı çağrı |
| Biz | `/rapor/` (yönetici PIN'i) | Bütün müşteriler, karşılaştırma, satış cümlesi, her müşteriye "Raporu WhatsApp'tan gönder" |

Sayılanlar: pleksi okutma (NFC ve QR ayrı), pleksiden uygulamayı kuran, pleksiden çağıran, pleksiden Google yorumuna giden, uygulamayı kuran, uygulamadan açılış ve çağrı, tekrar gelen yolcu, telefonla arama, WhatsApp konum, meşgulken arkadaşa giden (kaçmayan yolcu), başka sayfalardan gelen, sayfa açılışı, farklı telefon, rehbere kaydeden, ailesine yolculuk gönderen, kayıp eşya bildirimi.

**Nereden geldi nasıl anlaşılıyor:** QR kodun içinde `?k=q`, NFC çipine yazılan linkte `?k=n` var (`/t/ahmet/?k=n`). Ana ekrandaki uygulamadan açılırsa "uygulama" sayılır. Pleksi basmadan önce NFC çipine `?k=n`'li link yazılmalı, yoksa NFC okutmaları "link" görünür.

**Dürüst sınırlar:** Google'a giden = butona basan; yorumu yazıp yazmadığını Google söylemez. WhatsApp = mesaj ekranı açılan; gönder'e basıp basmadığı görülmez. iPhone'da ana ekrana eklenen uygulama ayrı bir tarayıcı gibi çalışır, bu yüzden iPhone kurulumu ilk açılışta sayılır ve "pleksiden mi kurdu" bilgisi iPhone'da eksik kalabilir.

**Kişisel veri:** İsim, numara, konum yok. Her telefona rastgele bir sayı verilir ("farklı telefon" ve "tekrar gelen" bununla hesaplanır). Sayılar dışarıya kapalıdır, sadece PIN'le okunur.

**Demo:** Supabase yokken `/rapor/` PIN `1234`. "Örnek veriyle doldur" 45 günlük örnek veri yükler, ekranda "örnek veri" uyarısı çıkar. Gerçek sitede bu düğme yoktur.

## Yeni durak ya da şoför ekleme

Her şey `data/site.json` dosyasında:

```json
{ "kod": "veli", "durak": "ornek-durak", "ad": "Veli Yılmaz", "hitap": "Veli Abi",
  "telefon": "+905321112233", "plaka": "23 T 1234", "arac": "Fiat Egea · Beyaz",
  "yedekler": ["ahmet", "mehmet"] }
```

- `kod` linki belirler: `/t/veli/`. Sadece küçük harf, rakam ve tire. **Pleksi basıldıktan sonra kod değişmez.**
- `yedekler` sırası önemlidir: ilk müsait olan seçilir.
- Gerçek durakta `"demo": true` satırını sil, yoksa butonlar arama yapmaz.
- Dosyayı GitHub'da düzenleyip kaydetmek yeterli, site birkaç dakikada kendini yeniler.
- Derleme veriyi kontrol eder (telefon `+90…` biçiminde mi, kod tekrar ediyor mu, yedek var mı). Hata varsa site yayına çıkmaz, hata satırı Actions'ta yazar.

İsteğe bağlı alanlar:

| Alan | Nerede | Ne yapar |
|---|---|---|
| `odeme` | şoför ya da durak | `["nakit","kart","iban","fatura"]`. Yolcuya ödeme şekli gösterilir. Şoförde yoksa durağınki geçerli |
| `calisma` | şoför | `"07.00-02.00"`. Saat dışında sayfada "Şu an çalışmıyor" yazar |
| `whatsapp` | şoför ya da durak | Telefondan farklıysa WhatsApp numarası |
| `foto` | şoför | Fotoğraf adresi. Baş harf yerine yüz görünür |
| `aracFoto` | şoför | Aracın fotoğrafı (`"foto/ahmet-arac.jpg"`). Şoför sayfasının kapağında ve durak sitesindeki kartında görünür. Yoksa sarı taksi çizimi çıkar |
| `kapakFoto` | durak | Durak sitesinin en üstündeki büyük fotoğraf. Yoksa ilk şoförün araç fotoğrafı, o da yoksa çizim |
| `ozellikler` | durak | "Araçlarımız" listesi, ör. `["Klimalı", "Her yolculuktan önce temizlenir"]`. Yoksa genel bir liste çıkar |
| `google` | durak ya da şoför | `{"puan": 4.9, "sayi": 128, "yorumlar": [{"ad": "...", "metin": "..."}]}`. Google puanı ve seçilmiş yorumlar. Yorumları Google'daki gerçek yorumlardan elle kopyala |
| `disariYonlendirme` | durak | `true` ise şoförler başka duraklardan da anlaşmalı arkadaş seçebilir |
| `pasif` | şoför | `true`: paketi yenilenmedi. Sayfası durağın numarasını gösterir, şoförün numarası kalkar |

Fotoğrafları `data/foto/` klasörüne koy (jpg, png ya da webp), alanda `foto/dosya-adi.jpg` diye yaz. Telefonda hızlı açılsın diye her fotoğraf 1200 px genişliği ve 300 KB'ı geçmesin. Yolcu gelen aracı fotoğraftan tanır, bu yüzden aracın önden ve plakası görünen bir fotoğrafı en iyisi.

Tanıtım sayfasındaki fiyat hesaplayıcı `paketler[].aracBasi`, `yenilemeAracBasi` ve `enAz` alanlarını kullanır. `marka.odemeNotu` fiyatın altında yazar.

## Canlı müsaitlik için Supabase

Supabase ayarı boşken site **demo modunda** çalışır: durum sadece o telefonda saklanır (sunum için yeterli). Gerçek kullanımda her şoförün durumu herkese görünmeli:

1. supabase.com'da ücretsiz proje aç.
2. SQL Editor'e `supabase/kurulum.sql` dosyasını yapıştır, çalıştır.
3. Her şoför için dosyanın sonundaki örnekle kod ve **6 haneli** PIN ekle.
4. Rapor için dosyanın sonundaki örnekle uzun bir **yönetici PIN'i** ekle.
5. `data/site.json` → `ayarlar.supabaseUrl` ve `ayarlar.supabaseAnonKey` doldur.

Güvenlik: PIN'ler şifreli saklanır. 5 yanlış denemede o adresten 15 dakika kilit, tekrarında katlanır. Kilitlenen PIN'i hemen açmak için dosyanın sonundaki satır var. Sayaca aynı telefondan saatte en çok 60 kayıt girer, zamanı sunucu yazar.

İnternet ya da Supabase çökerse sayfa yine açılır, şoför yine aranır; sadece müsaitlik "bilinmiyor" görünür ve o sürede sayaç tutulmaz.

### Ücretsiz planda kalmak (ödeme yok)

Ücretsiz Supabase projesi 1 hafta hiç kullanılmazsa uyur ve otomatik yedek almaz. İkisini de `.github/workflows/koruma.yml` ücretsiz çözer:

- **Uyumasın:** Her sabah Supabase'e küçük bir okuma yapar. Ayar gerekmez, `site.json`'daki adresi kullanır. Supabase cevap vermezse iş kırmızı olur ve GitHub sana e-posta atar.
- **Yedek:** Her gece veritabanını şifreleyip GitHub'da 30 gün saklar (Actions → Supabase koruma → çalıştırma → Artifacts). Açmak için GitHub'da **Settings → Secrets and variables → Actions** altına iki gizli değer ekle:
  - `SUPABASE_DB_URL`: Supabase panelinde **Connect → Session pooler** bağlantı adresi (şifresiyle birlikte). "Direct connection" GitHub'dan çalışmaz.
  - `YEDEK_SIFRE`: Uzun bir şifre. Kaybetme; yedek onsuz açılmaz. Depo herkese açık olduğu için yedek şifresiz konmaz.
- **GitHub durdurmasın:** GitHub 60 gün hiç kayıt olmayan depoda zamanlanmış işleri durdurur. İş, 50 gündür kayıt yoksa küçük bir tarih dosyası günceller.

Yedekten geri yükleme:

```bash
gpg -d yedek-2026-10-13.sql.gz.gpg | gunzip > yedek.sql   # YEDEK_SIFRE sorulur
psql "SUPABASE_DB_URL" -f yedek.sql
```

### Google Analytics (isteğe bağlı)

`ayarlar.googleAnalytics` alanına ölçüm kimliğini (`G-...`) yazarsan yolcu sayfaları ve tanıtım sayfası GA'ya da sayılır. Çerezsiz çalışır, yolcuya izin penceresi çıkmaz. Paneller, rapor ve örnek (demo) sayfalar GA'ya gitmez. Olay adları: `sayfa_acildi`, `arama`, `whatsapp_konum`, `arkadasa_yonlendi`, `rehbere_kaydet`, `google_yorum`, `uygulamadan_acildi`, `paylas`, `esya_unuttum`. Her olayda `sofor` (şoför kodu, durak için `d:kod`) ve `kaynak` (nfc, qr, uygulama, durak, link) var; GA'da raporlarda görmek için bunları **Yönetici → Özel tanımlar**'dan özel boyut olarak ekle.

## Yayınlama

`main` dalına her kayıt, GitHub Actions ile siteyi üretip `gh-pages` dalına koyar (`.github/workflows/yayinla.yml`). GitHub Pages bu dalı yayınlar: **Settings → Pages → Branch: gh-pages / (root)**.

**Alan adı:** Pleksi basmadan önce alan adını al ve `marka.siteUrl` ile `marka.alanAdi`'nı güncelle. QR kodlar bu adresle üretilir; sonradan değişirse basılı pleksiler eski adrese gider.

## Bilgisayarda çalıştırma

```bash
npm install
npm run build      # dist/ klasörüne siteyi üretir
npm run serve      # http://localhost:5173
npm run onizleme   # onizleme/onizleme.html: tek dosyalık demo
```

Ana ekran ikonları ve paylaşım görselleri `src/gorsel/` içinde hazır. Renk ya da yazı değişirse `node scripts/ikon-uret.mjs` ile yeniden üretilir (Playwright gerekir). Yazı tipleri `src/fonts/` içinde, dışarıdan yüklenmez.

İnceleme notları ve yapılanlar: [docs/INCELEME.md](docs/INCELEME.md).

## Kişisel veri

Yolcunun konumu sadece kendi WhatsApp'ından şoföre mesaj olarak gider, sunucuya yazılmaz. Sayaç tablosunda isim, numara ya da konum yoktur; sadece "şu sayfada şu butona basıldı, şuradan geldi" kaydı ve telefona özel rastgele bir sayı tutulur. Sayılar sadece PIN'le okunur.
