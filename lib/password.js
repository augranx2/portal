import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const ROUNDS = 10;

export function hashPassword(password) {
  return bcrypt.hash(String(password), ROUNDS);
}

// Hash pengganti saat username tidak ditemukan, supaya waktu respons tetap
// sama dan orang luar tidak bisa menebak username mana yang terdaftar.
let dummyHash = null;

export async function verifyPassword(password, hash) {
  if (!hash) {
    if (!dummyHash) dummyHash = bcrypt.hashSync("password-pengganti", ROUNDS);
    await bcrypt.compare(String(password || ""), dummyHash);
    return false;
  }
  return bcrypt.compare(String(password || ""), hash);
}

/** Mengembalikan pesan kesalahan, atau null bila password layak dipakai. */
export function passwordProblem(password, username) {
  const p = String(password || "");
  if (p.length < 8) return "Password minimal 8 karakter.";
  if (p.length > 72) return "Password maksimal 72 karakter.";
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return "Password harus berisi huruf dan angka.";
  if (username && p.toLowerCase() === String(username).toLowerCase()) {
    return "Password tidak boleh sama dengan username.";
  }
  return null;
}

// Tanpa huruf yang mudah tertukar (0/O, 1/l/I).
const HURUF = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const ANGKA = "23456789";

export function generatePassword(length = 10) {
  const all = HURUF + ANGKA;
  const chars = [HURUF[randomInt(HURUF.length)], ANGKA[randomInt(ANGKA.length)]];
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
