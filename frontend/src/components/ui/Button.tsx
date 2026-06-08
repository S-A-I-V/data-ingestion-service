import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 backdrop-blur-sm border border-white/[0.08] bg-white/[0.05] text-[#f0f0f5] hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-px active:translate-y-0",
  {
    variants: {
      variant: {
        default: "",
        primary:
          "bg-gradient-to-br from-[#0fb1b2] to-[#0d9e9f] text-white border-none shadow-[0_2px_12px_rgba(15,177,178,0.3)] hover:shadow-[0_4px_20px_rgba(15,177,178,0.4)] hover:bg-none",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "border-transparent bg-transparent hover:bg-white/[0.08]",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline hover:bg-transparent hover:translate-y-0",
        success: "bg-[rgba(34,197,94,0.1)] text-[#22c55e] border-[rgba(34,197,94,0.2)] hover:bg-[rgba(34,197,94,0.15)]",
        danger: "bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.15)]",
      },
      size: {
        default: "!px-4 !py-[8px] text-[13px]",
        sm: "!px-3 !py-[7px] text-[12px]",
        lg: "!px-6 !py-3 text-sm",
        icon: "!p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, loadingText, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
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
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
