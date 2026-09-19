import { allowMethods, sameOrigin, requireSession, clientIp, handler } from "../../../lib/http";
import { getUser, saveUser, normalizeUsername, USERNAME_RE } from "../../../lib/users";
import { hashPassword, passwordProblem } from "../../../lib/password";
import { sanitizeApps } from "../../../lib/apps";
import { revokeUserSessions } from "../../../lib/session";
import { logAudit } from "../../../lib/audit";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

/**
 * Impor gabungan dari sheet user EMV, EMNV, SPA, dan DMS.
 * Browser sudah menggabungkan baris per username; server hanya memvalidasi
 * dan menyimpan. Kolom password/hash/salt dari sheet TIDAK pernah dikirim.
 *
 * body: { users: [{ username, nama, apps }], passwordAwal, timpaAkses }
 */
export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!sameOrigin(req, res)) return;
  const session = await requireSession(req, res, { admin: true });
  if (!session) return;

  const rows = Array.isArray(req.body?.users) ? req.body.users : [];
  if (rows.length === 0) return res.status(400).json({ error: "Tidak ada data untuk diimpor." });
  if (rows.length > 1000) return res.status(400).json({ error: "Maksimal 1000 user sekali impor." });

  const passwordAwal = String(req.body?.passwordAwal || "");
  const masalah = passwordProblem(passwordAwal);
  if (masalah) return res.status(400).json({ error: `Password awal: ${masalah}` });
  const timpaAkses = !!req.body?.timpaAkses;

  const hashAwal = await hashPassword(passwordAwal);
  const hasil = { dibuat: [], diperbarui: [], dilewati: [] };

  for (const row of rows) {
    const username = normalizeUsername(row.username);
    if (!USERNAME_RE.test(username)) {
      hasil.dilewati.push({ username: row.username || "(kosong)", alasan: "format username tidak valid" });
      continue;
    }
    if (passwordAwal.toLowerCase() === username) {
      hasil.dilewati.push({ username, alasan: "password awal sama dengan username" });
      continue;
    }
    const apps = sanitizeApps(row.apps);
    const nama = String(row.nama || "").trim().slice(0, 120) || username;
    const existing = await getUser(username);

    if (!existing) {
      await saveUser({
        username,
        nama,
        status: "Aktif",
        berlakuSampai: "",
        admin: false,
        apps,
        passwordHash: hashAwal,
        wajibGantiPassword: true,
        dibuat: new Date().toISOString(),
      });
      hasil.dibuat.push(username);
      continue;
    }

    // User lama: password & status tidak diubah, hanya akses aplikasi.
    const gabungan = { ...(existing.apps || {}) };
    for (const [key, val] of Object.entries(apps)) {
      if (timpaAkses || !gabungan[key]) gabungan[key] = val;
    }
    if (JSON.stringify(gabungan) !== JSON.stringify(existing.apps || {})) {
      await saveUser({ ...existing, apps: gabungan });
      if (existing.username !== session.username) await revokeUserSessions(username);
      hasil.diperbarui.push(username);
    } else {
      hasil.dilewati.push({ username, alasan: "sudah sama" });
    }
  }

  await logAudit({
    aksi: "impor_user",
    oleh: session.username,
    detail: `${hasil.dibuat.length} dibuat, ${hasil.diperbarui.length} diperbarui, ${hasil.dilewati.length} dilewati`,
    ip: clientIp(req),
  });
  res.status(200).json({ ok: true, ...hasil });
});
