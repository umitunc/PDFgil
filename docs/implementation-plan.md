# PDFgil - Implementation Plan

**PDFgil**, Electron.js tabanlı; PDF dosyalarını birleştirme (merge), ayırma (split), döndürme (rotate) ve e-posta uyumlu sıkıştırma (compress) işlemlerini yerel (local) olarak gerçekleştiren, kullanıcı dostu ve yüksek performanslı bir masaüstü PDF editörüdür.

---

## 1. Mimari Tasarım (Architecture)

Electron.js güvenliği ve arayüz akıcılığı için ağır PDF manipülasyon işlemlerinin tamamı **Main Process** (Ana Süreç) tarafında yürütülecektir. **Renderer Process** (Arayüz) ise yalnızca kullanıcı etkileşimlerini alacak ve `preload.js` köprüsü üzerinden güvenli IPC kanallarıyla talep gönderecektir.

```
[Renderer Process (HTML/JS/CSS)]
              │
              ▼ (IPC Invoke / Send)
    [Preload Bridge (contextBridge)]
              │
              ▼ (IPC Handle / Receive)
   [Main Process (Node.js & PDF Engines)]
    ├── pdf-lib (Merge, Split, Rotate)
    └── gs-cli (Compression & Optimization)

```

---

## 2. Teknoloji Yığını & Bağımlılıklar

* **Çerçeve:** Electron.js (v30+)
* **Arayüz Tasarımı:** HTML5, CitruSS UI Kit (Vibrant Frosted Glassmorphism) ve Vanilla JS
  * *CitruSS Stylesheet:* `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/umitunc/CitruSS/dist/citruss.css" />`
  * *CitruSS Companion Script:* `<script src="https://cdn.jsdelivr.net/gh/umitunc/CitruSS/dist/citruss.min.js"></script>`
* **Çekirdek PDF Motoru:** `pdf-lib` (Hafif, saf JavaScript, Node.js uyumlu)
* **PDF Sıkıştırma Motoru:** `ghostscript4js` veya paket içine gömülü (bundled) **Ghostscript CLI Binary**
* **PDF Önizleme / Render:** `pdfjs-dist` (Sayfaları arayüzde `<canvas>` olarak göstermek için)


---

## 3. Dosya Yapısı (Project Structure)

```text
pdfgil/
├── assets/                  # İkonlar ve statik görseller
├── src/
│   ├── main/
│   │   ├── main.js          # Electron ana süreç giriş noktası
│   │   └── pdfServices.js   # pdf-lib ve sıkıştırma lojikleri
│   ├── preload/
│   │   └── preload.js       # Güvenli IPC köprüsü (contextBridge)
│   └── renderer/
│       ├── index.html       # Ana UI penceresi
│       ├── css/
│       │   └── style.css    # Stil dosyaları
│       └── js/
│           ├── app.js       # Arayüz event listener'ları ve UI yönetimi
│           └── preview.js   # pdfjs-dist ile sayfa önizleme çizimleri
├── package.json
└── IMPLEMENTATION_PLAN.md

```

---

## 4. Adım Adım Geliştirme Yol Haritası

### Faz 1: Proje Kurulumu & Güvenlik Altyapısı (1-2 Gün)

* [ ] `npm init` ile projeyi başlatın, `electron` ve `pdf-lib` paketlerini kurun.
* [ ] `main.js` içerisinde ana pencereyi (`BrowserWindow`) oluşturun.
* [ ] Güvenlik kurallarını aktif edin (`contextIsolation: true`, `nodeIntegration: false`).
* [ ] `preload.js` dosyasında `contextBridge.exposeInMainWorld('pdfgilAPI', ...)` tanımlamasını yaparak arayüze güvenli metotları açın.

### Faz 2: Arayüz (UI) ve Önizleme Motoru (2-3 Gün)

* [ ] **Giriş / Sürükle-Bırak Alanı:** Kullanıcının PDF dosyalarını sürükleyip bırakabileceği pürüzsüz bir alan yapın.
* [ ] **Modül Seçimi:** Üst veya yan menüde *Merge*, *Split*, *Compress*, *Rotate* sekmeleri oluşturun.
* [ ] **Sayfa Önizleme (Thumbnail):** `pdfjs-dist` entegrasyonu ile yüklenen PDF'lerin sayfalarını arayüzde küçük kartlar halinde render edin (Özellikle Split ve Rotate modülleri için kritik).

