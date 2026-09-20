import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "../../components/Topbar";
import AdminTabs from "../../components/AdminTabs";
import { APPS } from "../../lib/apps";
import { api, formatWaktu, formatTanggal } from "../../lib/client";
import { withPage } from "../../lib/guard";

export const getServerSideProps = withPage({ admin: true });

const KOSONG = { username: "", nama: "", status: "Aktif", berlakuSampai: "", admin: false, apps: {} };

function kedaluwarsa(u) {
  if (!u.berlakuSampai) return false;
  return Date.now() > Date.parse(`${u.berlakuSampai}T23:59:59+07:00`);
}

function StatusChips({ user }) {
  return (
    <div className="app-pills">
      {user.status !== "Aktif" ? (
        <span className="chip chip-danger">Nonaktif</span>
      ) : kedaluwarsa(user) ? (
        <span className="chip chip-warn">Masa berlaku habis</span>
      ) : (
        <span className="chip chip-ok">Aktif</span>
      )}
      {user.admin && <span className="chip chip-blue">Admin portal</span>}
      {user.wajibGantiPassword && <span className="chip">Belum ganti password</span>}
      {user.berlakuSampai && !kedaluwarsa(user) && (
        <span className="chip chip-warn">s.d. {formatTanggal(user.berlakuSampai)}</span>
      )}
    </div>
  );
}

function AppPills({ apps }) {
  const keys = APPS.filter((a) => apps?.[a.key]);
  if (keys.length === 0) return <span className="uname">Tanpa akses</span>;
  return (
    <div className="app-pills">
      {keys.map((a) => (
        <span key={a.key} className="app-pill" style={{ "--c": a.warna }} title={apps[a.key].departemen || ""}>
          <b>{a.singkatan}</b>
          {apps[a.key].role}
        </span>
      ))}
    </div>
  );
}

function Rahasia({ label, value }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <div className="field">
      <span className="section-title">{label}</span>
      <div className="secret">
        <span>{value}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setTersalin(true);
            } catch {
              /* browser menolak akses clipboard */
            }
          }}
        >
          {tersalin ? "Tersalin" : "Salin"}
        </button>
      </div>
      <span className="hint">Hanya ditampilkan sekali. User wajib menggantinya saat login pertama.</span>
    </div>
  );
}

