import { allowMethods, requireSession, handler } from "../../../lib/http";
import { readTteUsers } from "../../../lib/tte";

// Daftar user TTE untuk pratinjau impor. Hash password tidak ikut dikirim.
export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const session = await requireSession(req, res, { admin: true });
  if (!session) return;
  const users = (await readTteUsers()).map(({ hash, ...rest }) => ({ ...rest, punyaPassword: !!hash }));
  res.status(200).json({ ok: true, users });
});
