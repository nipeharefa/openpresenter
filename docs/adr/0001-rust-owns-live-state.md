# Rust memegang state presentasi live; window adalah view pasif

State live (item aktif, slide aktif, layar hitam) dimiliki backend Rust dan dibroadcast ke kedua window lewat event `live:changed`. Window kontrol dan proyeksi tidak menyimpan salinan state sendiri.

Dipilih dibanding (a) SQLite sebagai sumber kebenaran live — rawan race dan butuh polling proyeksi; dan (b) controller window memegang state — menciptakan dua salinan yang harus disinkronkan. Menjadikan Rust pemilik tunggal membuat desync antara window proyeksi dan kontrol mustahil, yang penting untuk pemakaian ibadah sungguhan.
