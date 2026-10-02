import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShootsLoading() {
  return (
    <AppScreen className="max-w-6xl pt-5 sm:pt-7" aria-busy="true" aria-live="polite">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 pr-14 lg:pr-0">
        <Skeleton className="h-5 w-20 rounded-pill" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      {/* Header */}
      <header className="mt-4 min-w-0">
        <Skeleton className="h-16 sm:h-24 w-72 sm:w-96 rounded-r16" />
        <Skeleton className="mt-2 h-3.5 w-48 rounded-pill" />
      </header>

      {/* Create Shoot Form Section */}
      <section className="mt-4 rounded-r24 border border-stroke/70 bg-surface/90 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-11 rounded-r16" />
          <Skeleton className="h-11 rounded-r16" />
          <Skeleton className="h-11 rounded-r16" />
          <Skeleton className="h-11 rounded-r16" />
          <Skeleton className="h-11 rounded-r16" />
          <Skeleton className="h-11 rounded-pill" />
        </div>
      </section>

      {/* Upcoming Shoots Section */}
      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Skeleton className="h-3 w-24 rounded-pill" />
            <Skeleton className="mt-1 h-12 w-48 rounded-r16" />
          </div>
          <Skeleton className="h-8 w-24 rounded-pill" />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-r28 border border-ink/5 bg-surface/85 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <Skeleton className="h-3 w-28 rounded-pill" />
                  <Skeleton className="h-8 w-3/4 rounded-r10" />
                </div>
                <Skeleton className="h-6 w-20 rounded-pill shrink-0" />
              </div>

              <div className="grid gap-2 border-t border-ink/10 pt-4 sm:grid-cols-2">
                <Skeleton className="h-4 w-36 rounded-pill" />
                <Skeleton className="h-4 w-28 rounded-pill" />
              </div>

              <div className="flex justify-end pt-1">
                <Skeleton className="size-9 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <span className="sr-only">Đang tải lịch quay... / Loading shoots...</span>
    </AppScreen>
  );
}
