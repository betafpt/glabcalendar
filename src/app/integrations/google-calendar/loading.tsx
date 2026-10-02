import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoogleCalendarLoading() {
  return (
    <AppScreen className="max-w-4xl pt-5 sm:pt-7" aria-busy="true" aria-live="polite">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 pr-14 lg:pr-0">
        <Skeleton className="h-5 w-24 rounded-pill" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      {/* Header */}
      <header className="mt-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-12 sm:h-16 w-64 sm:w-80 rounded-r16" />
          <Skeleton className="h-6 w-28 rounded-pill" />
        </div>
        <Skeleton className="mt-2 h-3.5 w-56 rounded-pill" />
      </header>

      {/* Main Connection Status Card */}
      <section className="mt-6 rounded-r24 border border-stroke/70 bg-surface/90 p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-5 w-44 rounded-pill" />
            <Skeleton className="h-4 w-60 rounded-pill" />
          </div>
          <Skeleton className="h-10 w-32 rounded-pill" />
        </div>

        <div className="border-t border-stroke/50 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16 rounded-pill" />
              <Skeleton className="h-4 w-24 rounded-pill" />
            </div>
          ))}
        </div>
      </section>

      {/* Sync Preferences Section */}
      <section className="mt-5 rounded-r24 border border-stroke/70 bg-surface/90 p-5 sm:p-6 shadow-soft space-y-4">
        <Skeleton className="h-6 w-48 rounded-r10" />
        <div className="space-y-3 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-stroke/40 last:border-none">
              <div className="space-y-1">
                <Skeleton className="h-4 w-36 rounded-pill" />
                <Skeleton className="h-3 w-52 rounded-pill" />
              </div>
              <Skeleton className="h-6 w-11 rounded-pill" />
            </div>
          ))}
        </div>
      </section>

      <span className="sr-only">Đang tải đồng bộ Google Calendar... / Loading Google Calendar sync...</span>
    </AppScreen>
  );
}
