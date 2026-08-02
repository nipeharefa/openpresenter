# OpenPresenter

Presentasi ibadah minimalis: operator menyusun **Urutan Ibadah** berisi item teks (lagu, ayat, pengumuman), lalu menayangkannya fullscreen di **Window Proyeksi** terpisah sambil dikontrol dari **Window Kontrol**.

## Language

**Urutan Ibadah**:
Rangkaian **Item** yang disusun untuk satu kebaktian.
_Avoid_: schedule, playlist, order

**Item**:
Satu blok konten teks di dalam **Urutan Ibadah** (misal satu lagu, satu ayat, atau pengumuman).
_Avoid_: lagu (terlalu spesifik), slide

**Slide**:
Tampilan satu layar yang diturunkan dari teks sebuah **Item** — setiap baris kosong memisahkan satu slide.
_Avoid_: page, screen, halaman

**Mode Live**:
Kondisi operator menayangkan **Urutan Ibadah** ke **Window Proyeksi**.

**Layar Hitam**:
Tampilan kosong hitam pada proyeksi untuk jeda ibadah (doa, kolekte).
_Avoid_: black, blank

**Window Kontrol**:
Window utama tempat operator mengedit dan mengontrol presentasi.

**Window Proyeksi**:
Window terpisah yang menampilkan **Slide** aktif, biasanya fullscreen di monitor/proyektor kedua.

## Relationships

- Sebuah **Urutan Ibadah** berisi satu atau lebih **Item** yang diurutkan
- Sebuah **Item** menghasilkan satu atau lebih **Slide** (diturunkan dari teksnya saat render)
- **Mode Live** menunjuk ke satu **Item** aktif dan satu **Slide** aktif
- **Layar Hitam** menimpa tampilan **Window Proyeksi** tanpa mengubah posisi slide aktif

## Example dialogue

> **Dev:** "Kalau operator tekan Next di slide terakhir sebuah lagu, lanjut ke item berikutnya otomatis?"
> **Domain expert:** "Ya — **Mode Live** maju ke **Slide** berikutnya dalam **Item** yang sama; kalau habis, lanjut ke **Item** berikutnya di **Urutan Ibadah**."

## Flagged ambiguities

- "slide" sempat dipakai untuk **Item** dan **Slide** — resolved: **Item** adalah entitas tersimpan, **Slide** adalah turunan render dari teksnya.
