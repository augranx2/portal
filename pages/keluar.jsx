import Head from "next/head";
import { useEffect } from "react";

// Alamat yang bisa dipanggil tombol "Keluar" di aplikasi lain:
//   https://portal.myrama.id/keluar
export default function Keluar() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      window.location.replace("/login");
    });
  }, []);
  return (
    <>
      <Head>
        <title>Keluar — Portal REMS</title>
      </Head>
      <main className="auth-form-side" style={{ minHeight: "100vh" }}>
        <p>Mengakhiri sesi…</p>
      </main>
    </>
  );
}
