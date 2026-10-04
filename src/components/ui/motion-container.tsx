"use client";

import React, { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

/**
 * Animated view transition for switching Month / Week / Day in Calendar.
 * Duration: 200ms, subtle fade + 6px vertical slide. Respects reduced motion.
 */
export function CalendarViewTransition({
  viewKey,
  children,
  className = "",
}: {
  viewKey: string;
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container for dashboard / list cards.
 */
export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.04,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Micro-animated Card with 1-2px press transform.
 */
export function MotionCard({
  children,
  className = "",
  ...props
}: HTMLMotionProps<"div"> & { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
