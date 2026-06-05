import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleGroupVariants = cva(
  "relative inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.03] backdrop-blur-sm p-[3px]",
  {
    variants: {
      size: {
        default: "h-9",
        sm: "h-8",
        lg: "h-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const toggleGroupItemVariants = cva(
  "relative z-[1] inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-[#8b8b9e] hover:text-[#c0c0d0] data-[state=on]:text-white",
  {
    variants: {
      size: {
        default: "px-4 py-1.5 text-xs",
        sm: "px-3 py-1 text-[11px]",
        lg: "px-5 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type ToggleGroupProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleGroupVariants>;

const ToggleGroup = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Root>, ToggleGroupProps>(
  ({ className, size, children, value, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    // Determine active value for indicator positioning
    const activeValue = Array.isArray(value) ? value[0] : value;

    const updateIndicator = useCallback(() => {
      if (!containerRef.current || !activeValue) return;
      const activeItem = containerRef.current.querySelector('[data-state="on"]') as HTMLElement | null;
      if (activeItem) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        setIndicatorStyle({
          left: itemRect.left - containerRect.left,
          width: itemRect.width,
        });
      }
    }, [activeValue]);

    useEffect(() => {
      updateIndicator();
    }, [updateIndicator]);

    // Also update on mount/resize
    useEffect(() => {
      const timer = setTimeout(updateIndicator, 50);
      window.addEventListener("resize", updateIndicator);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", updateIndicator);
      };
    }, [updateIndicator]);

    return (
      <ToggleGroupPrimitive.Root
        ref={(el) => {
          // Forward both refs
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className={cn(toggleGroupVariants({ size, className }))}
        value={value as any}
        {...props}
      >
        {indicatorStyle.width > 0 && (
          <motion.span
            className="absolute top-[3px] bottom-[3px] rounded-full bg-gradient-to-br from-[#0fb1b2] to-[#0d9e9f] shadow-[0_2px_12px_rgba(15,177,178,0.3)]"
            initial={false}
            animate={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        )}
        {children}
      </ToggleGroupPrimitive.Root>
    );
  },
);
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

type ToggleGroupItemProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleGroupItemVariants>;

const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Item>, ToggleGroupItemProps>(
  ({ className, size, children, ...props }, ref) => (
    <ToggleGroupPrimitive.Item ref={ref} className={cn(toggleGroupItemVariants({ size, className }))} {...props}>
      {children}
    </ToggleGroupPrimitive.Item>
  ),
);
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem, toggleGroupVariants, toggleGroupItemVariants };