function Editor({ mode, awal, session, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ ...KOSONG, ...awal, apps: { ...(awal.apps || {}) } }));
  const [passwordAwal, setPasswordAwal] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [rahasia, setRahasia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [baru, setBaru] = useState(mode === "baru");
  const diriSendiri = !baru && form.username === session.username;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setAkses = (appKey, patch) =>
    setForm((f) => {
      const apps = { ...f.apps };
      const next = { ...(apps[appKey] || { role: "", departemen: "" }), ...patch };
      if (!next.role) delete apps[appKey];
      else apps[appKey] = next;
      return { ...f, apps };
    });

  async function simpan(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const data = await api("/api/admin/users", {
        method: "POST",
        body: { baru, user: form, passwordAwal: baru ? passwordAwal : undefined },
      });
      onSaved(data.user);
      if (baru) {
        // Setelah dibuat, laci beralih ke mode ubah untuk user yang sama.
        setBaru(false);
        setForm((f) => ({ ...f, ...data.user }));
        setPasswordAwal("");
        if (data.passwordAwal) {
          setRahasia({ label: `Password awal untuk ${data.user.username}`, value: data.passwordAwal });
        }
        setInfo(
          data.passwordAwal
            ? "Pengguna dibuat. Berikan password di bawah ini kepada yang bersangkutan."
            : "Pengguna dibuat dengan password awal yang Anda isi."
        );
      } else {
        setInfo(data.sesiDiputus && !diriSendiri ? "Tersimpan. Sesi aktif user ini diakhiri supaya akses baru langsung berlaku." : "Tersimpan.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function aksi(nama, konfirmasi) {
    if (konfirmasi && !window.confirm(konfirmasi)) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const data = await api("/api/admin/user-action", { method: "POST", body: { username: form.username, aksi: nama } });
      if (nama === "reset-password") {
        setRahasia({ label: `Password baru untuk ${form.username}`, value: data.passwordBaru });
        setInfo("Password direset dan semua sesi user ini diakhiri.");
        onSaved({ ...form, wajibGantiPassword: true });
      } else if (nama === "hapus") {
        onSaved(null, form.username);
        onClose();
      } else if (nama === "akhiri-sesi") {
        setInfo("Semua sesi user ini sudah diakhiri. User perlu masuk kembali.");
      } else if (nama === "buka-kunci") {
        setInfo("Penguncian login karena salah password sudah dibuka.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="drawer-back" onClick={onClose} />
      <form className="drawer" role="dialog" aria-modal="true" aria-labelledby="judul-editor" onSubmit={simpan}>
        <div className="drawer-head">
          <h2 id="judul-editor">{baru ? "Tambah pengguna" : form.nama || form.username}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="drawer-body">
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {info && <div className="alert alert-ok" role="status">{info}</div>}
          {rahasia && <Rahasia label={rahasia.label} value={rahasia.value} />}

          <div className="grid-2">
            <div className="field">
              <label htmlFor="f-nama">Nama</label>
              <input id="f-nama" className="input" value={form.nama} onChange={(e) => setField("nama", e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="f-username">Username</label>
              <input
                id="f-username"
                className="input"
                value={form.username}
                onChange={(e) => setField("username", e.target.value.toLowerCase())}
                disabled={!baru}
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="f-status">Status</label>
              <select
                id="f-status"
                className="select"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                disabled={diriSendiri}
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-berlaku">Berlaku sampai</label>
              <input
                id="f-berlaku"
                type="date"
                className="input"
                value={form.berlakuSampai || ""}
                onChange={(e) => setField("berlakuSampai", e.target.value)}
              />
              <span className="hint">Kosongkan bila tanpa batas. Cocok untuk akun auditor.</span>
            </div>
          </div>

          {baru && (
            <div className="field">
              <label htmlFor="f-pw">Password awal</label>
              <input
                id="f-pw"
                className="input"
                value={passwordAwal}
                onChange={(e) => setPasswordAwal(e.target.value)}
                autoComplete="off"
                placeholder="Kosongkan untuk dibuatkan otomatis"
              />
            </div>
          )}

          <label className="check">
            <input
              type="checkbox"
              checked={!!form.admin}
              onChange={(e) => setField("admin", e.target.checked)}
              disabled={diriSendiri}
            />
            <span>
              Admin portal
              <span className="hint" style={{ display: "block" }}>
                Boleh mengelola pengguna dan akses. Terpisah dari role di tiap aplikasi.
              </span>
            </span>
          </label>

          <div className="field">
            <span className="section-title">Akses aplikasi</span>
            <div className="access-list">
              {APPS.map((app) => {
                const akses = form.apps[app.key];
                return (
                  <div key={app.key} className="access-row" style={{ "--c": app.warna, "--c2": app.warna2 || app.warna }}>
                    <span className="app-mark" aria-hidden="true">
                      {app.singkatan}
                    </span>
                    <div className="fields">
                      <label className="app-name" htmlFor={`role-${app.key}`}>
                        {app.nama}
                      </label>
                      <select
                        id={`role-${app.key}`}
                        className="select"
                        value={akses?.role || ""}
                        onChange={(e) => setAkses(app.key, { role: e.target.value })}
                      >
                        <option value="">Tidak ada akses</option>
                        {app.roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {app.pakaiDepartemen && akses?.role && (
                        <input
                          className="input"
                          aria-label={`Departemen ${app.nama}`}
                          placeholder="Departemen (contoh: QC)"
                          value={akses.departemen || ""}
                          onChange={(e) => setAkses(app.key, { departemen: e.target.value })}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!baru && (
            <div className="danger-zone">
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => aksi("reset-password", `Reset password ${form.username}? User wajib membuat password baru saat login.`)}>
                Reset password
              </button>
              {!diriSendiri && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => aksi("akhiri-sesi")}>
                  Akhiri semua sesi
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => aksi("buka-kunci")}>
                Buka kunci login
              </button>
              {!diriSendiri && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={busy}
                  onClick={() => aksi("hapus", `Hapus ${form.nama} (${form.username}) dari portal? Aksi ini tidak bisa dibatalkan.`)}
                >
                  Hapus pengguna
                </button>
              )}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Menyimpan…" : baru ? "Tambah pengguna" : "Simpan perubahan"}
          </button>
        </div>
      </form>
    </>
  );
}

export default function AdminUsers({ session }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [editor, setEditor] = useState(null);

  const muat = useCallback(async () => {
    setError("");
    try {
      const data = await api("/api/admin/users");
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const tampil = useMemo(() => {
    const cari = q.trim().toLowerCase();
    return users.filter((u) => {
      if (cari && !u.nama.toLowerCase().includes(cari) && !u.username.includes(cari)) return false;
      if (!filter) return true;
      if (filter === "_tanpa") return Object.keys(u.apps || {}).length === 0;
      if (filter === "_admin") return u.admin;
      if (filter === "_wajib") return u.wajibGantiPassword;
      if (filter === "_nonaktif") return u.status !== "Aktif" || kedaluwarsa(u);
      return !!u.apps?.[filter];
    });
  }, [users, q, filter]);

  function onSaved(user, dihapus) {
    if (dihapus) return setUsers((list) => list.filter((u) => u.username !== dihapus));
    setUsers((list) => {
      const ada = list.some((u) => u.username === user.username);
      const next = ada ? list.map((u) => (u.username === user.username ? { ...u, ...user } : u)) : [...list, user];
      return next.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    });
  }

  return (
    <>
      <Head>
        <title>Kelola pengguna — Portal REMS</title>
      </Head>
      <Topbar session={session} active="admin" />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Kelola pengguna</h1>
            <p>Satu akun per orang. Akses tiap aplikasi diatur di sini.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setEditor({ mode: "baru", user: KOSONG })}>
            Tambah pengguna
          </button>
        </div>
        <AdminTabs active="users" />

        <div className="toolbar">
          <input
            className="input"
            type="search"
            placeholder="Cari nama atau username"
            aria-label="Cari pengguna"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" aria-label="Saring pengguna" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Semua pengguna</option>
            {APPS.map((a) => (
              <option key={a.key} value={a.key}>
                Punya akses {a.singkatan}
              </option>
            ))}
            <option value="_tanpa">Tanpa akses aplikasi</option>
            <option value="_admin">Admin portal</option>
            <option value="_wajib">Belum ganti password</option>
            <option value="_nonaktif">Nonaktif / masa berlaku habis</option>
          </select>
          <span className="spacer" />
          <span className="uname" style={{ alignSelf: "center" }}>
            {tampil.length} dari {users.length} pengguna
          </span>
        </div>

        {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="panel">
          {loading ? (
            <p className="panel-pad">Memuat pengguna…</p>
          ) : users.length === 0 ? (
            <div className="empty" style={{ border: 0 }}>
              <strong>Belum ada pengguna lain</strong>
              Mulai dari menu Impor dari sheet untuk memindahkan user EMV, EMNV, SPA, dan DMS sekaligus.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl tbl-cards">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Akses aplikasi</th>
                    <th>Status</th>
                    <th>Login terakhir</th>
                    <th>
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((u) => (
                    <tr key={u.username}>
                      <td>
                        <div className="name">{u.nama}</div>
                        <div className="uname">{u.username}</div>
                      </td>
                      <td>
                        <AppPills apps={u.apps} />
                      </td>
                      <td>
                        <StatusChips user={u} />
                      </td>
                      <td className="num">{formatWaktu(u.loginTerakhir)}</td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditor({ mode: "ubah", user: u })}>
                          Ubah
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tampil.length === 0 && (
                    <tr>
                      <td colSpan={5} className="uname">
                        Tidak ada pengguna yang cocok dengan pencarian ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {editor && (
        <Editor
          key={`${editor.mode}-${editor.user.username}`}
          mode={editor.mode}
          awal={editor.user}
          session={session}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
