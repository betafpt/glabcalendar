import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShootsLoading() {
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
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      {/* Main Page Title Header */}
      <header className="mt-4 sm:mt-5 min-w-0">
        <Skeleton className="h-14 sm:h-20 w-64 sm:w-80 rounded-r16" />
        <Skeleton className="mt-3 h-3.5 w-44 sm:w-60 rounded-pill" />
      </header>

      {/* Form Card Skeleton */}
      <div className="mt-4 rounded-r24 border border-stroke bg-surface p-4 sm:p-5 space-y-3">
        <Skeleton className="h-12 w-full rounded-r18" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Skeleton className="h-12 w-full rounded-r18" />
          <Skeleton className="h-12 w-full rounded-r18" />
        </div>
        <Skeleton className="h-12 w-full rounded-pill" />
      </div>

      {/* Upcoming Section Header & Filter Tabs */}
      <div className="mt-8 space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20 rounded-pill" />
            <Skeleton className="h-8 w-40 rounded-r12" />
          </div>
          <Skeleton className="h-7 w-24 rounded-pill" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Skeleton className="h-9 w-20 rounded-pill" />
          <Skeleton className="h-9 w-24 rounded-pill" />
          <Skeleton className="h-9 w-24 rounded-pill" />
          <Skeleton className="h-9 w-20 rounded-pill" />
        </div>

        {/* Shoots List Skeletons */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-r24 sm:rounded-r28 border border-ink/8 bg-surface/85 p-4 sm:p-5 shadow-soft space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-28 rounded-pill" />
                  <Skeleton className="h-7 sm:h-9 w-3/5 rounded-r12" />
                </div>
                <Skeleton className="h-6 w-20 rounded-pill" />
              </div>
              <div className="grid gap-2 border-t border-ink/10 pt-3 sm:grid-cols-2">
                <Skeleton className="h-4 w-40 rounded-pill" />
                <Skeleton className="h-4 w-40 rounded-pill" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Đang tải lịch quay... / Loading shoots...</span>
    </AppScreen>
  );
}
