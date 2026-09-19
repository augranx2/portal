// Pembantu fetch untuk halaman (berjalan di browser).

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* respons kosong */
  }
  if (res.status === 401 && data.needLogin && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error(data.error || "Sesi berakhir");
  }
  if (!res.ok) throw new Error(data.error || `Gagal (HTTP ${res.status})`);
  return data;
}

export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}

export function formatWaktu(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTanggal(ymd) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00+07:00`);
  return d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });
}
