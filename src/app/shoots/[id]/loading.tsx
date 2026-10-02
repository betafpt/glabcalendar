import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShootDetailLoading() {
  return (
    <AppScreen className="max-w-6xl pt-5 sm:pt-7" aria-busy="true" aria-live="polite">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 pr-14 lg:pr-0">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      {/* Main Title Header */}
      <header className="mt-4 min-w-0">
        <Skeleton className="h-3.5 w-32 rounded-pill" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-16 sm:h-24 w-80 sm:w-[480px] rounded-r16" />
          <Skeleton className="h-8 w-28 rounded-pill" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Skeleton className="h-5 w-44 rounded-pill" />
          <Skeleton className="h-5 w-36 rounded-pill" />
        </div>
      </header>

      {/* Readiness Summary Card Skeleton */}
      <section className="mt-6 rounded-r28 bg-surface/90 border border-stroke/70 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32 rounded-pill" />
          <Skeleton className="h-8 w-20 rounded-r10" />
        </div>
        <Skeleton className="h-3 w-full rounded-pill" />
      </section>

      {/* Resource Scheduling Grid (Crew & Equipment) Skeleton */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-r28 border border-stroke/70 bg-surface/80 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded-pill" />
            <Skeleton className="h-5 w-24 rounded-pill" />
          </div>
          <Skeleton className="h-8 w-44 rounded-r10" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-11 w-full rounded-r16" />
            <Skeleton className="h-11 w-full rounded-r16" />
            <Skeleton className="h-12 w-full rounded-pill mt-3" />
          </div>
        </div>

        <div className="rounded-r28 border border-stroke/70 bg-surface/80 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded-pill" />
            <Skeleton className="h-5 w-24 rounded-pill" />
          </div>
          <Skeleton className="h-8 w-44 rounded-r10" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-11 w-full rounded-r16" />
            <Skeleton className="h-11 w-full rounded-r16" />
            <Skeleton className="h-12 w-full rounded-pill mt-3" />
          </div>
        </div>
      </section>

      <span className="sr-only">Đang tải chi tiết buổi quay... / Loading shoot details...</span>
    </AppScreen>
  );
}
