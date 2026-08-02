# OpenPresenter

Presentasi ibadah minimalis. Operator menyusun **Urutan Ibadah** berisi item teks (lagu, ayat, pengumuman), lalu menayangkannya fullscreen di **Window Proyeksi** terpisah sambil dikontrol dari **Window Kontrol**.

Terminologi domain: lihat [CONTEXT.md](./CONTEXT.md).

## Tech stack

- Tauri 2 + React + TypeScript (Vite)
- Backend Rust: `rusqlite` (SQLite), state live milik Rust (lihat ADR)
- Build & dev via **nix** (`flake.nix`), cache kompilasi Rust via `sccache`

## Development

```sh
nix develop          # masuk dev shell (atau direnv: sudah ada .envrc)
pnpm install
pnpm tauri dev       # jalankan app dalam mode dev
```

Skema SQLite dimigrasi otomatis lewat `PRAGMA user_version`; database tersimpan di `app_data_dir`.

## Build

- **macOS** (lokal): `pnpm tauri build`
- **Windows** (CI): GitHub Actions — `.github/workflows/build-windows.yml`, dipicu oleh tag `v*` atau manual
- **Linux**: belum ditargetkan (devShell sudah menyiapkan dependensi)

## Konvensi konten

Teks sebuah **Item** dipisah menjadi **Slide** oleh baris kosong (`\n\n`). Satu baris kosong = batas slide.
