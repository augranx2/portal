import { allowMethods, sameOrigin, requireSession, clientIp, handler } from "../../../lib/http";
import { getUser, saveUser, removeUser } from "../../../lib/users";
import { hashPassword, passwordProblem, generatePassword } from "../../../lib/password";
import { revokeUserSessions } from "../../../lib/session";
import { clearFailures } from "../../../lib/ratelimit";
import { logAudit } from "../../../lib/audit";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!sameOrigin(req, res)) return;
  const session = await requireSession(req, res, { admin: true });
  if (!session) return;

  const { username, aksi } = req.body || {};
  const user = await getUser(username);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan." });
  const ip = clientIp(req);

  if (aksi === "reset-password") {
    let passwordBaru = String(req.body?.passwordBaru || "").trim();
    const dibuatOtomatis = !passwordBaru;
    if (dibuatOtomatis) passwordBaru = generatePassword();
    const masalah = passwordProblem(passwordBaru, user.username);
    if (masalah) return res.status(400).json({ error: masalah });

    await saveUser({ ...user, passwordHash: await hashPassword(passwordBaru), wajibGantiPassword: true });
    await revokeUserSessions(user.username);
    await clearFailures(`u:${user.username}`);
    await logAudit({ aksi: "reset_password", oleh: session.username, target: user.username, ip });
    return res.status(200).json({ ok: true, passwordBaru });
  }

  if (aksi === "akhiri-sesi") {
    if (user.username === session.username) {
      return res.status(400).json({ error: "Gunakan tombol Keluar untuk mengakhiri sesi Anda sendiri." });
    }
    await revokeUserSessions(user.username);
    await logAudit({ aksi: "sesi_diakhiri", oleh: session.username, target: user.username, ip });
    return res.status(200).json({ ok: true });
  }

  if (aksi === "buka-kunci") {
    await clearFailures(`u:${user.username}`);
    await logAudit({ aksi: "kunci_dibuka", oleh: session.username, target: user.username, ip });
    return res.status(200).json({ ok: true });
  }

  if (aksi === "hapus") {
    if (user.username === session.username) {
      return res.status(400).json({ error: "Anda tidak bisa menghapus akun sendiri." });
    }
    await revokeUserSessions(user.username);
    await removeUser(user.username);
    await logAudit({ aksi: "user_dihapus", oleh: session.username, target: user.username, detail: user.nama, ip });
    return res.status(200).json({ ok: true });
  }

  res.status(400).json({ error: "Aksi tidak dikenal." });
});
