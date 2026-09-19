import Link from "next/link";

const TABS = [
  { href: "/admin", key: "users", label: "Pengguna" },
  { href: "/admin/impor", key: "impor", label: "Impor dari sheet" },
  { href: "/admin/log", key: "log", label: "Log aktivitas" },
];

export default function AdminTabs({ active }) {
  return (
    <nav className="tabs" aria-label="Menu admin">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} aria-current={active === t.key ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
