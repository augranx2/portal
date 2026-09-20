import Head from "next/head";
import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
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

  // Aplikasi utama (TTE) selalu di urutan pertama.
  const milik = APPS.filter((a) => session.apps?.[a.key]).sort((a, b) => Number(!!b.utama) - Number(!!a.utama));
  const namaDepan = session.nama.split(" ")[0];

  return (
    <>
      <Head>
        <title>Aplikasi — Portal REMS</title>
      </Head>
      <Topbar session={session} active="apps" />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>{now ? `${sapaan(now)}, ${namaDepan}` : `Halo, ${namaDepan}`}</h1>
            <p>
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
          </div>
        </div>

        {milik.length === 0 ? (
          <div className="empty">
            <strong>Belum ada aplikasi untuk akun ini</strong>
            {session.admin
              ? "Atur akses aplikasi Anda sendiri di menu Kelola pengguna."
              : "Minta admin portal menambahkan akses aplikasi untuk username Anda."}
          </div>
        ) : (
          <div className="apps-grid">
            {milik.map((app) => {
              const akses = session.apps[app.key];
              return (
                <a
                  key={app.key}
                  href={app.url}
                  className={`app-tile${app.utama ? " app-tile-utama" : ""}`}
                  style={{ "--c": app.warna }}
                >
                  <span className="app-mark" aria-hidden="true">
                    {app.singkatan}
                  </span>
                  <div className="app-body">
                    <h2>{app.nama}</h2>
                    <p>{app.deskripsi}</p>
                    <div className="app-meta">
                      <span className="chip">Peran: {akses.role}</span>
                      {!app.sso && <span className="chip chip-warn">Login di aplikasi</span>}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
