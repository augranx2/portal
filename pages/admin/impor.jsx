import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import Topbar from "../../components/Topbar";
import AdminTabs from "../../components/AdminTabs";
import { APPS, APP_MAP } from "../../lib/apps";
import { api } from "../../lib/client";
import { withPage } from "../../lib/guard";

export const getServerSideProps = withPage({ admin: true });

// Sumber user. TTE dibaca langsung dari database TTE (hanya baca);
// yang lain dari CSV tab user di Google Sheets.
const SUMBER = [
  { key: "tte", sheet: "Diambil langsung dari database TTE", langsung: true },
  { key: "dms", sheet: "DMS - Database, tab Users" },
  { key: "emv", sheet: "EM Viable - Data QA REMS, tab User_Roles" },
  { key: "emnv", sheet: "EM Non Viable - Database, tab User_Roles" },
  { key: "spa", sheet: "SPA Pengkajian Database, tab User_Roles" },
];

/** Parser CSV sederhana: mendukung tanda kutip, "" di dalam kutip, dan baris baru di dalam sel. */
function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
}

/**
 * Mengambil kolom Nama, Role, Departemen, Username, Status saja.
 * Kolom PasswordBaru / PasswordHash / Salt sengaja diabaikan dan tidak
 * pernah dikirim ke server.
 */
function bacaSheet(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("File kosong atau hanya berisi judul kolom.");
  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const idx = (nama) => header.indexOf(nama);
  const iUser = idx("username");
  const iRole = idx("role");
  if (iUser < 0 || iRole < 0) {
    throw new Error("Kolom Username dan Role tidak ditemukan. Pastikan yang diunduh adalah tab user.");
  }
  const iNama = idx("nama");
  const iDept = idx("departemen");
  const iStatus = idx("status");
  return rows.slice(1).map((r) => ({
    username: String(r[iUser] || "").trim().toLowerCase(),
    nama: iNama >= 0 ? String(r[iNama] || "").trim() : "",
    role: String(r[iRole] || "").trim(),
    departemen: iDept >= 0 ? String(r[iDept] || "").trim() : "",
    status: iStatus >= 0 ? String(r[iStatus] || "").trim() : "",
  }));
}

function gabungkan(sheets) {
  const map = new Map();
  const catatan = [];
  for (const { key } of SUMBER) {
    const baris = sheets[key]?.rows;
    if (!baris) continue;
    const app = APP_MAP[key];
    for (const r of baris) {
      if (!r.username) {
        if (r.nama) catatan.push(`${app.singkatan}: baris "${r.nama}" tidak punya username, dilewati.`);
        continue;
      }
      if (!map.has(r.username)) map.set(r.username, { username: r.username, nama: "", apps: {} });
      const u = map.get(r.username);
      if (r.nama.length > u.nama.length) u.nama = r.nama;
      if (r.status && r.status.toLowerCase() === "nonaktif") {
        catatan.push(`${app.singkatan}: ${r.username} berstatus Nonaktif, akses ${app.singkatan} tidak diberikan.`);
        continue;
      }
      if (!app.roles.includes(r.role)) {
        catatan.push(`${app.singkatan}: role "${r.role || "(kosong)"}" milik ${r.username} tidak dikenali, akses ${app.singkatan} dilewati.`);
        continue;
      }
      u.apps[key] = { role: r.role, departemen: app.pakaiDepartemen ? r.departemen : "" };
    }
  }
  for (const u of map.values()) {
    if (Object.keys(u.apps).length === 0) {
      catatan.push(`${u.username}: tidak punya akses yang valid di sheet mana pun, tidak diimpor.`);
      map.delete(u.username);
    }
  }
  const users = [...map.values()].sort((a, b) => (a.nama || a.username).localeCompare(b.nama || b.username, "id"));
  return { users, catatan };
}

function acak() {
  const huruf = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const angka = "23456789";
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  const semua = huruf + angka;
  let s = huruf[buf[0] % huruf.length] + angka[buf[1] % angka.length];
  for (let i = 2; i < 10; i++) s += semua[buf[i] % semua.length];
  return s;
}

