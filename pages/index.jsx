import Head from "next/head";
import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import AppIcon from "../components/AppIcon";
import { APPS } from "../lib/apps";
import { withPage } from "../lib/guard";

export const getServerSideProps = withPage();

function sapaan(date) {
  const jam = Number(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }));
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function Beranda({ session }) {
  const [now, setNow] = useState(null);
  useEffect(() => setNow(new Date()), []);

  // Aplikasi utama (TTE) selalu di urutan pertama, pojok kiri atas.
  const milik = APPS.filter((a) => session.apps?.[a.key]).sort((a, b) => Number(!!b.utama) - Number(!!a.utama));
  const namaDepan = session.nama.split(" ")[0];

  return (
    <>
      <Head>
        <title>Aplikasi — Portal REMS</title>
      </Head>
      <Topbar session={session} active="apps" />
      <main className="page">
        <section className="hero">
          <div className="hero-text">
            <p className="hero-date">
              {now
                ? now.toLocaleDateString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "\u00a0"}
            </p>
            <h1>{now ? `${sapaan(now)}, ${namaDepan}` : `Halo, ${namaDepan}`}</h1>
            <p className="hero-lead">
              {milik.length > 0
                ? `${milik.length} aplikasi tersedia untuk Anda. Pilih aplikasi untuk mulai bekerja.`
                : "Belum ada aplikasi yang terhubung dengan akun Anda."}
            </p>
          </div>
          <div className="hero-ornament" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        {milik.length === 0 ? (
          <div className="empty">
            <strong>Belum ada aplikasi untuk akun ini</strong>
            {session.admin
              ? "Atur akses aplikasi Anda sendiri di menu Kelola pengguna."
              : "Minta admin portal menambahkan akses aplikasi untuk username Anda."}
          </div>
        ) : (
          <>
            <h2 className="section-label">Aplikasi Anda</h2>
            <div className="app-grid">
              {milik.map((app) => {
                const akses = session.apps[app.key];
                return (
                  <a
                    key={app.key}
                    href={app.url}
                    className="app-card"
                    style={{ "--c": app.warna, "--c2": app.warna2 || app.warna }}
                  >
                    <div className="app-cover">
                      {app.utama && <span className="badge-utama">★ Utama</span>}
                      <span className="app-icon">
                        <AppIcon name={app.ikon} size={26} />
                      </span>
                      <span className="app-code">{app.singkatan}</span>
                    </div>
                    <div className="app-info">
                      <h3>{app.nama}</h3>
                      <p>{app.deskripsi}</p>
                      <div className="app-foot">
                        <span className="chip">{akses.role}</span>
                        <span className="app-open">
                          Buka <span aria-hidden="true">→</span>
                        </span>
                      </div>
                      {!app.sso && <span className="app-note">Masih login di aplikasi</span>}
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
