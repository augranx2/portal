import Head from "next/head";
import { useState } from "react";
import PasswordInput from "../components/PasswordInput";
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
      <main className="auth">
        <section className="auth-brand">
          <div className="auth-company">
            <img src="/logo-rama.png" alt="" />
            <span>PT. Rama Emerald Multi Sukses</span>
          </div>
          <div>
            <h1 className="auth-title">Portal REMS</h1>
            <p className="auth-lead">Satu akun untuk semua aplikasi kerja. Masuk sekali, lalu buka aplikasi sesuai akses Anda.</p>
          </div>
          <div className="auth-apps" aria-label="Aplikasi di portal">
            {APPS.map((a) => (
              <span key={a.key} style={{ "--c": a.warna }} title={a.nama}>
                {a.singkatan}
              </span>
            ))}
          </div>
        </section>

        <section className="auth-form-side">
          <form className="auth-card" onSubmit={onSubmit} noValidate>
            <div>
              <h2>Masuk</h2>
              <p className="sub">Gunakan username dan password portal Anda.</p>
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
                autoFocus
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={loading || !username || !password}>
              {loading ? "Memeriksa…" : "Masuk"}
            </button>

            <p className="auth-foot">Lupa password? Hubungi admin portal untuk reset.</p>
          </form>
        </section>
      </main>
    </>
  );
}
