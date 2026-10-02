import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrewLoading() {
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
      <header className="mt-3.5 sm:mt-5 min-w-0">
        <Skeleton className="h-14 sm:h-20 w-44 sm:w-64 rounded-r16" />
        <Skeleton className="mt-3 h-3.5 w-40 sm:w-52 rounded-pill" />
      </header>

      {/* Filter Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Skeleton className="h-9 w-20 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-9 w-20 rounded-pill" />
      </div>

      {/* Crew Cards List */}
      <div className="mt-5 space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-r22 border border-ink/8 bg-surface/85 p-3 shadow-soft sm:gap-3.5 sm:p-4"
          >
            {/* Avatar */}
            <Skeleton className="size-12 sm:size-14 shrink-0 rounded-full" />

            {/* Name & Role */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 sm:h-6 w-3/5 rounded-r10" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-pill" />
                <Skeleton className="h-3 w-28 rounded-pill" />
              </div>
            </div>

            {/* Today schedule box */}
            <Skeleton className="h-12 w-20 sm:w-28 rounded-r14" />

            {/* Arrow */}
            <Skeleton className="size-7 sm:size-8 shrink-0 rounded-full" />
          </div>
        ))}
      </div>

      <span className="sr-only">Đang tải danh sách nhân sự... / Loading crew...</span>
    </AppScreen>
  );
}
