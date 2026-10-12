# Taksicim tasarım ve şablon kuralları

Bu dosya, yeni bir durak ya da şoför sitesi hazırlanırken uyulacak kuralları tutar. Yeni iş başlarken önce bunu oku.

## Ürünün iki şablonu

| Şablon | Kime | Neler var | Dosya |
|---|---|---|---|
| **Durak** | Bir durağın bütün araçları | Durak sitesi (`/d/kod/`), durak paneli (`/d/kod/yonetim/`), her şoföre ayrı sayfa (`/t/kod/`) | `sablonlar/durak.json` + her şoför için `sablonlar/sofor.json` |
| **Tek şoför** | Durakla çalışmayan taksici | Kendi sayfası/sitesi (`/t/kod/`): hizmetler, bölgeler, tanıtım, anlaşmalı arkadaş | `sablonlar/bagimsiz-sofor.json` |

Yeni müşteri = şablonu `data/site.json` içine kopyala, alanları doldur, `"demo": true` yazma. Kayıt GitHub'a gidince site kendini yayınlar.

## Kim, ne için bakıyor

- **Yolcu:** Tek iş, taksi çağırmak. İlk ekranda büyük tek buton. Okumaya zorlama.
- **Şoför:** Hiçbir şey yapmak istemez. Ondan beklenen tek hareket: yolcu binince telefonunu torpidodaki etikete dokundurmak.
- **Durak başkanı:** Satın alan kişi. Görmek istediği: durağın adı ve rengi, bütün araçlar tek ekranda, "yolcu durakta kaldı" sayısı.

## Görsel kimlik

- **Renk:** Gece önce (koyu zemin `#0d0e10`), vurgu taksi sarısı `#ffc20e`. Açık tema da var, otomatik.
- **Durak rengi:** `renk` alanı: `sari`, `turuncu`, `yesil`, `mavi`. Hepsinin üstünde siyah yazı okunur. Başka renk eklenecekse üstünde siyah yazının okunduğunu kontrol et.
- **Durum renkleri her yerde aynı:** yeşil = müsait, turuncu = yolcuda, gri = kapalı. Vurgu rengiyle karıştırma.
- **Yazı:** Başlıklar *Barlow Condensed* (kalın, büyük harf, tabela hissi). Metin *Figtree*.
- **İmza parçalar:** dama şeridi (siyah-sarı kareler), TR plakası, "TAKSİ" tepe lambası. Başka süs ekleme.
- **Simgeler:** ince çizgili, tek renk. Emoji kullanma.

## Yazı dili

- Sen diye hitap et, kısa cümle kur. "Taksi çağır", "Konumumu gönder", "Ulaşamadın mı?"
- Şoförden "Ahmet Abi" diye bahset (`hitap` alanı).
- Uydurma rakam, uydurma yorum, uydurma referans yok. Google puanı sadece gerçek değer varsa (`google.puan`).
- Google yorum butonu herkese gösterilir. Memnuniyete göre filtreleme yok (Google kuralı).
- Yolcunun konumu saklanmaz, bunu sayfada söyle.

## Yerleşim kuralları

- Telefon önce: 390 px genişlikte yan kaydırma olmamalı. Her değişiklikten sonra telefon boyutunda bak.
- Durak sitesi sırası: Açılış (çağır + canlı müsait sayısı) → Araçlarımız → Hizmetler/bölgeler → Güvenli yolculuk → Sorular → İletişim. Altta sabit "Taksi çağır / Konum" çubuğu.
- Şoför sayfası sırası: Kimlik kartı + çağır → (meşgulse yönlendirme kutusu) → Anlaşmalı şoförler → Rehber/Google/Durak → Güvenli yolculuk → (tek şoförse) Hizmetler.
- Butonlar en az 48 px yüksek, ana buton 60-74 px.

## Satışta gösterilecek sıra (durak başkanına)

1. Kendi durağının adıyla site (renk seçtir): `/d/ornek-durak/` ve `/d/kale-taksi/`
2. Bir şoförün sayfası, meşgulken arkadaşına yönlendirme: `/t/ahmet/`
3. Durak paneli, bütün araçlar tek ekranda: `/d/ornek-durak/yonetim/` (demo PIN 1234)
4. Torpido etiketi: panelde "Yolcu aldım"a bas, ekranda büyük "YOLCUDASIN"
5. Fiyat ve "1 araca 30 gün ücretsiz" teklifi: ana sayfa
