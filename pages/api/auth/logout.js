import { allowMethods, sameOrigin, clientIp, handler } from "../../../lib/http";
import { destroySession } from "../../../lib/session";
import { logAudit } from "../../../lib/audit";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!sameOrigin(req, res)) return;
  const username = await destroySession(req, res);
  if (username) await logAudit({ aksi: "logout", oleh: username, ip: clientIp(req) });
  res.status(200).json({ ok: true });
});
