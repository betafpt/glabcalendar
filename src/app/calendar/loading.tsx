import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <AppScreen
      className="max-w-[1180px] pb-40 pt-4 sm:pb-36 sm:pt-6 lg:pb-10 lg:pt-8"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Top Header Bar */}
      <header className="mx-auto max-w-[1040px]">
        <div className="flex items-center justify-between gap-2 pr-12 sm:pr-14 lg:pr-0">
          <Skeleton className="h-9 sm:h-10 w-28 rounded-pill" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Skeleton className="size-9 sm:size-10 rounded-full" />
            <Skeleton className="size-9 sm:size-10 rounded-full" />
            <Skeleton className="size-9 sm:size-10 rounded-full" />
          </div>
        </div>

        {/* Title and Editorial Subheading */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <Skeleton className="h-14 sm:h-20 w-48 sm:w-64 rounded-r16" />
            <Skeleton className="mt-1.5 h-3.5 w-36 rounded-pill" />
          </div>
          <Skeleton className="h-8 w-28 rounded-pill" />
        </div>

        {/* Navigation Toolbar */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Skeleton className="size-9 sm:size-10 rounded-full" />
            <Skeleton className="h-9 sm:h-10 w-24 rounded-pill" />
            <Skeleton className="size-9 sm:size-10 rounded-full" />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Skeleton className="h-9 sm:h-10 w-full sm:w-64 rounded-pill" />
          </div>
        </div>

        {/* Formatted Period Subtitle */}
        <div className="mt-2.5 flex items-center justify-center">
          <Skeleton className="h-7 w-48 rounded-pill" />
        </div>
      </header>

      {/* Calendar Grid Skeleton */}
      <section className="mx-auto mt-4 sm:mt-5 max-w-[1040px] overflow-hidden rounded-r24 sm:rounded-r28 border border-stroke/80 bg-white/60 shadow-soft">
        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 border-b border-stroke/70 bg-surface/90 py-2 sm:py-2.5 text-center">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
            <div key={day} className="flex justify-center">
              <Skeleton className="h-3 w-7 rounded-pill" />
            </div>
          ))}
        </div>

        {/* 7-Column Month Days Grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[70px] flex-col justify-between border-b border-r border-stroke/60 bg-surface/40 p-1 sm:min-h-[96px] sm:p-1.5 lg:min-h-[120px] lg:p-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="size-5 rounded-full" />
                {i % 4 === 0 ? <Skeleton className="h-2 w-2 rounded-full" /> : null}
              </div>
              {i % 3 === 0 ? (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full rounded-r10" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <span className="sr-only">Đang tải lịch... / Loading calendar...</span>
    </AppScreen>
  );
}
