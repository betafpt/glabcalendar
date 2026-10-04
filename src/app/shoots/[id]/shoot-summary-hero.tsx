"use client";

import { motion, useReducedMotion } from "motion/react";
import { LocalizedText } from "@/components/ui/localized-text";
import { StatusPill } from "@/components/shoots/status-pill";
import type { Shoot } from "@/server/db/schema";

export function ShootSummaryHero({
  shootId,
  title,
  projectName,
  status,
  canManage,
  locationLabel,
  locationHref,
  dateLabel,
  timeLabel,
}: {
  shootId: string;
  title: string;
  projectName?: string | null;
  status: Shoot["status"];
  canManage: boolean;
  locationLabel: string;
  locationHref?: string | null;
  dateLabel: string;
  timeLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const entrance = reduceMotion
    ? { initial: false as const, animate: undefined, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.34, ease: [0.25, 1, 0.5, 1] as const },
      };

  return (
    <motion.section
      {...entrance}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
      className="relative mt-4 overflow-hidden rounded-r28 border border-pink/25 bg-coral p-4 shadow-soft sm:p-5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70" />
      <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[112px_1fr_auto] sm:items-center sm:gap-5">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { delay: 0.05, duration: 0.24, ease: "easeOut" }}
          className="relative grid aspect-square place-items-center overflow-hidden rounded-r22 bg-pink/35 text-[1.8rem] font-display font-black tracking-[-.08em] text-ink sm:text-4xl"
        >
          <span className="absolute inset-x-3 top-3 h-px bg-ink/10" />
          <span className="absolute inset-y-3 left-3 w-px bg-ink/10" />
          <span>GL</span>
          <span className="absolute bottom-2.5 right-2.5 text-base text-pink">*</span>
        </motion.div>

        <div className="min-w-0">
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.08, duration: 0.22 }}
            className="truncate text-[10px] font-black uppercase tracking-[.18em] text-secondary"
          >
            {projectName || <LocalizedText vi="KHÔNG THUỘC DỰ ÁN" en="NO PROJECT" />}
          </motion.p>

          <div className="mt-1 min-w-0 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
            <motion.h2
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.11, duration: 0.26 }}
              className="min-w-0 pr-10 font-display text-[clamp(1.45rem,6.5vw,2.75rem)] font-black uppercase leading-[.86] tracking-[-.045em] text-ink [overflow-wrap:anywhere] sm:max-w-[70%] sm:flex-1 sm:pr-0"
            >
              {title}
            </motion.h2>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { delay: 0.15, duration: 0.2 }}
              className="mt-2 sm:mt-0"
            >
              <StatusPill status={status} shootId={shootId} editable={canManage} />
            </motion.div>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.18, duration: 0.24 }}
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold leading-4 text-secondary sm:text-xs"
          >
            {locationHref ? (
              <a
                href={locationHref}
                target="_blank"
                rel="noreferrer"
                className="max-w-full truncate underline decoration-ink/20 underline-offset-2 transition hover:text-ink"
              >
                ⌖ {locationLabel}
              </a>
            ) : (
              <span className="max-w-full truncate">⌖ {locationLabel}</span>
            )}
            <span className="text-ink/20">•</span>
            <span>▣ {dateLabel}</span>
            <span className="text-ink/20">•</span>
            <span>◷ {timeLabel}</span>
          </motion.div>
        </div>

        <motion.a
          href="#shoot-operations"
          whileHover={reduceMotion ? undefined : { x: 2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-surface/95 text-xl font-bold shadow-xs transition hover:bg-white sm:static"
        >
          ›
          <span className="sr-only">
            <LocalizedText vi="Chuyển đến thao tác buổi quay" en="Go to shoot operations" />
          </span>
        </motion.a>
      </div>
    </motion.section>
  );
}
