import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewDetailLoading() {
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

      {/* Title */}
      <header className="mt-3 min-w-0">
        <Skeleton className="h-3 w-28 rounded-pill" />
        <Skeleton className="mt-2 h-16 sm:h-24 w-72 sm:w-96 rounded-r16" />
        <Skeleton className="mt-3 h-4 w-36 rounded-pill" />
      </header>

      {/* Hero & Availability Grid */}
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,.82fr)]">
        {/* Left Hero Profile Card */}
        <section className="min-h-[260px] sm:min-h-[420px] rounded-r22 sm:rounded-r28 border border-stroke/70 bg-surface/80 p-4 sm:p-7 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-6 w-20 rounded-pill" />
            <Skeleton className="h-6 w-24 rounded-pill" />
          </div>
          <div className="mx-auto flex justify-center py-4">
            <Skeleton className="size-36 sm:size-56 rounded-[28px] sm:rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-r16" />
            <Skeleton className="h-14 rounded-r16" />
          </div>
        </section>

        {/* Right Info Cards */}
        <div className="space-y-3">
          <section className="rounded-r22 sm:rounded-r28 border border-stroke/70 bg-surface/80 p-4 sm:p-5 space-y-3">
            <div className="flex items-end justify-between">
              <Skeleton className="h-4 w-24 rounded-pill" />
              <Skeleton className="h-5 w-20 rounded-pill" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-20 rounded-r16" />
              ))}
            </div>
          </section>

          <section className="rounded-r22 sm:rounded-r28 border border-stroke/70 bg-surface/80 p-4 sm:p-5 space-y-2">
            <Skeleton className="h-4 w-32 rounded-pill" />
            <Skeleton className="h-12 rounded-r16" />
            <Skeleton className="h-12 rounded-r16" />
          </section>
        </div>
      </div>

      <span className="sr-only">Đang tải hồ sơ nhân sự... / Loading crew profile...</span>
    </AppScreen>
  );
}
