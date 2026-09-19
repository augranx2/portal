import { Redis } from "@upstash/redis";

// Satu koneksi dipakai ulang selama fungsi serverless masih hangat.
let client = null;

export function redis() {
  if (!client) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN belum diisi");
    }
    client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return client;
}

// Semua kunci portal diawali "portal:" supaya tidak bentrok dengan DMS/TTE
// bila memakai database Upstash yang sama.
//
//   portal:user:<username>      data user (JSON)
//   portal:users                daftar semua username (set)
//   portal:sess:<sid>           sesi login aktif (hangus sendiri)
//   portal:usersess:<username>  daftar sesi milik satu user (set)
//   portal:audit                log aktivitas (list, terbaru di depan)
//   portal:rl:*                 penghitung percobaan login gagal
//   portal:setup_done           penanda admin pertama sudah dibuat
export const k = (key) => `portal:${key}`;

// Upstash otomatis mengubah JSON jadi objek, tapi data lama bisa berupa teks.
export function asObject(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}
