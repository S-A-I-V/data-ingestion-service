import { useState } from "react";

interface Props {
  icon: string;
  size?: number;
  label?: string;
}

/** Generic database SVG icon used when no brand logo is available or image fails to load. */
function GenericDbSvg({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5.5" rx="8" ry="3.5" fill="#6366f1" opacity="0.15" />
      <ellipse cx="12" cy="5.5" rx="8" ry="3.5" stroke="#6366f1" strokeWidth="1.5" fill="none" />
      <path d="M4 5.5v5c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-5" stroke="#6366f1" strokeWidth="1.5" fill="none" />
      <path d="M4 10.5v5c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-5" stroke="#6366f1" strokeWidth="1.5" fill="none" />
      <ellipse cx="12" cy="10.5" rx="8" ry="3.5" stroke="#6366f1" strokeWidth="1.5" fill="none" opacity="0.4" />
    </svg>
  );
}

export default function DbIcon({ icon, size = 24, label }: Props) {
  const [failed, setFailed] = useState(false);

  if (!icon || icon === "GENERIC" || failed) {
    return <GenericDbSvg size={size} />;
  }

  if (icon.startsWith("http") || icon.startsWith("/")) {
    return (
      <img
        src={icon}
        alt={label ?? ""}
        width={size}
        height={size}
        style={{ objectFit: "contain" }}
        onError={() => setFailed(true)}
      />
    );
  }
  return <span style={{ fontSize: size }}>{icon}</span>;
}
