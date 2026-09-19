import { allowMethods, sameOrigin, requireSession, clientIp, handler } from "../../../lib/http";
import { listUsers, getUser, saveUser, publicUser, validateUserInput } from "../../../lib/users";
import { hashPassword, passwordProblem, generatePassword } from "../../../lib/password";
import { revokeUserSessions } from "../../../lib/session";
import { logAudit } from "../../../lib/audit";

const aksesBerubah = (a, b) =>
  JSON.stringify(a.apps || {}) !== JSON.stringify(b.apps || {}) ||
  !!a.admin !== !!b.admin ||
  a.status !== b.status ||
  (a.berlakuSampai || "") !== (b.berlakuSampai || "");

function ringkasAkses(apps) {
  const keys = Object.keys(apps || {});
  return keys.length ? keys.map((key) => `${key}:${apps[key].role}`).join(", ") : "tanpa akses";
}

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  if (!sameOrigin(req, res)) return;
  const session = await requireSession(req, res, { admin: true });
  if (!session) return;

  if (req.method === "GET") {
    const users = (await listUsers())
      .map(publicUser)
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    return res.status(200).json({ ok: true, users });
  }

  const isNew = !!req.body?.baru;
  const { error, data } = validateUserInput(req.body?.user || {}, { isNew });
  if (error) return res.status(400).json({ error });

  const existing = await getUser(data.username);
  const ip = clientIp(req);

  if (isNew) {
    if (existing) return res.status(409).json({ error: `Username "${data.username}" sudah dipakai.` });

    let passwordAwal = String(req.body?.passwordAwal || "").trim();
    const dibuatOtomatis = !passwordAwal;
    if (dibuatOtomatis) passwordAwal = generatePassword();
    const masalah = passwordProblem(passwordAwal, data.username);
    if (masalah) return res.status(400).json({ error: masalah });

    const user = await saveUser({
      ...data,
      passwordHash: await hashPassword(passwordAwal),
      wajibGantiPassword: true,
      dibuat: new Date().toISOString(),
    });
    await logAudit({
      aksi: "user_dibuat",
      oleh: session.username,
      target: user.username,
      detail: ringkasAkses(user.apps),
      ip,
    });
    return res.status(200).json({
      ok: true,
      user: publicUser(user),
      passwordAwal: dibuatOtomatis ? passwordAwal : undefined,
    });
  }

  if (!existing) return res.status(404).json({ error: "User tidak ditemukan." });

  // Mencegah admin mengunci dirinya sendiri keluar.
  if (existing.username === session.username) {
    if (!data.admin) return res.status(400).json({ error: "Anda tidak bisa mencabut status admin milik sendiri." });
    if (data.status !== "Aktif") return res.status(400).json({ error: "Anda tidak bisa menonaktifkan akun sendiri." });
  }

  const updated = await saveUser({ ...existing, ...data });
  const berubah = aksesBerubah(existing, updated);
  // Tiket login menyimpan role saat login, jadi setiap perubahan akses
  // memutus sesi user itu agar role baru langsung berlaku di semua app.
  if (berubah && existing.username !== session.username) await revokeUserSessions(updated.username);

  await logAudit({
    aksi: "user_diubah",
    oleh: session.username,
    target: updated.username,
    detail: `${updated.status}; ${ringkasAkses(updated.apps)}${updated.berlakuSampai ? `; berlaku s.d. ${updated.berlakuSampai}` : ""}`,
    ip,
  });
  res.status(200).json({ ok: true, user: publicUser(updated), sesiDiputus: berubah });
});
