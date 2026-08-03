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

**Lagu**:
Koleksi lirik berjudul di **Perpustakaan Lagu** yang menghasilkan satu atau lebih **Slide**.
_Avoid_: song, lagu rohani

**Tag**:
Label pencarian yang ditempel ke sebuah **Lagu**; satu **Lagu** dapat memiliki banyak **Tag**.
_Avoid_: kategori

**Perpustakaan Lagu**:
Kumpulan **Lagu** yang dicari berdasarkan judul atau **Tag**, lalu dimasukkan ke **Urutan Ibadah**.

**Cue List**:
Istilah operator untuk **Urutan Ibadah** — susunan item untuk satu penampilan.
_Avoid_: schedule, playlist

## Relationships

- Sebuah **Urutan Ibadah** berisi satu atau lebih **Item** yang diurutkan
- Sebuah **Item** menghasilkan satu atau lebih **Slide** (diturunkan dari teksnya saat render)
- **Mode Live** menunjuk ke satu **Item** aktif dan satu **Slide** aktif
- **Layar Hitam** menimpa tampilan **Window Proyeksi** tanpa mengubah posisi slide aktif
- Sebuah **Item** dapat merujuk satu **Lagu** dari **Perpustakaan Lagu** dan merefleksikan teksnya secara live
- Sebuah **Lagu** memiliki banyak **Tag**; sebuah **Tag** melekat pada banyak **Lagu**

## Example dialogue

> **Dev:** "Kalau operator tekan Next di slide terakhir sebuah lagu, lanjut ke item berikutnya otomatis?"
> **Domain expert:** "Ya — **Mode Live** maju ke **Slide** berikutnya dalam **Item** yang sama; kalau habis, lanjut ke **Item** berikutnya di **Urutan Ibadah**."

## Flagged ambiguities

- "slide" sempat dipakai untuk **Item** dan **Slide** — resolved: **Item** adalah entitas tersimpan, **Slide** adalah turunan render dari teksnya.
- "cue list" sempat terasa seperti entitas baru — resolved: **Cue List** adalah istilah operator untuk **Urutan Ibadah**, konsep yang sama.
- "lagu" sempat dipakai untuk **Item** biasa dan **Lagu** library — resolved: **Lagu** adalah entitas library dengan **Tag**; item teks biasa tetap **Item**.
