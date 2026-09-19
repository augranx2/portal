import Head from "next/head";
import { useEffect, useState } from "react";
import PasswordInput from "../components/PasswordInput";

// Halaman sekali pakai untuk membuat admin portal pertama.
export default function Setup() {
  const [tersedia, setTersedia] = useState(null);
  const [form, setForm] = useState({ setupKey: "", nama: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => setTersedia(!!d.tersedia))
      .catch(() => setTersedia(false));
  }, []);

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: typeof v === "string" ? v : v.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Setup gagal.");
      window.location.href = "/admin/impor";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Setup — Portal REMS</title>
      </Head>
      <main className="auth-form-side" style={{ minHeight: "100vh" }}>
        {tersedia === null ? (
          <p>Memeriksa…</p>
        ) : !tersedia ? (
          <div className="auth-card panel panel-pad">
            <h2>Setup sudah selesai</h2>
            <p className="sub">Admin pertama sudah dibuat. Masuk lewat halaman login biasa.</p>
            <a className="btn btn-primary btn-block" href="/login">
              Ke halaman masuk
            </a>
          </div>
        ) : (
          <form className="auth-card panel panel-pad" onSubmit={onSubmit}>
            <div>
              <h2>Buat admin pertama</h2>
              <p className="sub">Halaman ini hanya bisa dipakai sekali. Setelah itu terkunci.</p>
            </div>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <div className="field">
              <label htmlFor="setupKey">Kode setup</label>
              <PasswordInput id="setupKey" value={form.setupKey} onChange={set("setupKey")} autoComplete="off" />
              <span className="hint">Isi SETUP_KEY di Environment Variables Vercel.</span>
            </div>
            <div className="field">
              <label htmlFor="nama">Nama</label>
              <input id="nama" className="input" value={form.nama} onChange={set("nama")} required />
            </div>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                className="input"
                value={form.username}
                onChange={set("username")}
                autoCapitalize="none"
                spellCheck={false}
                required
              />
              <span className="hint">Boleh username yang sudah dipakai di sheet, misalnya admin.</span>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordInput id="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
              <span className="hint">Minimal 8 karakter, berisi huruf dan angka.</span>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Membuat…" : "Buat admin"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
