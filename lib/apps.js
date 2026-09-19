// ===========================================================================
// DAFTAR APLIKASI
// ---------------------------------------------------------------------------
// Satu-satunya tempat untuk mendaftarkan aplikasi. Menambah aplikasi baru
// cukup dengan menambah satu objek di APPS, lalu redeploy portal.
//
//   key            : kode unik, dipakai di data user & tiket login (jangan diubah)
//   singkatan      : tulisan besar di kartu aplikasi
//   nama           : nama lengkap aplikasi
//   deskripsi      : satu kalimat tentang kegunaannya
//   url            : alamat aplikasi
//   roles          : pilihan role, HARUS sama persis dengan yang dikenali app-nya
//   pakaiDepartemen: tampilkan isian Departemen untuk app ini
//   sso            : true bila app sudah membaca login dari portal.
//                    false = kartu tetap tampil, tapi user masih login di app-nya.
//   warna          : warna penanda aplikasi
// ===========================================================================

const ROLES_QA = ["Tamu", "Staff", "Supervisor", "Assistant Manager", "Manager", "Administrator"];

export const APPS = [
  {
    key: "tte",
    singkatan: "TTE",
    nama: "Tanda Tangan Elektronik",
    deskripsi: "Pengesahan dokumen resmi dengan tanda tangan QR.",
    url: "https://tte.myrama.id",
    roles: ["personil", "admin"],
    pakaiDepartemen: false,
    sso: false,
    warna: "#0f766e",
  },
  {
    key: "dms",
    singkatan: "DMS",
    nama: "Document Management System",
    deskripsi: "Membuka salinan terkendali dokumen yang berlaku.",
    // Ganti ke https://dms.myrama.id saat domain DMS dipindah.
    url: "https://sidok.myrama.id",
    roles: ["Viewer", "Admin"],
    pakaiDepartemen: false,
    sso: false,
    warna: "#1e4d8f",
  },
  {
    key: "emv",
    singkatan: "EMV",
    nama: "EM Viable",
    deskripsi: "Hasil monitoring mikrobiologi lingkungan.",
    url: "https://emv.myrama.id",
    roles: ROLES_QA,
    pakaiDepartemen: true,
    sso: false,
    warna: "#6d28d9",
  },
  {
    key: "emnv",
    singkatan: "EMNV",
    nama: "EM Non Viable",
    deskripsi: "Pemantauan suhu, RH, dan DPG ruangan.",
    url: "https://emnv.myrama.id",
    roles: ["Tamu", "Staff", "Operator", "Admin", "Supervisor", "Assistant Manager", "Manager", "Administrator"],
    pakaiDepartemen: true,
    sso: false,
    warna: "#b45309",
  },
  {
    key: "spa",
    singkatan: "SPA",
    nama: "Sistem Pengolahan Air",
    deskripsi: "Hasil uji Purified Water, WFI, dan Pure Steam.",
    url: "https://spa.myrama.id",
    roles: ROLES_QA,
    pakaiDepartemen: true,
    sso: false,
    warna: "#0369a1",
  },
];

export const APP_MAP = Object.fromEntries(APPS.map((a) => [a.key, a]));

/**
 * Membersihkan data akses dari form/impor: hanya app yang terdaftar dan role
 * yang dikenali yang disimpan. App tanpa role = tidak punya akses.
 */
export function sanitizeApps(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const app of APPS) {
    const entry = input[app.key];
    if (!entry || !entry.role) continue;
    const role = String(entry.role).trim();
    if (!app.roles.includes(role)) continue;
    out[app.key] = {
      role,
      departemen: app.pakaiDepartemen ? String(entry.departemen || "").trim().slice(0, 500) : "",
    };
  }
  return out;
}
