import { useState } from "react";

export default function PasswordInput({ id, value, onChange, autoComplete, required = true, placeholder = "Password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        id={id}
        name={id}
        className="input"
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
      />
      <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-controls={id}>
        {show ? "Sembunyi" : "Lihat"}
      </button>
    </div>
  );
}
