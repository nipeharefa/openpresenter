# Media disalin ke app data dan disajikan lewat asset protocol

**Media** yang diimpor disalin ke `app_data_dir/media/` dengan nama unik (`stored_name`), bukan menyimpan referensi ke path aslinya. File disajikan ke webview lewat asset protocol Tauri (`convertFileSrc`), dengan scope `$APPDATA/media/**` dan CSP `img-src`/`media-src asset:`.

Dipilih dibanding mereferensikan path asli: file asli sering dipindah/rename/hapus sehingga background rusak; menyalin membuat **Perpustakaan** mandiri dan portable. Trade-off: duplikasi ruang disk, dan menghapus item media harus menghapus file tersimpannya (ditangani di `delete_library_item`).
