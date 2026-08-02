# Slide adalah turunan dari teks, bukan entitas database

Setiap **Item** menyimpan satu blok teks; **Slide** diturunkan saat render dengan membelah teks pada baris kosong. Tidak ada tabel `slide` di skema.

Ini sengaja menyimpang dari hierarki domain (Urutan → Item → Slide) agar editing sederhana (satu textarea per item, workflow "paste lirik") dan menghindari entitas duplikat. Konvensi pemisah: satu baris kosong (`\n\n`) = batas slide. Fase berikutnya (per-slide styling, thumbnail) akan butuh reifikasi slide — keputusan itu dibahas saat datang.
