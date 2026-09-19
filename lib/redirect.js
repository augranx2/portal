import { ALLOWED_REDIRECT_DOMAIN } from "./config";

/**
 * Tujuan setelah login (?next=...). Hanya halaman portal sendiri atau
 * subdomain myrama.id yang diizinkan, supaya link login tidak bisa dipakai
 * untuk mengarahkan orang ke situs palsu.
 */
export function safeNext(next) {
  const value = String(next || "").trim();
  if (!value) return "/";
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const okHost = host === ALLOWED_REDIRECT_DOMAIN || host.endsWith(`.${ALLOWED_REDIRECT_DOMAIN}`);
    return okHost && url.protocol === "https:" ? url.toString() : "/";
  } catch {
    return "/";
  }
}
