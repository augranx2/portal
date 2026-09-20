// Ikon garis sederhana untuk tiap aplikasi (warna mengikuti currentColor).

const PATHS = {
  // TTE: kode QR
  tte: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </>
  ),
  // DMS: dokumen
  dms: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6M9 9h2" />
    </>
  ),
  // EMV: cawan petri dengan koloni
  emv: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1.6" />
      <circle cx="14.5" cy="9" r="1" />
      <circle cx="13.5" cy="14.5" r="2" />
      <circle cx="8.5" cy="15" r="0.8" />
    </>
  ),
  // EMNV: termometer
  emnv: (
    <>
      <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z" />
      <path d="M12 9v7" />
    </>
  ),
  // SPA: tetes air
  spa: (
    <>
      <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" />
      <path d="M9 14.5a3 3 0 0 0 3 3" />
    </>
  ),
};

export default function AppIcon({ name, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || <rect x="4" y="4" width="16" height="16" rx="4" />}
    </svg>
  );
}
