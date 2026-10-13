# Métro des Mots

IB Français B · Thème 1 « Identités » kelime kitabındaki **1793 kelime** için WordUp mantığında çalışan kelime uygulaması.

- **4 ünite = 4 metro hattı, 163 durak** (kitaptaki 11'lik gruplar). Her durakta keşif, kitaptaki gibi eşleştirme, durak testi ve tekrar.
- **Aralıklı tekrar:** 1 gün → 3 gün → 1 hafta → 2 hafta → 1 ay → ustalaşıldı. Soru tipleri basamakla zorlaşır (anlam, ters yön, Fransızca tanım, boşluk doldurma, yazma).
- Her kelimede Türkçe anlam, kitaptaki Fransızca tanım, örnek cümle ve çevirisi, sesli telaffuz.
- Kitaptaki 41 dizgi / cevap anahtarı hatası düzeltildi (uygulamada Ayarlar → Kitap düzeltmeleri).
- XP ile 20. arrondissement'tan Louvre'a ilerleme, seri, günlük hedef, gece modu, yazı boyutu ayarı.

## Yapı

Derleme adımı yok; düz statik site.

```
index.html     sayfa iskeleti
styles.css     tasarım sistemi
manifest.webmanifest, sw.js, icons/   PWA (yükleme + çevrimdışı)
vercel.json    sw.js için önbellek başlıkları
js/data.js     1793 kelime (id, ünite, grup, fr, tanım, zıt, tr, örnek, örnek_tr) + düzeltmeler
js/core.js     veri modeli, aralıklı tekrar, seviye, kayıt, telaffuz, soru üretimi
js/ui.js       ekranlar ve etkileşim
```

İlerleme tarayıcının `localStorage`'ında (`metro-des-mots-v1`) tutulur; her cihaz/tarayıcı kendi ilerlemesini saklar.

## Yüklenebilir uygulama (PWA)

`manifest.webmanifest`, `icons/` ve `sw.js` sayesinde Chrome'da **⋮ → Uygulamayı yükle** ile ana ekrana ikon olarak eklenir, tam ekran açılır ve ilk açılıştan sonra çevrimdışı da çalışır. Uygulama içinde de bir **Yükle** düğmesi vardır. İçerik güncellenince `sw.js` içindeki `VERSION` değerini artır.

## Vercel

Framework preset: **Other**, build komutu yok, output directory: kök (`.`).

