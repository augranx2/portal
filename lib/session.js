import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { redis, k, asObject } from "./redis";
import { getUser, canLogin, berlakuSampaiMs } from "./users";
import {
  COOKIE_NAME,
  COOKIE_DOMAIN,
  SESSION_HOURS,
  SESSION_IDLE_MINUTES,
  JWT_ISSUER,
  JWT_AUDIENCE,
  IS_PROD,
} from "./config";

// ===========================================================================
// TIKET LOGIN (SSO)
// ---------------------------------------------------------------------------
// Setelah login, portal menaruh cookie "myrama_sso" untuk domain .myrama.id.
// Isinya JWT yang ditandatangani dengan SSO_SECRET:
//
//   sub   username
//   sid   id sesi — sesi dianggap sah HANYA jika portal:sess:<sid> masih ada
//         di Redis. Dengan begitu logout, nonaktif akun, dan reset password
//         langsung memutus akses di semua aplikasi.
//   nama  nama lengkap
//   adm   admin portal (true/false)
//   apps  { emv: { role, departemen }, ... } — hanya app yang boleh diakses
//   wgp   wajib ganti password (app lain harus menolak bila true)
// ===========================================================================

function secretKey() {
  const s = process.env.SSO_SECRET || "";
  if (s.length < 32) throw new Error("SSO_SECRET belum diisi atau kurang dari 32 karakter");
  return new TextEncoder().encode(s);
}

const idleSeconds = () => Math.max(5, SESSION_IDLE_MINUTES) * 60;

function cookieString(value, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (IS_PROD) parts.push("Secure");
  if (COOKIE_DOMAIN) parts.push(`Domain=${COOKIE_DOMAIN}`);
  return parts.join("; ");
}

function appendCookie(res, cookie) {
  const prev = res.getHeader("Set-Cookie");
  const list = prev ? (Array.isArray(prev) ? prev : [String(prev)]) : [];
  res.setHeader("Set-Cookie", [...list, cookie]);
}

function readCookie(req) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return null;
}

/** Membuat sesi baru + cookie tiket login untuk user. */
export async function createSession(res, user) {
  const sid = randomUUID();
  const now = Date.now();
  let expMs = now + Math.max(1, SESSION_HOURS) * 3600 * 1000;
  const batas = berlakuSampaiMs(user);
  if (batas !== null) expMs = Math.min(expMs, batas);
  const maxAge = Math.max(60, Math.floor((expMs - now) / 1000));

  await redis().set(
    k(`sess:${sid}`),
    { username: user.username, dibuat: new Date(now).toISOString(), habis: new Date(expMs).toISOString() },
    { ex: Math.min(idleSeconds(), maxAge) }
  );
  await redis().sadd(k(`usersess:${user.username}`), sid);
  await redis().expire(k(`usersess:${user.username}`), Math.max(1, SESSION_HOURS) * 3600 + 3600);

  const token = await new SignJWT({
    sid,
    nama: user.nama,
    adm: !!user.admin,
    apps: user.apps || {},
    wgp: !!user.wajibGantiPassword,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.username)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(expMs / 1000))
    .sign(secretKey());

  appendCookie(res, cookieString(token, maxAge));
  return sid;
}

export function clearSessionCookie(res) {
  appendCookie(res, cookieString("", 0));
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Sesi yang sedang login, dengan data user TERBARU dari Redis, atau null.
 * Setiap pemanggilan yang berhasil memperpanjang batas diam sesi.
 */
export async function getSession(req) {
  const token = readCookie(req);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.sid || !payload?.sub) return null;

  const sess = asObject(await redis().get(k(`sess:${payload.sid}`)));
  if (!sess || sess.username !== payload.sub) return null;

  const user = await getUser(payload.sub);
  if (!canLogin(user)) {
    await revokeUserSessions(payload.sub);
    return null;
  }

  const sisa = Math.floor((payload.exp * 1000 - Date.now()) / 1000);
  if (sisa > 0) await redis().expire(k(`sess:${payload.sid}`), Math.min(idleSeconds(), sisa));

  return {
    sid: payload.sid,
    username: user.username,
    nama: user.nama,
    admin: !!user.admin,
    apps: user.apps || {},
    wajibGantiPassword: !!user.wajibGantiPassword,
  };
}

/** Logout dari sesi ini saja. */
export async function destroySession(req, res) {
  const token = readCookie(req);
  const payload = token ? await verifyToken(token) : null;
  if (payload?.sid) {
    await redis().del(k(`sess:${payload.sid}`));
    if (payload.sub) await redis().srem(k(`usersess:${payload.sub}`), payload.sid);
  }
  clearSessionCookie(res);
  return payload?.sub || null;
}

/** Memutus SEMUA sesi user di semua perangkat & aplikasi. */
export async function revokeUserSessions(username) {
  const setKey = k(`usersess:${username}`);
  const sids = (await redis().smembers(setKey)) || [];
  if (sids.length) await redis().del(...sids.map((s) => k(`sess:${s}`)));
  await redis().del(setKey);
}
