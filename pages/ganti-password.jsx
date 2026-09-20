import Head from "next/head";
import { useState } from "react";
import Topbar from "../components/Topbar";
import PasswordInput from "../components/PasswordInput";
import { api } from "../lib/client";
import { withPage } from "../lib/guard";
import { safeNext } from "../lib/redirect";

export const getServerSideProps = withPage({ allowWajibGanti: true });

export default function GantiPassword({ session }) {
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState(false);
  const [loading, setLoading] = useState(false);
  const wajib = session.wajibGantiPassword;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (baru !== ulang) return setError("Ulangi password baru belum sama.");
    setLoading(true);
    try {
      await api("/api/auth/change-password", { method: "POST", body: { passwordLama: lama, passwordBaru: baru } });
      setSukses(true);
      setLama("");
      setBaru("");
      setUlang("");
      if (wajib) {
        const next = safeNext(new URLSearchParams(window.location.search).get("next"));
        setTimeout(() => (window.location.href = next), 900);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Ganti password — Portal REMS</title>
      </Head>
      {!wajib && <Topbar session={session} active="password" />}
      <main className={wajib ? "auth-form-side" : "page"} style={wajib ? { minHeight: "100vh" } : undefined}>
        <form className="auth-card panel panel-pad" onSubmit={onSubmit} style={{ maxWidth: 440 }}>
          <div>
            <h2>{wajib ? "Buat password Anda" : "Ganti password"}</h2>
            <p className="sub">
              {wajib
                ? `Halo ${session.nama}. Anda masih memakai password awal dari admin. Buat password sendiri sebelum melanjutkan.`
                : "Password baru berlaku untuk semua aplikasi di portal."}
            </p>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {sukses && (
            <div className="alert alert-ok" role="status">
              Password berhasil diganti.{wajib ? " Membuka portal…" : ""}
            </div>
          )}

          <div className="field">
            <label htmlFor="lama">{wajib ? "Password awal" : "Password lama"}</label>
            <PasswordInput id="lama" value={lama} onChange={setLama} autoComplete="current-password" />
          </div>
          <div className="field">
            <label htmlFor="baru">Password baru</label>
            <PasswordInput id="baru" value={baru} onChange={setBaru} autoComplete="new-password" />
            <span className="hint">Minimal 6 karakter.</span>
          </div>
          <div className="field">
            <label htmlFor="ulang">Ulangi password baru</label>
            <PasswordInput id="ulang" value={ulang} onChange={setUlang} autoComplete="new-password" />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading || !lama || !baru || !ulang}>
            {loading ? "Menyimpan…" : "Simpan password"}
          </button>
          {wajib && (
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
            >
              Keluar
            </button>
          )}
        </form>
      </main>
    </>
  );
}
