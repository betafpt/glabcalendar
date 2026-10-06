"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

type SkeletonProps = Omit<HTMLMotionProps<"div">, "animate" | "initial" | "transition">;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`rounded-r16 bg-ink/[0.09] ${className}`}
      aria-hidden="true"
      initial={false}
      animate={shouldReduceMotion ? undefined : { opacity: [0.62, 0.9, 0.62] }}
      transition={shouldReduceMotion ? undefined : { duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
      {...props}
    />
  );
}
