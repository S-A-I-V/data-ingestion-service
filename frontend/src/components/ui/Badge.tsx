import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Match original .badge: 3px 10px padding, 11px font, 20px radius
  "inline-flex items-center rounded-[20px] border px-[10px] py-[3px] text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // App-specific — match original badge CSS exactly
        success: "border-transparent bg-[rgba(34,197,94,0.1)] text-[#22c55e]",
        danger: "border-transparent bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
        info: "border-transparent bg-[rgba(15,177,178,0.15)] text-[#3dd8d9]",
        warning: "border-transparent bg-[rgba(245,158,11,0.1)] text-[#f59e0b]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
