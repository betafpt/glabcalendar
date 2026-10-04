import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "bg-ink text-white",
        pink: "border border-pink/20 bg-pink/10 text-pink",
        mint: "border border-[#0d5f3f]/15 bg-mint text-[#0d5f3f]",
        yellow: "border border-[#7a5200]/15 bg-yellow text-[#7a5200]",
        lilac: "border border-ink/10 bg-lilac text-ink",
        coral: "border border-[#9b1c34]/15 bg-coral text-[#9b1c34]",
        sky: "border border-ink/10 bg-sky text-ink",
        outline: "border border-stroke text-ink bg-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
