import { getSession } from "./session";

export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ error: "Metode tidak diizinkan" });
  return false;
}

/**
 * Menolak permintaan yang mengubah data bila datang dari situs lain.
 * Browser selalu mengirim header Origin pada fetch POST.
 */
export function sameOrigin(req, res) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (origin) {
    try {
      if (new URL(origin).host === host) return true;
    } catch {
      /* jatuh ke penolakan */
    }
  } else if (req.headers["sec-fetch-site"] === "same-origin") {
    return true;
  }
  res.status(403).json({ error: "Permintaan ditolak" });
  return false;
}

export function clientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "");
  return (fwd.split(",")[0] || req.socket?.remoteAddress || "").trim();
}

/**
 * Memastikan ada sesi login. Opsi:
 *   admin: true              — hanya admin portal
 *   allowWajibGanti: true    — boleh walau belum ganti password awal
 */
export async function requireSession(req, res, { admin = false, allowWajibGanti = false } = {}) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Sesi berakhir. Silakan masuk kembali.", needLogin: true });
    return null;
  }
  if (session.wajibGantiPassword && !allowWajibGanti) {
    res.status(403).json({ error: "Ganti password awal Anda terlebih dahulu.", wajibGantiPassword: true });
    return null;
  }
  if (admin && !session.admin) {
    res.status(403).json({ error: "Halaman ini khusus admin portal." });
    return null;
  }
  return session;
}

/** Pembungkus supaya error tak terduga tetap dijawab JSON yang jelas. */
export function handler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: "Terjadi kesalahan di server. Coba lagi." });
    }
  };
}
