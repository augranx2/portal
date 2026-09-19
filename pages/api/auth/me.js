import { allowMethods, handler } from "../../../lib/http";
import { getSession } from "../../../lib/session";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Belum login", needLogin: true });
  const { sid, ...pub } = session;
  res.status(200).json({ ok: true, ...pub });
});
