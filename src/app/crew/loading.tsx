import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

const TAB_WIDTH_CLASSES = ["w-20", "w-24", "w-20", "w-20"];

export default function CrewLoading() {
  return (
    <AppScreen className="max-w-5xl pt-5 sm:pt-7" aria-busy="true" aria-live="polite">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 pr-14 lg:pr-0">
        <Skeleton className="h-5 w-20 rounded-pill" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      {/* Header */}
      <header className="mt-2">
        <Skeleton className="h-16 sm:h-24 w-52 sm:w-72 rounded-r16" />
        <Skeleton className="mt-2 h-3.5 w-36 rounded-pill" />
      </header>

      {/* Filter Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TAB_WIDTH_CLASSES.map((widthClass, i) => (
          <Skeleton key={i} className={`h-9 ${widthClass} shrink-0 rounded-pill`} />
        ))}
      </div>

      {/* Crew Rows List */}
      <section className="mt-4 space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid min-h-[104px] grid-cols-[66px_minmax(0,1fr)_92px_30px] items-center gap-2 rounded-r22 border border-ink/5 bg-surface/85 p-2.5 sm:grid-cols-[72px_1fr_118px_auto] sm:gap-3"
          >
            <Skeleton className="size-[66px] sm:size-[72px] rounded-full shrink-0" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-6 sm:h-7 w-40 sm:w-56 rounded-r10" />
              <Skeleton className="h-4 w-28 rounded-pill" />
              <Skeleton className="h-3 w-20 rounded-pill" />
            </div>
            <div className="self-stretch rounded-r16 bg-white/40 p-2 sm:p-2.5 space-y-1">
              <Skeleton className="h-2.5 w-12 rounded-pill" />
              <Skeleton className="h-4 w-16 rounded-pill" />
              <Skeleton className="h-3 w-20 rounded-pill" />
            </div>
            <Skeleton className="size-7 sm:size-9 rounded-full" />
          </div>
        ))}
      </section>

      <span className="sr-only">Đang tải danh sách nhân sự... / Loading crew roster...</span>
    </AppScreen>
  );
}
