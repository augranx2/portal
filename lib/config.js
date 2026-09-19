// Pengaturan umum portal. Nilai sensitif diambil dari Environment Variables.

export const PORTAL_NAMA = "Portal REMS";
export const PERUSAHAAN = "PT. Rama Emerald Multi Sukses";

// Nama cookie tiket login. Aplikasi lain membaca cookie dengan nama ini.
export const COOKIE_NAME = "myrama_sso";

export const COOKIE_DOMAIN = (process.env.COOKIE_DOMAIN || "").trim();
export const ALLOWED_REDIRECT_DOMAIN = (process.env.ALLOWED_REDIRECT_DOMAIN || "myrama.id").trim();

export const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);
export const SESSION_IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 60);

// Penanda tiket login: aplikasi lain memeriksa issuer & audience ini.
export const JWT_ISSUER = "portal.myrama";
export const JWT_AUDIENCE = "myrama";

export const IS_PROD = process.env.NODE_ENV === "production";
