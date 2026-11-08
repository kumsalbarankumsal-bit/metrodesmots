# Métro des Mots

IB Français B kelime uygulaması. İki deste:

- **1. Yazılı** (11. sınıf · 1. dönem): **129 kelime**, 12 durak, Ligne Y. Ekolojik mahalle, akıllı bina, insansı robotlar.
- **Thème 1 « Identités »** (kitap): **1793 kelime**, 4 hat, 163 durak.

Her kelimede Türkçe anlam, Fransızca tanım/eş anlamlılar, örnek cümle ve çevirisi, sesli telaffuz; isimlerde cinsiyet; uygun olanlarda Türkçedeki akrabası (lojman ← logement, kontör ← compteur…). Kaynaklardaki 47 hata düzeltildi (Ayarlar → Liste düzeltmeleri).

## Çalışma sistemi

- **Aralıklı tekrar (WordUp usulü):** 1 gün → 3 gün → 1 hafta → 2 hafta → 1 ay → ustalaşıldı. Soru tipleri basamakla zorlaşır.
- **Stüdyo, 17 mod.** Bir set seç (1. Yazılı, bir hat, bir durak, tekrarı gelenler, zorlu, yıldızlı, öğrendiklerim), sonra:
  - *Tanış:* Kartlar (çevir, kaydır, bilmediklerin yeni turda), Öğren (tanı → seç → yaz; bitenler tekrar listesine girer)
  - *Hatırla ve yaz:* Yaz, Harf harf, Boşluk doldur, Dikte
  - *IB sınavı gibi:* Relevez (Paper 2: anlamı verilen kelimeyi cümlede bul), Eş anlamlılar (hepsini seç), Test (geri bildirimsiz, cevap anahtarlı), Sınav maratonu
  - *Oyunlar:* Eşleştir (süreli, rekor), Hafıza, Şimşek (60 sn doğru/yanlış), Son metro (doğru kelimeyi taşıyan treni yakala)
  - *Kalıcı yap:* Bağ kur (kendi cümlen + çağrışım, kelimeye not olarak kaydedilir), Le ou la ? (cinsiyet), Telaffuz (konuşma tanıma)
- **Sınav maratonu:** kapsam kesintisiz öğretilir; her 20/25/30 kelimede kontrol testi, yanlışlar doğru bilinene kadar geri gelir, her 3 partide karma tekrar, sonda final.
- **1. Yazılı sekmesi:** geri sayım ve günlük tempo önerisi (sınav tarihini girince), hat planı, durak durak kelimeler ve kısa yollar.

Stüdyo modları tekrar takvimini bozmaz; yalnızca Öğren (ve Kartlar sonunda isteğe bağlı olarak) yeni kelimeleri aralıklı tekrar listesine ekler.

## Görsel katman

Ana sayfadaki Paris saatin kendisini gösterir: gökyüzü gün doğumu/batımına göre (şafak, gündüz, gün batımı, alacakaranlık, gece, gece yarısından sonra), gerçek ay evresi, yıldızlar, geçen metro, gece ışıklanan kule (saat başı 5 dk ışıldar; dokununca da). Günde bir kez metro kapıları açılarak karşılar (Ayarlar → Açılış animasyonu). Sayfa geçişleri, kayan sekme göstergesi, uçan XP, kıvılcım ve konfeti, kart çevirme, durak çizgisi animasyonu, titreşim (Android). `prefers-reduced-motion` açıksa hareketler kapanır.

## Yapı

Derleme adımı yok; düz statik site.

```
index.html       sayfa iskeleti, ikonlar
styles.css       tasarım sistemi
manifest.webmanifest, sw.js, icons/   PWA (yükleme + çevrimdışı)
vercel.json      sw.js için önbellek başlıkları
js/data.js       Thème 1: 1793 kelime + düzeltmeler
js/data-y1.js    1. Yazılı: 129 kelime + durak adları + düzeltmeler
js/core.js       veri modeli, desteler, aralıklı tekrar, seviye, kayıt, telaffuz, soru üretimi
js/fx.js         yaşayan Paris, kapılar, parçacıklar, uçan XP, sayfa geçişleri, titreşim
js/ui.js         ana sayfa, harita, tekrar, sözlük, oturumlar, paneller, ayarlar
js/exam.js       sınav maratonu
js/yazili.js     1. Yazılı sekmesi
js/studio.js     Stüdyo ve 17 mod
```

Satır biçimi: `[id, ünite, durak, fr, tanım, zıt(0/1), tr, örnek, örnek_tr, türkçe_akraba, cinsiyet]`. Örnek cümlelerde kelime `[köşeli parantez]` içindedir (boşluk doldurma ve Relevez bunu kullanır).

İlerleme tarayıcının `localStorage`'ında (`metro-des-mots-v1`) tutulur; her cihaz/tarayıcı kendi ilerlemesini saklar. Eski sürümlerin kayıtları olduğu gibi okunur.

## Yüklenebilir uygulama (PWA)

Chrome'da **⋮ → Uygulamayı yükle** ile ana ekrana eklenir, tam ekran açılır, ilk açılıştan sonra çevrimdışı çalışır. İçerik güncellenince `sw.js` içindeki `VERSION` değerini ve `index.html`'deki `?v=` sorgularını birlikte artır.

## Vercel

Framework preset: **Other**, build komutu yok, output directory: kök (`.`).
