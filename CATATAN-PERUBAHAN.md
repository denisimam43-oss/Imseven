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

## Perubahan berikutnya (fondasi sistem keuangan)
1. **Kategori biaya baku** (`src/categories.ts`). Semua pengelompokan biaya (HPP, beban usaha, prive/dividen, cadangan pajak) kini dibaca dari satu tempat, tidak lagi dari potongan teks yang tersebar di banyak file. Kategori lama tetap terbaca dengan aturan yang sama, jadi angka laporan tidak bergeser. Ubah kategori di Riwayat Kas sekarang memakai pilihan, bukan teks bebas. Kategori manual disimpan dengan awalan "Lainnya - " dan masuk beban usaha.
2. **Jejak perubahan** (tab *Jejak Perubahan*). Mencatat siapa, kapan, nilai sebelum dan sesudah untuk tambah/ubah/hapus transaksi, pembayaran, serah terima, talangan, penyesuaian saldo, tutup buku, pengaturan, dan pemulihan backup. Ikut tersimpan di file Backup. Nama pengguna saat ini selalu "admin" sampai login per orang dipasang (isi `sessionStorage["seven_actor"]`).
3. **Saldo pembukaan** (tombol di bawah kartu rekening). Menyamakan saldo 4 rekening dengan saldo bank pada satu tanggal (default: akhir periode sebelumnya, tanggal 25). Selisih dicatat sebagai penyesuaian bertanda pembukaan, bukan omset atau biaya. Aman diisi ulang.
4. **Cadangan pajak dipisah dari beban usaha** di semua laporan (laporan proyek, rekap periode, ekspor CSV), sama seperti di kontrol anggaran. Tampil sebagai baris tersendiri dan mengurangi laba ditahan; tidak lagi menurunkan laba bersih.

## Belum termasuk
- Penyimpanan online (Firebase/Google Sheets) agar data tersinkron antar perangkat.

5. **Dana tak terduga (kontingensi) per proyek** (disetujui Denis 30 Okt 2026)
   - Satu kantong bersama (Rek 3). Per proyek ada *jatah* = 2% nilai kontrak dan *plafon* = 7% (pengaturan `contingencyCapPct`).
   - Biaya kontingensi sekarang wajib ditautkan ke proyek dan wajib diberi sebab (kesalahan internal, tukang/vendor, keputusan bisnis, kejadian eksternal). Rekening otomatis Rek 3.
   - Peringatan: waspada di 70% jatah, konfirmasi saat jatah habis, konfirmasi owner saat melewati plafon (ditandai `overCap`, dianggap kerugian proyek).
   - Panel baru "Dana Tak Terduga per Proyek" di tab Pipeline: jatah, terpakai, sisa, plafon, status per proyek, rekap per sebab periode berjalan, dan kontingensi lama yang belum ditautkan.
   - Logika murni di `src/contingency.ts`; sebab dan penanda plafon ikut tercatat di Jejak Perubahan.
   - Belum diputuskan: sisa jatah dilepas ke profit saat serah terima atau ditahan sampai garansi selesai; evaluasi ulang 2% setelah 3 periode.
