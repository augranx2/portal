import { allowMethods, sameOrigin, clientIp, handler } from "../../../lib/http";
import { getUser, saveUser, normalizeUsername, isExpired } from "../../../lib/users";
import { verifyPassword } from "../../../lib/password";
import { createSession } from "../../../lib/session";
import { isBlocked, registerFailure, clearFailures, LIMIT_USER, LIMIT_IP } from "../../../lib/ratelimit";
import { logAudit } from "../../../lib/audit";
import { safeNext } from "../../../lib/redirect";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!sameOrigin(req, res)) return;

  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const ip = clientIp(req);

  if (!username || !password) {
    return res.status(400).json({ error: "Isi username dan password." });
  }

  if ((await isBlocked(`u:${username}`, LIMIT_USER)) || (await isBlocked(`ip:${ip}`, LIMIT_IP))) {
    return res.status(429).json({
      error: "Terlalu banyak percobaan gagal. Akun dikunci sementara, coba lagi dalam 15 menit.",
    });
  }

  const user = await getUser(username);
  const ok = await verifyPassword(password, user?.passwordHash);

  if (!user || !ok) {
    await registerFailure(`u:${username}`);
    await registerFailure(`ip:${ip}`);
    await logAudit({ aksi: "login_gagal", target: username, ip });
    return res.status(401).json({ error: "Username atau password salah." });
  }

  if (user.status !== "Aktif") {
    await logAudit({ aksi: "login_ditolak", target: username, detail: "akun nonaktif", ip });
    return res.status(403).json({ error: "Akun ini sedang nonaktif. Hubungi admin portal." });
  }
  if (isExpired(user)) {
    await logAudit({ aksi: "login_ditolak", target: username, detail: "masa berlaku habis", ip });
    return res.status(403).json({ error: "Masa berlaku akun ini sudah habis. Hubungi admin portal." });
  }

  await clearFailures(`u:${username}`);
  await createSession(res, user);
  await saveUser({ ...user, loginTerakhir: new Date().toISOString() });
  await logAudit({ aksi: "login", oleh: username, ip });

  res.status(200).json({
    ok: true,
    wajibGantiPassword: !!user.wajibGantiPassword,
    next: safeNext(req.body?.next),
  });
});