### Faz 3: Çekirdek Özelliklerin Geliştirilmesi (4-6 Gün)

#### 🛠️ Modül 1: Merge (Birleştirme)

* [ ] Kullanıcı birden fazla dosya ekler, arayüzde sürükleyerek sırasını değiştirebilir.
* [ ] Dosya yolları (Array of Paths) IPC ile Main Process'e iletilir.
* [ ] `pdf-lib` ile yeni bir `PDFDocument` oluşturulur, tüm dosyalardaki sayfalar sırayla `copyPages` ve `addPage` ile bu dökümana eklenip kaydedilir.

#### ✂️ Modül 2: Split (Ayırma)

* [ ] Yüklenen tek bir PDF'in sayfaları listelenir.
* [ ] Kullanıcıya iki seçenek sunulur: "Her sayfayı ayrı kaydet" veya "Belirli sayfa aralığını ayır (örn: 2-5)".
* [ ] Main Process belirtilen indexlerdeki sayfaları yeni dökümana kopyalar ve hedef klasöre yazar.

#### 🔄 Modül 3: Rotate (Döndürme & Tek Dosya Çıktısı)

* [ ] Kullanıcı önizleme kartlarındaki sayfalara tıklayarak saat yönünde (+90°) döndürme işlemi yapar.
* [ ] Arayüzde CSS `transform: rotate(Xdeg)` ile anlık görsel geri bildirim verilir.
* [ ] Arka planda her sayfanın dönüş açısı bir state'te tutulur (Örn: `[{pageIndex: 0, rotation: 90}, {pageIndex: 1, rotation: 0}]`).
* [ ] "Kaydet" denildiğinde `pdf-lib` dökümanı yükler, ilgili sayfalara `page.setRotation(currentAngle + newAngle)` uygular ve tek bir dosya olarak export eder.

#### 📉 Modül 4: Compress (Sıkıştırma & E-Posta Optimizasyonu)

* [ ] **Standart Sıkıştırma:** Resim kalitesini orta düzeye (150 DPI) çeken Ghostscript profili ayarlanır.
* [ ] **E-Posta Sıkıştırması:** E-posta ek sınırlarına takılmaması için agresif sıkıştırma profili (96 DPI, gri tonlama opsiyonu) ayarlanır.
* [ ] Arka planda Node.js `child_process.spawn` ile Ghostscript CLI tetiklenir:
* Standart için: `-dPDFSETTINGS=/ebook`
* E-posta için: `-dPDFSETTINGS=/screen`



---

## 5. Kritik Teknik Zorluklar & Çözüm Stratejileri

1. **Büyük Dosyalarda UI Kilitlenmesi (Freezing):**
* *Çözüm:* Main process'te yürütülen PDF işlemleri sırasında asenkron (`async/await`) yapılar kullanın. Çok büyük dosyalarda (100MB+) performansı korumak için gerekirse Node.js `worker_threads` mimarisine geçiş yapın.


2. **Ghostscript Bağımlılığı (Cross-Platform Dağıtım):**
* *Çözüm:* Uygulama derlenirken (build aşaması) Windows (`.exe`), macOS (`m1/intel binary`) için uygun Ghostscript binary dosyalarını uygulamanın içerisine gömün (embed). Kullanıcının bilgisayarına haricen bir şey kurmasına izin vermeyin.


3. **Hafıza (Memory) Yönetimi:**
* *Çözüm:* `pdf-lib` nesneleriyle işiniz bittiğinde veya yeni dosya yüklendiğinde array buffer'ları ve büyük değişkenleri `null` yaparak JavaScript `Garbage Collector`'ın hafızayı temizlemesini sağlayın.



---

## 6. Test & Dağıtım (Build)

* [ ] **Manuel Testler:** Bozuk PDF, şifreli PDF ve çok büyük boyutlu taratılmış dökümanlarla hata yakalama mekanizmalarını test edin.
* [ ] **Paketleme (Bundling):** `electron-builder` kullanarak uygulamayı paketleyin.
* [ ] **Çıktı Formatları:** Windows için Taşınabilir (Portable) `exe`, macOS için `dmg` paketleri üretin.

---

*PDFgil Proje Planı Hazırdır. İlk satır kod için `npm install electron pdf-lib` komutu ile başlanabilir!*