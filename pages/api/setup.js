import { timingSafeEqual } from "crypto";
import { allowMethods, sameOrigin, clientIp, handler } from "../../lib/http";
import { redis, k } from "../../lib/redis";
import { getUser, saveUser, normalizeUsername, USERNAME_RE } from "../../lib/users";
import { hashPassword, passwordProblem } from "../../lib/password";
import { createSession } from "../../lib/session";
import { logAudit } from "../../lib/audit";

function sama(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Membuat admin portal pertama. Hanya bisa dipakai sekali, dan hanya dengan
 * SETUP_KEY dari Environment Variables.
 */
export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const selesai = !!(await redis().get(k("setup_done")));
  const tersedia = !selesai && !!process.env.SETUP_KEY;

  if (req.method === "GET") return res.status(200).json({ tersedia });
  if (!sameOrigin(req, res)) return;
  if (!tersedia) return res.status(403).json({ error: "Setup sudah selesai atau SETUP_KEY belum diisi." });

  const { setupKey, nama } = req.body || {};
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");

  if (!sama(setupKey || "", process.env.SETUP_KEY)) {
    await logAudit({ aksi: "setup_gagal", ip: clientIp(req) });
    return res.status(403).json({ error: "Kode setup salah." });
  }
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: "Format username tidak valid." });
  if (!String(nama || "").trim()) return res.status(400).json({ error: "Nama wajib diisi." });
  const masalah = passwordProblem(password, username);
  if (masalah) return res.status(400).json({ error: masalah });

  // Periksa konfigurasi SEBELUM mengunci setup, supaya kesalahan pengaturan
  // tidak membuat setup terkunci padahal admin belum berhasil dibuat.
  if ((process.env.SSO_SECRET || "").length < 32) {
    return res.status(500).json({ error: "SSO_SECRET belum diisi atau kurang dari 32 karakter. Perbaiki di Vercel lalu Redeploy." });
  }

  // Kunci setup supaya tidak bisa dijalankan dua kali bersamaan.
  const dapat = await redis().set(k("setup_done"), new Date().toISOString(), { nx: true });
  if (!dapat) return res.status(403).json({ error: "Setup sudah selesai." });

  try {
    const existing = await getUser(username);
    const user = await saveUser({
      ...(existing || {}),
      username,
      nama: String(nama).trim().slice(0, 120),
      status: "Aktif",
      berlakuSampai: "",
      admin: true,
      apps: existing?.apps || {},
      passwordHash: await hashPassword(password),
      wajibGantiPassword: false,
      dibuat: existing?.dibuat || new Date().toISOString(),
    });
    await createSession(res, user);
    await logAudit({ aksi: "setup_admin", oleh: username, ip: clientIp(req) });
  } catch (err) {
    // Gagal di tengah jalan: buka kembali setup supaya bisa diulang.
    await redis().del(k("setup_done"));
    throw err;
  }
  res.status(200).json({ ok: true });
});
