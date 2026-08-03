# `design.md` - AuraCast (Phase 1)

**Versi:** 1.0.0 (Phase 1 - MVP)  
**Tujuan:** Menyediakan panduan sistem desain yang *scalable*, bersih, dan terstruktur untuk aplikasi *live presentation* AuraCast, dengan mengacu pada prinsip DesignMD.

---

## 1. Design Principles
Untuk Fase 1, kita berfokus pada **Kecepatan** dan **Keterbacaan**.
*   **High Contrast:** Karena aplikasi digunakan di lingkungan gelap (ruang FOH/AV), kontras antara teks dan latar belakang harus memenuhi standar aksesibilitas (WCAG AA).
*   **Predictability:** Tindakan yang memengaruhi layar *Live* (audiens) harus memiliki indikator visual yang jelas (Warna Hijau/Merah).
*   **Modular Component:** Setiap elemen dibangun sebagai komponen terisolasi agar mudah digunakan ulang.

---

## 2. Design Tokens

Token ini merepresentasikan variabel dasar pembentuk UI. Pengembang dapat menerjemahkannya menjadi CSS Custom Properties (`--var-name`).

### 2.1. Colors
Kita menggunakan sistem *Dark Mode Default* untuk mengurangi kelelahan mata.

| Token Name | Hex Value | RGB | Penggunaan Utama |
| :--- | :--- | :--- | :--- |
| `color-bg-base` | `#0F1115` | `15, 17, 21` | Latar belakang *window* aplikasi utama. |
| `color-surface-1` | `#1A1D24` | `26, 29, 36` | Latar belakang panel (Library, Flow, Preview). |
| `color-surface-2` | `#272A33` | `39, 42, 51` | Latar belakang *Card* atau elemen saat di-*hover*. |
| `color-surface-3` | `#353945` | `53, 57, 69` | Garis batas (*border*) dan pemisah (*divider*). |
| `color-text-primary`| `#F3F4F6` | `243, 244, 246` | Teks utama, judul, lirik di editor. |
| `color-text-muted` | `#9CA3AF` | `156, 163, 175` | Teks sekunder, label, ikon yang tidak aktif. |
| `color-brand-blue` | `#3B82F6` | `59, 130, 246` | Tombol primer, ring fokus, elemen aktif (Edit).|
| `color-status-live` | `#10B981` | `16, 185, 129` | Border/Label indikator bahwa slide sedang TAYANG. |
| `color-status-alert`| `#EF4444` | `239, 68, 68` | Tombol *Clear All*, peringatan, *Blackout*. |

### 2.2. Typography
Menggunakan **Inter** untuk keterbacaan UI yang optimal.

*   `font-family-base`: `'Inter', sans-serif`
*   `type-heading-1`: `600 24px/1.2`, Letter Spacing `-0.02em`
*   `type-heading-2`: `600 18px/1.3`, Letter Spacing `-0.01em`
*   `type-body-strong`: `500 14px/1.5`, Letter Spacing `0`
*   `type-body-base`: `400 14px/1.5`, Letter Spacing `0`
*   `type-caption`: `400 12px/1.5`, Letter Spacing `0`

### 2.3. Spacing & Sizing
Sistem *spacing* berbasis kelipatan 4px dan 8px.

*   `space-xs`: `4px`
*   `space-sm`: `8px`
*   `space-md`: `16px` (Padding standar komponen)
*   `space-lg`: `24px` (Jarak antar panel)
*   `space-xl`: `32px`
*   `radius-sm`: `4px`
*   `radius-md`: `8px` (Bentuk default untuk *Card* dan *Button*)
*   `radius-lg`: `16px` (Bentuk untuk Panel utama)

---

## 3. Core Components (Phase 1)

### 3.1. Slide Card
Komponen ini adalah elemen yang paling sering diklik operator untuk mengganti *slide*.

**Anatomi Slide Card:**
*   **Container:** `radius-md`, `color-surface-1`, `border 1px solid transparent`.
*   **Thumbnail:** Pratinjau kecil gambar/video *background* di sisi kiri.
*   **Content:** Teks lirik yang ada di dalam slide (`type-body-base`, `color-text-primary`).
*   **State: Hover:** Container berubah menjadi `color-surface-2`.
*   **State: Active/Live:** 
    *   Border berubah menjadi `2px solid color-status-live`.
    *   Muncul label "LIVE" kecil di sudut kanan atas dengan `bg-color-status-live`.

### 3.2. Quick Action Buttons
Tombol kontrol utama untuk memanipulasi *output*.
*   **Clear Text:** Ikon silang + teks "Clear Text". `color-surface-2`, berubah kemerahan saat *hover*.
*   **Blackout:** Tombol tebal. Default: `color-surface-2`. Saat diaktifkan (layar hitam): `color-status-alert`.

---

## 4. Layout Structure (Grid System)

Tata letak menggunakan CSS Grid untuk membagi layar menjadi 3 kolom utama yang mengisi `100vh` (tinggi layar penuh), dengan *padding* luar sebesar `space-sm` (8px).

```css
/* Layout Blueprint */
.auracast-layout {
  display: grid;
  grid-template-columns: 280px 1fr 320px; /* Library | Main Flow | Control */
  gap: var(--space-md);
  height: 100vh;
  background-color: var(--color-bg-base);
  padding: var(--space-sm);
}

.panel {
  background-color: var(--color-surface-1);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-surface-3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

**Pembagian Panel:**
1.  **Left Panel (Library):** Tab navigasi (Songs, Bibles, Media), dan daftar *item* yang bisa di-*drag-and-drop*.
2.  **Center Panel (The Flow):** Area utama. Menampilkan judul lagu/sesi saat ini, dan Grid/List dari komponen **Slide Card**. Memiliki *scrollbar* tersembunyi/halus.
3.  **Right Panel (Command Center):** 
    *   *Top:* Kotak **Live Preview** dengan rasio 16:9.
    *   *Middle:* Deretan **Quick Action Buttons** (Clear Text, Background, Audio).
    *   *Bottom:* Tab properti ringkas untuk slide yang sedang dipilih.

---

## 5. Phase 1 Deliverables (Handoff Checklist)
Untuk merilis versi awal (Fase 1), hal-hal ini harus sudah berfungsi:
- [x] Sistem Grid 3-Kolom yang responsif terhadap ukuran layar Desktop (1280px ke atas).
- [x] Implementasi 100% *Dark Mode* sesuai Token Warna.
- [x] Komponen *Slide Card* dengan *state* `Normal`, `Hover`, dan `Live`.
- [x] Panel pratinjau (*Live Preview*) yang secara visual mencerminkan status *Slide Card* yang sedang `Live`.
- [x] Tombol "Clear" yang dapat menghentikan teks/visual dari layar *Live Preview*.