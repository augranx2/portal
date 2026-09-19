import { redis, k, asObject } from "./redis";

const MAX = 5000;

/**
 * Mencatat aktivitas penting: login, login gagal, perubahan user, reset
 * password, impor. Log tidak pernah berisi password.
 */
export async function logAudit({ aksi, oleh = "", target = "", detail = "", ip = "" }) {
  try {
    const entry = { waktu: new Date().toISOString(), aksi, oleh, target, detail, ip };
    await redis().lpush(k("audit"), entry);
    await redis().ltrim(k("audit"), 0, MAX - 1);
  } catch (err) {
    // Log gagal tidak boleh menggagalkan aksi utama.
    console.error("Gagal menulis audit log:", err);
  }
}

export async function listAudit(limit = 300) {
  const n = Math.min(Math.max(Number(limit) || 300, 1), 2000);
  const rows = await redis().lrange(k("audit"), 0, n - 1);
  return rows.map(asObject).filter(Boolean);
}
