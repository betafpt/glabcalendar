import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AppScreen
      className="max-w-[1180px] pb-40 pt-4 sm:pb-36 sm:pt-6 lg:pb-10 lg:pt-8"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 pr-12 sm:pr-14 lg:pr-0">
        <Skeleton className="h-9 sm:h-10 w-28 rounded-pill" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Skeleton className="size-9 sm:size-10 rounded-full" />
          <Skeleton className="size-9 sm:size-10 rounded-full" />
          <Skeleton className="size-9 sm:size-10 rounded-full" />
        </div>
      </div>

      {/* Main Page Title Header */}
      <header className="mt-3 sm:mt-4 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Skeleton className="h-16 sm:h-24 w-60 sm:w-80 rounded-r16" />
            <Skeleton className="mt-2 h-3.5 sm:h-4 w-64 sm:w-96 rounded-pill" />
          </div>
          <Skeleton className="h-8 w-24 rounded-pill" />
        </div>
      </header>

      {/* Production Date Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-ink/10 py-4">
        <div>
          <Skeleton className="h-3 w-24 rounded-pill" />
          <Skeleton className="mt-2 h-6 w-52 rounded-r10" />
        </div>
        <Skeleton className="h-9 w-32 rounded-pill" />
      </div>

      {/* KPI Overview Grid */}
      <section className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-r22 border border-stroke/80 bg-surface/90 p-4 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 rounded-pill" />
              <Skeleton className="size-2 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-9 w-16 rounded-r10" />
            <Skeleton className="mt-2 h-3 w-24 rounded-pill" />
          </div>
        ))}
      </section>

      {/* Readiness & Schedule Timeline Skeleton */}
      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div>
            <Skeleton className="h-3 w-28 rounded-pill" />
            <Skeleton className="mt-1.5 h-7 w-48 rounded-r10" />
          </div>
          <Skeleton className="h-4 w-24 rounded-pill" />
        </div>

        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid gap-4 rounded-r24 sm:rounded-r28 border border-ink/8 bg-surface/80 p-4 sm:p-5 shadow-soft sm:grid-cols-[120px_minmax(0,1fr)_auto]"
          >
            <div className="space-y-2">
              <Skeleton className="h-8 w-20 rounded-r10" />
              <Skeleton className="h-4 w-16 rounded-pill" />
              <Skeleton className="h-5 w-14 rounded-pill" />
            </div>
            <div className="space-y-2 min-w-0">
              <Skeleton className="h-3 w-28 rounded-pill" />
              <Skeleton className="h-6 w-3/4 rounded-r10" />
              <Skeleton className="h-4 w-1/2 rounded-pill" />
            </div>
            <div className="flex sm:flex-col items-center justify-center gap-2">
              <Skeleton className="h-12 w-20 sm:w-16 rounded-r16" />
            </div>
          </div>
        ))}
      </section>

      <span className="sr-only">Đang tải lịch trình... / Loading schedule...</span>
    </AppScreen>
  );
}
