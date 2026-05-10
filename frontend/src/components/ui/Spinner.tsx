type Size = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: Size;
  /** Inline variant sits next to text; block variant is centered in its container */
  inline?: boolean;
  label?: string;
}

const sizeClass: Record<Size, string> = {
  sm: "spinner-sm",
  md: "spinner-md",
  lg: "spinner-lg",
};

export function Spinner({ size = "md", inline = false, label }: SpinnerProps) {
  const spinEl = <span className={`spinner ${sizeClass[size]}`} aria-hidden="true" />;

  if (inline) {
    return (
      <span className="exec-spinner-wrap" role="status" aria-label={label ?? "Loading"}>
        {spinEl}
        {label && <span>{label}</span>}
      </span>
    );
  }

  return (
    <div className="spinner-block" role="status" aria-label={label ?? "Loading"}>
      {spinEl}
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}
