import { redis, k, asObject } from "./redis";
import { sanitizeApps } from "./apps";

export const USERNAME_RE = /^[a-z0-9._-]{2,40}$/;
export const STATUS = ["Aktif", "Nonaktif"];

export function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}

export async function getUser(username) {
  const u = normalizeUsername(username);
  if (!u) return null;
  return asObject(await redis().get(k(`user:${u}`)));
}

export async function listUsers() {
  const names = await redis().smembers(k("users"));
  if (!names || names.length === 0) return [];
  const values = await redis().mget(...names.map((n) => k(`user:${n}`)));
  return values.map(asObject).filter(Boolean);
}

export async function saveUser(user) {
  const u = { ...user, username: normalizeUsername(user.username), diubah: new Date().toISOString() };
  await redis().set(k(`user:${u.username}`), u);
  await redis().sadd(k("users"), u.username);
  return u;
}

export async function removeUser(username) {
  const u = normalizeUsername(username);
  await redis().del(k(`user:${u}`));
  await redis().srem(k("users"), u);
}

/** Data user tanpa hash password — aman dikirim ke browser. */
export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

/** Batas akhir masa berlaku (akhir hari, WIB) dalam milidetik, atau null. */
export function berlakuSampaiMs(user) {
  const d = user?.berlakuSampai;
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const ms = Date.parse(`${d}T23:59:59+07:00`);
  return Number.isNaN(ms) ? null : ms;
}

export function isExpired(user) {
  const ms = berlakuSampaiMs(user);
  return ms !== null && Date.now() > ms;
}

export function canLogin(user) {
  return !!user && user.status === "Aktif" && !isExpired(user);
}

/**
 * Validasi isian form user dari admin. Mengembalikan { error } atau { data }.
 */
export function validateUserInput(input, { isNew }) {
  const username = normalizeUsername(input.username);
  if (isNew && !USERNAME_RE.test(username)) {
    return { error: "Username hanya boleh huruf kecil, angka, titik, strip, atau garis bawah (2–40 karakter)." };
  }
  const nama = String(input.nama || "").trim().slice(0, 120);
  if (!nama) return { error: "Nama wajib diisi." };
  const status = STATUS.includes(input.status) ? input.status : "Aktif";
  const berlakuSampai = String(input.berlakuSampai || "").trim();
  if (berlakuSampai && !/^\d{4}-\d{2}-\d{2}$/.test(berlakuSampai)) {
    return { error: "Format tanggal masa berlaku tidak dikenali." };
  }
  return {
    data: {
      username,
      nama,
      status,
      berlakuSampai,
      admin: !!input.admin,
      apps: sanitizeApps(input.apps),
    },
  };
}
