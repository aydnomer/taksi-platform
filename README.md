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
| `/panel/` | Şoför paneli: Müsaitim / Yolcudayım / Hizmet dışı, anlaşmalı şoför sırası, aylık sayılar |
| `/etiket/` | 10x10 cm pleksi baskısı (her araca 3 tane: arka sol, arka sağ, ön) |

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
| `**61*05XXXXXXXXX#` | Açmazsa yönlendir |
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

## Canlı müsaitlik için Supabase

Supabase ayarı boşken site **demo modunda** çalışır: durum sadece o telefonda saklanır (sunum için yeterli). Gerçek kullanımda her şoförün durumu herkese görünmeli:

1. supabase.com'da ücretsiz proje aç.
2. SQL Editor'e `supabase/kurulum.sql` dosyasını yapıştır, çalıştır.
3. Her şoför için dosyanın sonundaki örnekle kod ve **6 haneli** PIN ekle.
4. `data/site.json` → `ayarlar.supabaseUrl` ve `ayarlar.supabaseAnonKey` doldur.

İnternet ya da Supabase çökerse sayfa yine açılır, şoför yine aranır; sadece müsaitlik "bilinmiyor" görünür. Ücretsiz Supabase projesi 1 hafta hiç kullanılmazsa uyur; gerçek müşteride bunu ücretli plana geçmek ya da haftalık bir ping ile önlemek gerekir.

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

## Kişisel veri

Yolcunun konumu sadece kendi WhatsApp'ından şoföre mesaj olarak gider, sunucuya yazılmaz. Sayaç tablosunda isim, numara ya da konum yoktur; sadece "şu sayfada şu butona basıldı" kaydı tutulur.
