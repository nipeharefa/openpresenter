# Item cue list mereferensikan Lagu library, bukan snapshot

**Item** di **Urutan Ibadah** yang berasal dari **Perpustakaan Lagu** menyimpan `song_id` dan merefleksikan teks **Lagu** saat render (JOIN), bukan menyalin teks ke item. Mengedit **Lagu** membuat semua **Urutan Ibadah** yang mereferensikannya ikut berubah.

Dipilih dibanding snapshot (salin teks saat menambah ke urutan): dengan snapshot, typo yang diperbaiki di library tidak akan menjangkau ibadah yang sudah disusun. Trade-off: saat **Lagu** dihapus, teksnya di-snapshot ke item referensinya (`delete_song`) agar urutan tetap bisa ditayangkan tanpa lagu tersebut.
