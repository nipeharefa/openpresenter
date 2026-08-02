# Persistensi memakai SQLite via rusqlite, bukan file JSON

Data disimpan di database SQLite (`openpresenter.db` di `app_data_dir`) dan diakses langsung dari backend Rust via `rusqlite`, bukan lewat `tauri-plugin-sql` dari frontend.

File JSON lebih sederhana untuk struktur nested, tetapi fase berikutnya (library lagu + pencarian) membutuhkan query relasional — migrasi dari JSON ke database itu mahal. Menjaga akses DB di Rust konsisten dengan keputusan bahwa Rust pemilik state (ADR-0001); frontend hanya memanggil command. Versi skema dikelola dengan `PRAGMA user_version` untuk migrasi aman.
