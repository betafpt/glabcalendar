import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center select-none font-sans font-black transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-press",
  {
    variants: {
      variant: {
        default:
          "rounded-pill bg-ink text-white shadow-soft hover:bg-pink hover:text-white",
        secondary:
          "rounded-pill border border-stroke/80 bg-surface text-ink shadow-soft hover:bg-white hover:border-ink/20",
        outline:
          "rounded-pill border border-stroke bg-transparent text-ink hover:bg-surface hover:border-ink/20",
        ghost:
          "rounded-pill text-ink hover:bg-surface/80",
        destructive:
          "rounded-pill border border-error/25 bg-error/10 text-error hover:bg-error hover:text-white",
        pink:
          "rounded-pill bg-pink text-white shadow-soft hover:bg-ink hover:text-white",
      },
      size: {
        default: "min-h-11 px-5 py-2.5 text-xs uppercase tracking-wider",
        sm: "min-h-9 px-3.5 py-1.5 text-xs font-bold",
        lg: "min-h-13 px-6 py-3 text-sm uppercase tracking-wider",
        icon: "size-11 rounded-full p-0 grid place-items-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