export default function Impor({ session }) {
  const [sheets, setSheets] = useState({});
  const [existing, setExisting] = useState(null);
  const [passwordAwal, setPasswordAwal] = useState("");
  const [timpa, setTimpa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasil, setHasil] = useState(null);
  const [pakaiPasswordTte, setPakaiPasswordTte] = useState(false);
  const [ambilTte, setAmbilTte] = useState(false);

  useEffect(() => {
    api("/api/admin/users")
      .then((d) => setExisting(new Set(d.users.map((u) => u.username))))
      .catch((err) => setError(err.message));
  }, []);

  function onFile(key, file) {
    if (!file) return;
    setHasil(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = bacaSheet(String(reader.result || ""));
        setSheets((s) => ({ ...s, [key]: { nama: file.name, rows } }));
      } catch (err) {
        setSheets((s) => ({ ...s, [key]: { nama: file.name, error: err.message } }));
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function muatTte() {
    setAmbilTte(true);
    setHasil(null);
    try {
      const d = await api("/api/admin/tte-users");
      const rows = d.users.map((u) => ({
        username: u.username,
        nama: u.nama,
        role: u.role,
        departemen: u.departemen,
        status: u.aktif ? "Aktif" : "Nonaktif",
        punyaPassword: u.punyaPassword,
      }));
      setSheets((s) => ({ ...s, tte: { nama: "Database TTE", rows } }));
    } catch (err) {
      setSheets((s) => ({ ...s, tte: { nama: "Database TTE", error: err.message } }));
    } finally {
      setAmbilTte(false);
    }
  }

  const { users, catatan: catatanGabung } = useMemo(() => gabungkan(sheets), [sheets]);
  const catatan = useMemo(() => {
    const extra = [];
    const tte = sheets.tte?.rows || [];
    for (const bawaan of ["admin", "dev"]) {
      if (tte.some((r) => r.username === bawaan)) {
        extra.push(
          `TTE: akun bawaan "${bawaan}" ikut terbaca. Pastikan password-nya sudah bukan password bawaan, terutama bila memakai password TTE. Hapus aksesnya di portal bila akun ini tidak dipakai.`
        );
      }
    }
    return [...extra, ...catatanGabung];
  }, [sheets, catatanGabung]);
  const adaFile = Object.values(sheets).some((s) => s.rows);
  const jumlahBaru = existing ? users.filter((u) => !existing.has(u.username)).length : 0;

  async function impor() {
    setError("");
    if (!window.confirm(`Impor ${users.length} pengguna ke portal?`)) return;
    setBusy(true);
    try {
      const data = await api("/api/admin/import", {
        method: "POST",
        body: { users, passwordAwal, timpaAkses: timpa, pakaiPasswordTte: !!sheets.tte?.rows && pakaiPasswordTte },
      });
      setHasil(data);
      const d = await api("/api/admin/users");
      setExisting(new Set(d.users.map((u) => u.username)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Impor dari sheet — Portal REMS</title>
      </Head>
      <Topbar session={session} active="admin" />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Impor dari sheet</h1>
            <p>Gabungkan user TTE, DMS, EMV, EMNV, dan SPA menjadi satu akun per username.</p>
          </div>
        </div>
        <AdminTabs active="impor" />

        <div className="steps">
          <section className="panel panel-pad step">
            <h2>1. Ambil user TTE dan unggah CSV aplikasi lain</h2>
            <p>
              User TTE diambil langsung dari database TTE tanpa mengubah apa pun di TTE. Untuk aplikasi lain, buka
              spreadsheet, pilih tab user, lalu File, Download, Comma Separated Values (.csv). File dibaca di browser
              ini saja; kolom password, hash, dan salt tidak dikirim ke server. Hapus file CSV setelah impor selesai.
            </p>
            <div className="upload-grid">
              {SUMBER.map(({ key, sheet, langsung }) => {
                const app = APP_MAP[key];
                const s = sheets[key];
                if (langsung) {
                  return (
                    <div key={key} className="upload" style={{ "--c": app.warna }}>
                      <span className="t">{app.nama}</span>
                      <span className="s">{sheet}</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={muatTte} disabled={ambilTte}>
                        {ambilTte ? "Mengambil…" : s?.rows ? "Ambil ulang" : "Ambil user TTE"}
                      </button>
                      {s?.error && <span className="s" style={{ color: "var(--danger)" }}>{s.error}</span>}
                      {s?.rows && <span className="s" style={{ color: "var(--ok)" }}>{s.rows.length} user terbaca</span>}
                    </div>
                  );
                }
                return (
                  <label key={key} className="upload" style={{ "--c": app.warna }}>
                    <span className="t">{app.nama}</span>
                    <span className="s">{sheet}</span>
                    <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(key, e.target.files?.[0])} />
                    {s?.error && <span className="s" style={{ color: "var(--danger)" }}>{s.error}</span>}
                    {s?.rows && <span className="s" style={{ color: "var(--ok)" }}>{s.rows.length} baris terbaca</span>}
                  </label>
                );
              })}
            </div>
          </section>

          {adaFile && (
            <section className="panel panel-pad step">
              <h2>2. Periksa hasil penggabungan</h2>
              <p>Nama terpanjang dari semua sheet dipakai sebagai nama akun. Semua bisa diubah lagi di menu Pengguna.</p>
              <div className="stat-row">
                <span className="chip chip-blue">{users.length} pengguna</span>
                {existing && <span className="chip chip-ok">{jumlahBaru} akun baru</span>}
                {existing && <span className="chip">{users.length - jumlahBaru} sudah ada di portal</span>}
              </div>
              {catatan.length > 0 && (
                <div className="alert alert-warn" style={{ marginBottom: 12 }}>
                  <strong>Perlu dicek:</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {catatan.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: 10 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Pengguna</th>
                      {SUMBER.map(({ key }) => (
                        <th key={key}>{APP_MAP[key].singkatan}</th>
                      ))}
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.username}>
                        <td>
                          <div className="name">{u.nama || "(tanpa nama)"}</div>
                          <div className="uname">{u.username}</div>
                        </td>
                        {SUMBER.map(({ key }) => (
                          <td key={key}>
                            {u.apps[key] ? (
                              <>
                                {u.apps[key].role}
                                {u.apps[key].departemen && <div className="uname">{u.apps[key].departemen}</div>}
                              </>
                            ) : (
                              <span className="uname">–</span>
                            )}
                          </td>
                        ))}
                        <td>
                          {existing?.has(u.username) ? (
                            <span className="chip">Sudah ada</span>
                          ) : (
                            <span className="chip chip-ok">Baru</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {adaFile && users.length > 0 && (
            <section className="panel panel-pad step">
              <h2>3. Tentukan password awal lalu impor</h2>
              <p>
                Semua akun baru memakai password awal ini dan wajib menggantinya saat login pertama. Akun yang sudah ada
                di portal tidak berubah password-nya.
              </p>
              <div style={{ display: "grid", gap: 14, maxWidth: 460 }}>
                <div className="field">
                  <label htmlFor="pw-awal">Password awal</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      id="pw-awal"
                      className="input"
                      value={passwordAwal}
                      onChange={(e) => setPasswordAwal(e.target.value)}
                      autoComplete="off"
                    />
                    <button type="button" className="btn btn-ghost" onClick={() => setPasswordAwal(acak())}>
                      Buat acak
                    </button>
                  </div>
                  <span className="hint">Minimal 8 karakter, berisi huruf dan angka. Catat sebelum mengimpor.</span>
                </div>
                {sheets.tte?.rows && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={pakaiPasswordTte}
                      onChange={(e) => setPakaiPasswordTte(e.target.checked)}
                    />
                    <span>
                      Pengguna TTE memakai password TTE-nya
                      <span className="hint" style={{ display: "block" }}>
                        Yang sudah punya akun TTE aktif tidak perlu password baru: login portal memakai password TTE
                        yang biasa dipakai. Pengguna lain tetap memakai password awal di atas.
                      </span>
                    </span>
                  </label>
                )}
                <label className="check">
                  <input type="checkbox" checked={timpa} onChange={(e) => setTimpa(e.target.checked)} />
                  <span>
                    Timpa akses yang sudah ada
                    <span className="hint" style={{ display: "block" }}>
                      Bila tidak dicentang, hanya akses aplikasi yang belum ada yang ditambahkan.
                    </span>
                  </span>
                </label>

                {error && <div className="alert alert-error" role="alert">{error}</div>}
                {hasil && (
                  <div className="alert alert-ok" role="status">
                    Impor selesai: {hasil.dibuat.length} akun dibuat, {hasil.diperbarui.length} diperbarui,{" "}
                    {hasil.dilewati.length} tidak berubah.
                    {hasil.passwordTte?.length > 0 && ` ${hasil.passwordTte.length} akun memakai password TTE.`}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !passwordAwal || !existing}
                  onClick={impor}
                >
                  {busy ? "Mengimpor…" : `Impor ${users.length} pengguna`}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
