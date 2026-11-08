# Catatan Perubahan – Sistem Keuangan v2

## Yang diperbaiki
1. **Pembayaran sesuai fakta.** DP, termin, dan pelunasan diisi dengan nominal dan tanggal yang benar-benar masuk (tidak lagi otomatis 60%/40%).
2. **Saldo Rek 1 tidak lagi dihitung ganda.** Uang klien masuk ke Rek 1, lalu dipindah ke Rek 2/3/4 sebagai transaksi *Transfer*. Total 4 rekening = uang sebenarnya.
3. **Alokasi SOP tetap otomatis.** Porsi 0–60% kontrak → Rek 2 (53%) & Rek 3 (7%); porsi 60–100% → Rek 3 (20%) & Rek 4 (20%). Berlaku juga untuk DP 50%, cicilan beberapa termin, dll.
4. **Laba diakui saat serah terima (SAK EMKM).** Tombol *Serah Terima* mengakui pendapatan & HPP proyek. Sebelum itu uang klien dianggap *uang muka pelanggan*.
5. **Laporan Laba Rugi & Posisi Keuangan** (kas, piutang, proyek dalam pengerjaan, uang muka pelanggan).
6. **Proyek diarsipkan, bukan dihapus.** Proyek yang sudah punya transaksi tidak bisa dihapus.
7. **Transfer antar rekening**, tanggal bisa diisi mundur, edit tanggal transaksi.
8. **Backup & Pulihkan** data (.json) – data tetap hanya di browser, jadi backup rutin wajib.
9. Keamanan: login tidak lagi menerima `admin123` setelah sandi diganti, pesan error tidak menampilkan sandi, hapus data wajib mengetik `HAPUS`.

## Data lama
Data versi lama dikonversi otomatis saat aplikasi dibuka. Salinan aslinya disimpan di browser
(`seven_interior_backup_pre_v2`). Setelah update, cocokkan saldo tiap rekening dengan saldo bank
dan sesuaikan lewat ikon pensil di kartu rekening.

## Belum termasuk
- Penyimpanan online (Firebase/Google Sheets) agar data tersinkron antar perangkat.

## Tambahan: Kewajiban, Aset Tetap & Neraca lengkap
Tab baru **Kewajiban, Aset & Neraca** di Dashboard.
1. **Daftar kewajiban**: supplier, refund klien, kredit/cicilan, dana investor, kontrak legal. Ada sisa, pembayaran per bulan, dan penanda apakah cicilan sudah termasuk "biaya tetap".
2. **Aset tetap & penyusutan** garis lurus (kendaraan, mesin, peralatan). Umur ekonomis hanya usulan akuntansi, bukan ketentuan pajak. Harga boleh perkiraan.
3. **Neraca lengkap**: Aset (kas, piutang, WIP, aset tetap) = Kewajiban (uang muka pelanggan + kewajiban terdaftar) + Ekuitas. Muncul peringatan bila data belum lengkap.
4. **Ketahanan kas**: kas bebas (Rek 1+3+4) dibagi kebutuhan bulanan = berapa bulan bertahan, dengan target dana darurat yang bisa diubah (default 1 bulan). Status KRITIS / TIPIS / AMAN.
5. Backup/pulihkan JSON ikut menyimpan data baru; backup lama tetap bisa dipulihkan.

Catatan: tombol "Kurangi sisa" hanya mengurangi sisa kewajiban. Uang keluarnya tetap dicatat di Pengeluaran agar saldo rekening dan laba rugi tidak berubah diam-diam. Belum ada rekening cadangan khusus (Rek 5) dan ekspor CSV belum memuat data baru.
