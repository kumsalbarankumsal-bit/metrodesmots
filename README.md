# Métro des Mots

IB Français B kelime uygulaması. Üç ayrı deste, üç ayrı sekme:

- **1. Yazılı** (11. sınıf · 1. dönem): **129 kelime**, 12 durak, Ligne Y. Ekolojik mahalle, akıllı bina, insansı robotlar.
- **Thème 1 « Identités »**: **1793 kelime**, Métro 1–4 (daire rozetler), 163 durak.
- **Thème 2 « Expériences »**: **1584 kelime**, RER A–D (köşeli plakalar), 144 durak. A: *Les voyages forment la jeunesse* · B: *Je me souviens* · C: *Je veux être adulte* · D: *À la recherche d'une vie meilleure*.

Desteler hiçbir yerde karışmaz: tekrar, keşif, test, sınav maratonu, Stüdyo setleri ve çoktan seçmeli sorulardaki yanlış seçenekler her zaman tek bir desteden gelir.

**Fransızca–Fransızca öğrenme.** Her kelimede Fransızca tanım (déf.), eş anlamlılar (syn.) ve zıt anlamlılar (ant.) birlikte gelir; öğretmenin listesindeki eşleşme kalın yazılır ve önce gelir (≠ maddelerinde listedeki ifade zıt anlamlıdır). Türkçe anlam ve cümle çevirisi yalnızca destektir: Ayarlar → Türkçe destek (Gizli · Cevaptan sonra · Her zaman). Ayrıca örnek cümle, sesli telaffuz, isimlerde cinsiyet ve uygun olanlarda Türkçedeki akrabası var. Kaynaklardaki hatalar düzeltildi (Ayarlar → Liste düzeltmeleri).

## Çalışma sistemi

- **Aralıklı tekrar (WordUp usulü):** 1 gün → 3 gün → 1 hafta → 2 hafta → 1 ay → ustalaşıldı. Soru tipleri basamakla zorlaşır: listedeki eşi ve tanımı tanıma → tanımdan / eş anlamlıdan / zıt anlamlıdan kelimeyi bulma → eş ve zıt anlamlıyı seçme (zıt anlam sorusunda eş anlamlı bir tuzak olabilir), cümlede boşluk → tanımdan yazma.
- **Stüdyo, 17 mod.** Önce desteyi, sonra seti seç (bütün deste, bir hat, bir durak, tekrarı gelenler, zorlu, yıldızlı, öğrendiklerim), sonra:
  - *Tanış:* Kartlar (çevir, kaydır, bilmediklerin yeni turda), Öğren (tanı → seç → yaz; bitenler tekrar listesine girer)
  - *Hatırla ve yaz:* Yaz, Harf harf, Boşluk doldur, Dikte
  - *IB sınavı gibi:* Relevez (Paper 2: anlamı verilen kelimeyi cümlede bul), Eş & zıt anlam (hepsini seç), Test (liste / tanım / eş / zıt anlam; geri bildirimsiz, cevap anahtarlı), Sınav maratonu
  - *Oyunlar:* Eşleştir (eş anlamlı / liste / tanım; süreli, rekor), Hafıza, Şimşek (60 sn: ≈ eş, ≠ zıt, : tanım), Son metro (tanıma uyan kelimeyi taşıyan treni yakala)
  - *Kalıcı yap:* Bağ kur (kendi cümlen + çağrışım, kelimeye not olarak kaydedilir), Le ou la ? (cinsiyet), Telaffuz (konuşma tanıma)
- **Sınav maratonu:** kapsam (bir destenin tamamı, bir hat ya da durak aralığı) kesintisiz öğretilir; her 20/25/30 kelimede kontrol testi, yanlışlar doğru bilinene kadar geri gelir, her 3 partide karma tekrar, sonda final.
- **1. Yazılı sekmesi:** geri sayım ve günlük tempo önerisi (sınav tarihini girince), hat planı, durak durak kelimeler ve kısa yollar.
- **Thème 1 ve Thème 2 sekmeleri:** destenin özeti, “şimdi ne yapayım?” kısa yolları (öğren, tekrar, hızlı keşif, maraton, test, zorlu, serbest pratik, Stüdyo), hat seçimi ve durak haritası.

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
js/data-t2.js    Thème 2: 1584 kelime (ünite 6–9 = RER A–D) + düzeltmeler + Fransızca tanım/eş/zıt (FRX_T2)
js/data-fr.js    Thème 1 ve 1. Yazılı için Fransızca tanım/eş/zıt (FRX_T1)
js/core.js       veri modeli, desteler, aralıklı tekrar, seviye, kayıt, telaffuz, Fransızca–Fransızca soru üretimi
js/fx.js         yaşayan Paris, kapılar, parçacıklar, uçan XP, sayfa geçişleri, titreşim
js/ui.js         ana sayfa, deste sayfaları ve hat haritası, tekrar, sözlük, oturumlar, paneller, ayarlar
js/exam.js       sınav maratonu
js/yazili.js     1. Yazılı sekmesi
js/studio.js     Stüdyo ve 17 mod
```

Satır biçimi: `[id, ünite, durak, fr, tanım, zıt(0/1), tr, örnek, örnek_tr, türkçe_akraba, cinsiyet]`. Örnek cümlelerde kelime `[köşeli parantez]` içindedir (boşluk doldurma ve Relevez bunu kullanır). `tanım` öğretmenin listesindeki eşleşmedir.

Fransızca–Fransızca veri: `FRX[id] = [tanım, "eş1;eş2", "zıt1;zıt2"]`. Tanım boşsa listedeki ifade zaten bir tanımdır ve tanım olarak gösterilir; doluysa listedeki ifadenin parçaları eş anlamlı sayılır ve önce gelir. ≠ maddelerinde listedeki ifade zıt anlamlıdır.

İlerleme tarayıcının `localStorage`'ında (`metro-des-mots-v1`) tutulur; her cihaz/tarayıcı kendi ilerlemesini saklar. Eski sürümlerin kayıtları olduğu gibi okunur.

## Yüklenebilir uygulama (PWA)

Chrome'da **⋮ → Uygulamayı yükle** ile ana ekrana eklenir, tam ekran açılır, ilk açılıştan sonra çevrimdışı çalışır. İçerik güncellenince `sw.js` içindeki `VERSION` değerini ve `index.html`'deki `?v=` sorgularını birlikte artır.

## Vercel

Framework preset: **Other**, build komutu yok, output directory: kök (`.`).
