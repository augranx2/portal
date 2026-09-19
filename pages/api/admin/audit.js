import { allowMethods, requireSession, handler } from "../../../lib/http";
import { listAudit } from "../../../lib/audit";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const session = await requireSession(req, res, { admin: true });
  if (!session) return;
  res.status(200).json({ ok: true, log: await listAudit(req.query.limit) });
});
