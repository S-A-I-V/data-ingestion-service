import { forwardRef } from "react";

// ── FormRow ──────────────────────────────────────────────────────────────────
// Wraps a label + any input/select/children in the standard .form-row layout.

interface FormRowProps {
  label?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormRow({ label, htmlFor, children, className = "" }: FormRowProps) {
  return (
    <div className={`form-row ${className}`.trim()}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  short?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ short, className = "", ...props }, ref) => {
  const classes = [short ? "input-short" : "", className].filter(Boolean).join(" ");
  return <input ref={ref} className={classes || undefined} {...props} />;
});

Input.displayName = "Input";

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  loading?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ loading, className = "", children, ...props }, ref) => {
    const classes = [loading ? "select-loading" : "", className].filter(Boolean).join(" ");
    return (
      <select ref={ref} className={classes || undefined} {...props}>
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";

// ── Checkbox ──────────────────────────────────────────────────────────────────

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, id, ...props }: CheckboxProps) {
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="checkbox" {...props} />
    </div>
  );
}
