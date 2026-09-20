import Head from "next/head";
import { useState } from "react";
import PasswordInput from "../components/PasswordInput";
import AppIcon from "../components/AppIcon";
import { APPS } from "../lib/apps";
import { getSession } from "../lib/session";
import { safeNext } from "../lib/redirect";

export async function getServerSideProps(ctx) {
  const next = typeof ctx.query.next === "string" ? ctx.query.next : "";
  const session = await getSession(ctx.req);
  if (session) {
    const tujuan = session.wajibGantiPassword ? "/ganti-password" : safeNext(next);
    return { redirect: { destination: tujuan, permanent: false } };
  }
  return { props: { next } };
}

export default function Login({ next }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login gagal.");
      window.location.href = data.wajibGantiPassword
        ? `/ganti-password?next=${encodeURIComponent(data.next || "/")}`
        : data.next || "/";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Masuk — Portal REMS</title>
      </Head>
      <main className="login">
        <div className="login-bg" aria-hidden="true">
          <span className="ring ring-1" />
          <span className="ring ring-2" />
          <span className="ring ring-3" />
          <span className="glow glow-1" />
          <span className="glow glow-2" />
        </div>

        <section className="login-brand">
          <div className="login-logo">
            <img src="/logo-rama.png" alt="Logo PT. Rama Emerald Multi Sukses" />
          </div>
          <p className="login-company">PT. Rama Emerald Multi Sukses</p>
          <h1>Portal REMS</h1>
          <p className="login-lead">
            Satu akun untuk semua aplikasi kerja. Masuk sekali, lalu buka aplikasi sesuai akses Anda.
          </p>
          <ul className="login-apps" aria-label="Aplikasi di portal">
            {APPS.map((a) => (
              <li key={a.key} style={{ "--c": a.warna, "--c2": a.warna2 || a.warna }} title={a.nama}>
                <span className="login-app-icon">
                  <AppIcon name={a.ikon} size={16} />
                </span>
                {a.singkatan}
              </li>
            ))}
          </ul>
        </section>

        <section className="login-panel">
          <form className="login-card" onSubmit={onSubmit} noValidate>
            <div className="login-card-head">
              <h2>Selamat datang</h2>
              <p>Masuk dengan username dan password Anda.</p>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="contoh: qa.nama"
                autoFocus
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
            </div>

            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading || !username || !password}>
              {loading ? "Memeriksa…" : "Masuk"}
            </button>

            <p className="login-help">Lupa password? Hubungi admin portal untuk reset.</p>
          </form>
          <p className="login-copy">© {new Date().getFullYear()} PT. Rama Emerald Multi Sukses</p>
        </section>
      </main>
    </>
  );
}
