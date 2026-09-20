import Head from "next/head";
import { useState } from "react";
import PasswordInput from "../components/PasswordInput";
import AppIcon from "../components/AppIcon";
import { APP_MAP } from "../lib/apps";
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

// Warna tema aplikasi untuk ilustrasi.
const warna = (key) => ({ "--c": APP_MAP[key]?.warna, "--c2": APP_MAP[key]?.warna2 || APP_MAP[key]?.warna });

/** Ilustrasi kolase kartu aplikasi (murni CSS, tanpa gambar). */
function Kolase() {
  return (
    <div className="kolase" aria-hidden="true">
      <div className="k-logo">
        <img src="/logo-rama.png" alt="" />
      </div>

      <div className="k-card k-dms" style={warna("dms")}>
        <div className="k-cover">
          <AppIcon name="dms" size={22} />
          <b>DMS</b>
        </div>
        <div className="k-lines">
          <i style={{ width: "80%" }} />
          <i style={{ width: "64%" }} />
          <i style={{ width: "72%" }} />
        </div>
      </div>

      <div className="k-card k-tte" style={warna("tte")}>
        <div className="k-cover k-cover-lg">
          <span className="k-bar" />
          <b>TTE</b>
          <AppIcon name="tte" size={26} />
        </div>
        <div className="k-doc">
          <div className="k-lines">
            <i style={{ width: "90%" }} />
            <i style={{ width: "76%" }} />
            <i style={{ width: "84%" }} />
            <i style={{ width: "58%" }} />
          </div>
          <div className="k-sign">
            <span className="k-qr">
              <AppIcon name="tte" size={30} />
            </span>
            <span className="k-ok">✓ Disahkan</span>
          </div>
        </div>
      </div>

      <div className="k-card k-emv" style={warna("emv")}>
        <div className="k-mini-icon">
          <AppIcon name="emv" size={20} />
        </div>
        <b>EM Viable</b>
        <span className="k-pill">Memenuhi syarat</span>
      </div>

      <div className="k-chip k-time">
        <span>●</span> 08.15 WIB
      </div>
      <div className="k-chip k-temp" style={warna("emnv")}>
        <AppIcon name="emnv" size={16} /> 22,4 °C
      </div>
      <div className="k-bubble" style={warna("spa")}>
        <AppIcon name="spa" size={26} />
      </div>
    </div>
  );
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
      <main className="lg">
        <section className="lg-left">
          <div className="lg-brand">
            <img src="/logo-rama.png" alt="" />
            <span>Portal REMS</span>
          </div>
          <div className="lg-stage">
            <Kolase />
            <h1 className="lg-title">
              Satu akun
              <br />
              untuk <span>semua</span>
              <br />
              <span>aplikasi</span> kerja.
            </h1>
          </div>
        </section>

        <section className="lg-right">
          <form className="lg-form" onSubmit={onSubmit} noValidate>
            <div className="lg-mobile-brand">
              <img src="/logo-rama.png" alt="" />
              <span>Portal REMS</span>
            </div>
            <h2>Masuk ke Portal REMS</h2>

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <label className="sr-only" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="lg-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              required
            />
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <div className="lg-pw">
              <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
            </div>

            <button className="lg-btn" type="submit" disabled={loading || !username || !password}>
              {loading ? "Memeriksa…" : "Masuk"}
            </button>

            <p className="lg-help">Lupa password? Hubungi admin portal.</p>

            <div className="lg-note">Akun dibuat oleh admin portal. Satu username untuk TTE, DMS, EMV, EMNV, dan SPA.</div>

            <p className="lg-company">
              <img src="/logo-rama.png" alt="" />
              PT. Rama Emerald Multi Sukses
            </p>
          </form>
        </section>
      </main>
    </>
  );
}
