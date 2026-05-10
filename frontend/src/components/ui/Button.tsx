import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type Variant = "default" | "primary" | "danger" | "success" | "icon" | "google";
type Size = "sm" | "md";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
}

const variantClass: Record<Variant, string> = {
  default: "",
  primary: "btn-primary",
  danger: "btn-danger",
  success: "btn-success",
  icon: "btn-icon",
  google: "btn-google",
};

const sizeClass: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", loading, loadingText, disabled, children, className = "", ...props }, ref) => {
    const classes = ["btn", variantClass[variant], sizeClass[size], className].filter(Boolean).join(" ");

    return (
      <motion.button
        ref={ref}
        type="button"
        className={classes}
        disabled={disabled || loading}
        whileHover={disabled || loading ? {} : { scale: 1.03 }}
        whileTap={disabled || loading ? {} : { scale: 0.97 }}
        {...props}
      >
        {loading ? (
          <span className="exec-spinner-wrap">
            <span className="exec-spinner" />
            {loadingText ?? children}
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
