interface Props {
  icon: string;
  size?: number;
}

export default function DbIcon({ icon, size = 24 }: Props) {
  if (icon.startsWith("http")) {
    return <img src={icon} alt="" width={size} height={size} style={{ objectFit: "contain" }} />;
  }
  return <span style={{ fontSize: size }}>{icon}</span>;
}
