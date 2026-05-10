type Variant = "default" | "success" | "danger" | "info" | "warning";

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  default: "",
  success: "badge-success",
  danger: "badge-failed",
  info: "badge-info",
  warning: "badge-warning",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  const classes = ["badge", variantClass[variant], className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
