# Setup Multi-Pengguna Seven Finance (Firebase)

Langkah ini dikerjakan satu kali oleh Owner. Tanpa ini, aplikasi berjalan dalam mode lokal
(data tersimpan di browser masing-masing perangkat, sehingga Salwa dan Akuntan tidak melihat data yang sama).

## 1. Buat proyek Firebase
1. Buka https://console.firebase.google.com lalu klik **Add project**, misalnya `seven-finance`.
2. Menu **Build > Firestore Database > Create database**. Pilih lokasi `asia-southeast2` (Jakarta), mode production.
3. Menu **Build > Authentication > Get started > Sign-in method**, aktifkan **Email/Password**.
4. **Project settings > Your apps > Web (</>)**. Daftarkan aplikasi web, lalu salin konfigurasi.

## 2. Pasang aturan keamanan
Menu **Firestore Database > Rules**. Tempel isi file `firestore.rules` dari repo ini, lalu **Publish**.

## 3. Buat akun pengguna
Menu **Authentication > Users > Add user**. Buat satu akun per orang (Owner, Salwa, Akuntan) dengan email
masing-masing dan sandi awal minimal 8 karakter. Jangan berbagi satu akun.
Salin **User UID** tiap akun.

## 4. Tentukan peran
Menu **Firestore Database > Start collection**, nama koleksi `users`. Untuk tiap akun buat dokumen
dengan **Document ID = User UID** dan isi field:

| Field  | Tipe   | Nilai                                   |
|--------|--------|-----------------------------------------|
| role   | string | `OWNER`, `FINANCE`, atau `AKUNTAN`      |
| name   | string | Nama yang tampil, misalnya `Salwa`      |

Akun yang belum punya dokumen peran akan melihat layar "Peran belum diatur" dan tidak bisa membaca data.

## 5. Isi variabel lingkungan di Vercel
Project Vercel > Settings > Environment Variables. Isi `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (dan dua variabel lainnya jika ada), lalu **Redeploy**.
Di Firebase **Authentication > Settings > Authorized domains**, tambahkan domain Vercel Anda.

## 6. Pindahkan data lama
Login sebagai Owner dari perangkat yang datanya paling lengkap. Akan muncul banner
**Unggah Data Lama**; klik sekali. Alternatif: **Backup** di mode lama, lalu **Pulihkan** setelah Firebase aktif.
Setelah itu cocokkan saldo tiap rekening dengan saldo bank sebelum dipakai harian.

## Hak akses ringkas
| Tindakan | Owner | Finance (Salwa) | Akuntan |
|---|---|---|---|
| Catat pembayaran dan pengeluaran | Ya | Ya | Ya |
| Batalkan transaksi (wajib alasan) | Ya | Ya | Tidak |
| Setujui pengeluaran di atas batas | Ya | Tidak | Tidak |
| Tutup/buka kembali buku periode | Ya | Tidak | Tidak |
| Ubah target dan pengaturan kontrol | Ya | Tidak | Tidak |
| Pulihkan backup | Ya | Tidak | Tidak |

## Catatan
- Aturan Firestore di atas menegakkan: log audit hanya bisa ditambah, transaksi tidak bisa dihapus,
  dan persetujuan hanya bisa diputuskan Owner. Pembatasan lain (tutup buku, pengaturan) ditegakkan di aplikasi;
  untuk pengamanan tingkat server perlu Cloud Functions.
- Kewajiban link bukti hanya divalidasi di tampilan aplikasi.
