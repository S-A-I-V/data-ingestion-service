/**
 * SrcBadge — displays the message_source as a styled inline badge.
 * Values: Direct, Proxy, Inferred, Manual UI
 */
import { MESSAGE_SOURCE_LABELS } from "../../../constants/reportHealth";

interface Props {
  src: string | null;
}

export default function SrcBadge({ src }: Props) {
  if (!src) return null;
  const l = src.toLowerCase();
  const cls =
    l === "proxy"
      ? "rh-src-badge rh-src-badge--proxy"
      : l === "inferred" || l.startsWith("infer")
        ? "rh-src-badge rh-src-badge--inferred"
        : "rh-src-badge";
  return <span className={cls}>{MESSAGE_SOURCE_LABELS[src] ?? src}</span>;
}
