import { redis, k } from "./redis";

// Kunci sementara setelah terlalu banyak percobaan login gagal.
export const LIMIT_USER = 5; // per username
export const LIMIT_IP = 30; // per alamat IP
export const WINDOW_SECONDS = 15 * 60;

export async function isBlocked(key, max) {
  const v = await redis().get(k(`rl:${key}`));
  return Number(v || 0) >= max;
}

export async function registerFailure(key) {
  const n = await redis().incr(k(`rl:${key}`));
  if (n === 1) await redis().expire(k(`rl:${key}`), WINDOW_SECONDS);
  return n;
}

export async function clearFailures(key) {
  await redis().del(k(`rl:${key}`));
}
