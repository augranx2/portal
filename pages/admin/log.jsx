import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import Topbar from "../../components/Topbar";
import AdminTabs from "../../components/AdminTabs";
import { api, formatWaktu } from "../../lib/client";
import { withPage } from "../../lib/guard";

export const getServerSideProps = withPage({ admin: true });

const LABEL = {
  login: "Masuk",
  login_gagal: "Gagal masuk",
  login_ditolak: "Masuk ditolak",
  logout: "Keluar",
  ganti_password: "Ganti password",
  reset_password: "Reset password",
  user_dibuat: "Pengguna dibuat",
  user_diubah: "Pengguna diubah",
  user_dihapus: "Pengguna dihapus",
  sesi_diakhiri: "Sesi diakhiri",
  kunci_dibuka: "Kunci login dibuka",
  impor_user: "Impor pengguna",
  setup_admin: "Admin pertama dibuat",
  setup_gagal: "Setup gagal",
};

const PERINGATAN = new Set(["login_gagal", "login_ditolak", "setup_gagal", "user_dihapus"]);

export default function Log({ session }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");

  useEffect(() => {
    api("/api/admin/audit?limit=1000")
      .then((d) => setLog(d.log))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const tampil = useMemo(() => {
    const cari = q.trim().toLowerCase();
    return log.filter((e) => {
      if (jenis && e.aksi !== jenis) return false;
      if (!cari) return true;
      return [e.oleh, e.target, e.detail, e.ip].some((v) => String(v || "").toLowerCase().includes(cari));
    });
  }, [log, q, jenis]);

  return (
    <>
      <Head>
        <title>Log aktivitas — Portal REMS</title>
      </Head>
      <Topbar session={session} active="admin" />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Log aktivitas</h1>
            <p>Catatan login dan perubahan akun, 1000 kejadian terakhir.</p>
          </div>
        </div>
        <AdminTabs active="log" />

        <div className="toolbar">
          <input
            className="input"
            type="search"
            placeholder="Cari username, detail, atau IP"
            aria-label="Cari log"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" aria-label="Jenis aktivitas" value={jenis} onChange={(e) => setJenis(e.target.value)}>
            <option value="">Semua aktivitas</option>
            {Object.entries(LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="panel">
          {loading ? (
            <p className="panel-pad">Memuat log…</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl tbl-cards">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Aktivitas</th>
                    <th>Oleh</th>
                    <th>Pengguna terkait</th>
                    <th>Detail</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((e, i) => (
                    <tr key={`${e.waktu}-${i}`}>
                      <td className="num">{formatWaktu(e.waktu)}</td>
                      <td>
                        <span className={`chip${PERINGATAN.has(e.aksi) ? " chip-danger" : ""}`}>{LABEL[e.aksi] || e.aksi}</span>
                      </td>
                      <td>{e.oleh || "–"}</td>
                      <td>{e.target || "–"}</td>
                      <td>{e.detail || "–"}</td>
                      <td className="uname">{e.ip || "–"}</td>
                    </tr>
                  ))}
                  {tampil.length === 0 && (
                    <tr>
                      <td colSpan={6} className="uname">
                        Belum ada aktivitas yang cocok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
