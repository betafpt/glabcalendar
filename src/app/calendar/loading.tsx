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
      <div className="flex items-center justify-between gap-2 pr-12 sm:pr-14 lg:pr-0">
        <Skeleton className="h-9 sm:h-10 w-32 rounded-pill" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      {/* Main Page Title Header */}
      <header className="mt-3.5 sm:mt-5 min-w-0">
        <Skeleton className="h-14 sm:h-20 w-56 sm:w-80 rounded-r16" />
        <Skeleton className="mt-3 h-3.5 w-48 sm:w-64 rounded-pill" />
      </header>

      {/* View Switcher Tabs (Day / Week / Month / Timeline) */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Skeleton className="h-9 w-20 rounded-pill" />
        <Skeleton className="h-9 w-20 rounded-pill" />
        <Skeleton className="h-9 w-20 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
      </div>

      {/* Date Navigation & Period Bar */}
      <div className="mt-5 flex items-center justify-between gap-3 border-y border-ink/10 py-3.5">
        <Skeleton className="h-8 w-40 rounded-pill" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-9 w-16 rounded-pill" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>

      {/* Calendar Grid Skeletons */}
      <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={`head-${i}`} className="h-6 w-full rounded-r10" />
        ))}
        {Array.from({ length: 28 }).map((_, i) => (
          <Skeleton
            key={`cell-${i}`}
            className="aspect-square sm:aspect-[1.1] w-full rounded-r18"
          />
        ))}
      </div>

      <span className="sr-only">Đang tải lịch sản xuất... / Loading calendar...</span>
    </AppScreen>
  );
}
