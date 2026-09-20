import { Redis } from "@upstash/redis";

// ===========================================================================
// MEMBACA USER TTE (HANYA BACA)
// ---------------------------------------------------------------------------
// User TTE tersimpan di Upstash Redis milik aplikasi TTE (kunci qrsig:users).
// Portal membacanya memakai token READ-ONLY, sehingga portal secara teknis
// tidak mungkin mengubah data TTE. Aplikasi TTE sendiri tidak disentuh.
//
// Environment Variables portal:
//   TTE_KV_REST_API_URL              = nilai KV_REST_API_URL di project TTE
//   TTE_KV_REST_API_READ_ONLY_TOKEN  = nilai KV_REST_API_READ_ONLY_TOKEN di project TTE
// ===========================================================================

let client = null;

function tteRedis() {
  const url = process.env.TTE_KV_REST_API_URL;
  const token = process.env.TTE_KV_REST_API_READ_ONLY_TOKEN;
  if (!url || !token) {
    throw new Error("TTE_KV_REST_API_URL / TTE_KV_REST_API_READ_ONLY_TOKEN belum diisi");
  }
  if (!client) client = new Redis({ url, token });
  return client;
}

function parse(v) {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v;
}

/**
 * Daftar user TTE: { username, nama, role, departemen, aktif, hash }.
 * `hash` adalah hash bcrypt password TTE; JANGAN pernah dikirim ke browser.
 */
export async function readTteUsers() {
  const all = (await tteRedis().hgetall("qrsig:users")) || {};
  return Object.values(all)
    .map(parse)
    .filter((u) => u && u.username)
    .map((u) => ({
      username: String(u.username).trim().toLowerCase(),
      nama: String(u.full_name || "").trim(),
      role: u.role === "admin" ? "admin" : "personil",
      departemen: String(u.department || "").trim(),
      aktif: u.active !== false,
      hash: typeof u.password_hash === "string" && u.password_hash.startsWith("$2") ? u.password_hash : null,
    }));
}
