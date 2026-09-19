import { allowMethods, sameOrigin, requireSession, clientIp, handler } from "../../../lib/http";
import { getUser, saveUser } from "../../../lib/users";
import { verifyPassword, hashPassword, passwordProblem } from "../../../lib/password";
import { createSession, revokeUserSessions } from "../../../lib/session";
import { logAudit } from "../../../lib/audit";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!sameOrigin(req, res)) return;
  const session = await requireSession(req, res, { allowWajibGanti: true });
  if (!session) return;

  const passwordLama = String(req.body?.passwordLama || "");
  const passwordBaru = String(req.body?.passwordBaru || "");

  const user = await getUser(session.username);
  if (!(await verifyPassword(passwordLama, user?.passwordHash))) {
    return res.status(400).json({ error: "Password lama tidak sesuai." });
  }
  const masalah = passwordProblem(passwordBaru, user.username);
  if (masalah) return res.status(400).json({ error: masalah });
  if (passwordBaru === passwordLama) {
    return res.status(400).json({ error: "Password baru harus berbeda dari password lama." });
  }

  const updated = await saveUser({
    ...user,
    passwordHash: await hashPassword(passwordBaru),
    wajibGantiPassword: false,
    passwordDiganti: new Date().toISOString(),
  });

  // Semua sesi lama (di perangkat lain) diputus, lalu sesi baru dibuat.
  await revokeUserSessions(user.username);
  await createSession(res, updated);
  await logAudit({ aksi: "ganti_password", oleh: user.username, ip: clientIp(req) });

  res.status(200).json({ ok: true });
});
