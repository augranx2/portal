# Portal REMS

Satu website untuk masuk ke semua aplikasi PT. Rama Emerald Multi Sukses
(TTE, DMS, EM Viable, EM Non Viable, SPA). Satu akun per orang, dan setiap
orang hanya melihat aplikasi yang menjadi haknya.

Tahap ini: portal, data user pusat, dan halaman admin. Aplikasi masih memakai
login masing-masing (kartu bertanda "Login di aplikasi") sampai disambungkan
satu per satu pada tahap berikutnya.

## Teknologi

Next.js 14 (Pages Router) di Vercel, Upstash Redis untuk user dan sesi,
bcrypt untuk password, JWT (jose) untuk tiket login lintas subdomain.

## Cara memasang

1. **Repository baru.** Buat repo GitHub baru (misalnya `portal`), unggah
   seluruh isi folder ini.
2. **Project Vercel baru.** Import repo tersebut di Vercel. Framework
   otomatis terdeteksi sebagai Next.js.
3. **Environment Variables** (Settings, Environment Variables). Lihat
   `.env.example`:
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: boleh memakai
     database Upstash yang sama dengan DMS. Semua kunci portal berawalan
     `portal:` sehingga tidak bentrok.
   - `SSO_SECRET`: teks acak minimal 32 karakter (misalnya dari password
     generator, 48 karakter). Simpan baik-baik, nilai ini nanti dipasang juga
     di semua aplikasi.
   - `COOKIE_DOMAIN`: `.myrama.id`
   - `ALLOWED_REDIRECT_DOMAIN`: `myrama.id`
   - `SESSION_HOURS`: `12`, `SESSION_IDLE_MINUTES`: `60`
   - `SETUP_KEY`: kode sekali pakai untuk membuat admin pertama.
4. **Domain.** Di Settings, Domains, tambahkan `portal.myrama.id`, lalu
   buat CNAME di DNS seperti subdomain lainnya.
5. **Deploy**, lalu buka `https://portal.myrama.id/setup` dan buat admin
   pertama dengan `SETUP_KEY`. Halaman setup terkunci permanen setelahnya.
6. **Impor user.** Buka menu Kelola pengguna, Impor dari sheet. Unduh tab
   user dari keempat spreadsheet sebagai CSV (File, Download, .csv),
   unggah, periksa, tentukan password awal, lalu impor.
7. **Rapikan akun.** Di menu Pengguna, cek hasil impor. Untuk `tamu`,
   `bbpom`, dan `bpom`, isi tanggal "Berlaku sampai" atau set Nonaktif di
   luar masa audit. Akses TTE diatur manual di sini.

## Menjalankan di komputer sendiri

```
npm install
cp .env.example .env.local   # isi nilainya, COOKIE_DOMAIN dikosongkan
npm run dev
```

## Aturan keamanan yang sudah diterapkan

- Password disimpan sebagai hash bcrypt, tidak pernah tersimpan terbuka.
- Akun baru dan hasil reset wajib ganti password saat login pertama.
- 5 kali salah password mengunci username itu selama 15 menit (admin bisa
  membuka kuncinya lebih awal).
- Akun bisa dinonaktifkan atau diberi masa berlaku, dan langsung terputus
  dari semua sesi.
- Perubahan akses memutus sesi user itu supaya role baru langsung berlaku.
- Semua login, login gagal, dan perubahan akun tercatat di Log aktivitas.
- Admin tidak bisa menonaktifkan, mencabut admin, atau menghapus akunnya
  sendiri, supaya tidak terkunci keluar.

## Menambah aplikasi baru

Tambahkan satu objek di `lib/apps.js` (key, nama, url, daftar role), lalu
redeploy. Kartu dan pilihan aksesnya muncul otomatis.

## Kontrak tiket login (untuk tahap menyambungkan aplikasi)

Cookie `myrama_sso` di domain `.myrama.id`, berisi JWT HS256 bertanda
tangan `SSO_SECRET`, issuer `portal.myrama`, audience `myrama`:

| Klaim  | Isi                                                       |
| ------ | --------------------------------------------------------- |
| `sub`  | username                                                  |
| `sid`  | id sesi                                                   |
| `nama` | nama lengkap                                              |
| `apps` | `{ emv: { role, departemen }, ... }`                      |
| `wgp`  | `true` bila belum ganti password awal (aplikasi menolak)  |

Aplikasi menganggap tiket sah bila tanda tangan valid, belum kedaluwarsa,
`wgp` bernilai false, app-nya ada di `apps`, dan kunci Redis
`portal:sess:<sid>` masih ada. Pemeriksaan terakhir inilah yang membuat
logout dan penonaktifan akun berlaku seketika di semua aplikasi.

Alamat logout untuk tombol Keluar di aplikasi: `https://portal.myrama.id/keluar`.
Alamat login dengan kembali otomatis:
`https://portal.myrama.id/login?next=https://emv.myrama.id/`.
