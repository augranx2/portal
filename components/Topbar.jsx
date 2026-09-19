import Link from "next/link";
import { useState } from "react";
import { logout } from "../lib/client";

export default function Topbar({ session, active }) {
  const [open, setOpen] = useState(false);
  const [keluar, setKeluar] = useState(false);

  async function onLogout() {
    setKeluar(true);
    await logout();
  }

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          <img src="/logo-rama.png" alt="" />
          <span>Portal REMS</span>
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm menu-btn"
          aria-expanded={open}
          aria-controls="nav-utama"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        <nav id="nav-utama" className={`nav${open ? " open" : ""}`}>
          <Link href="/" aria-current={active === "apps" ? "page" : undefined}>
            Aplikasi
          </Link>
          {session?.admin && (
            <Link href="/admin" aria-current={active === "admin" ? "page" : undefined}>
              Kelola pengguna
            </Link>
          )}
          <Link href="/ganti-password" aria-current={active === "password" ? "page" : undefined}>
            Ganti password
          </Link>
          <button type="button" onClick={onLogout} disabled={keluar}>
            {keluar ? "Keluar…" : "Keluar"}
          </button>
          {session && <span className="who">{session.nama}</span>}
        </nav>
      </div>
    </header>
  );
}
