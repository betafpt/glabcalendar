import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

const TAB_WIDTH_CLASSES = ["w-20", "w-24", "w-20", "w-20", "w-24"];

export default function ProjectsLoading() {
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

      {/* Title */}
      <header className="mt-2 min-w-0">
        <Skeleton className="h-16 sm:h-24 w-64 sm:w-96 rounded-r16" />
        <Skeleton className="mt-2 h-3.5 w-40 rounded-pill" />
      </header>

      {/* Filter Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TAB_WIDTH_CLASSES.map((widthClass, i) => (
          <Skeleton key={i} className={`h-9 ${widthClass} shrink-0 rounded-pill`} />
        ))}
      </div>

      {/* Project Cards List */}
      <section className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[104px_1fr] sm:grid-cols-[136px_1fr] gap-3 rounded-r22 sm:rounded-r28 border border-ink/8 bg-surface/85 p-2.5 sm:p-3.5 shadow-soft"
          >
            <div className="min-h-[132px] rounded-r16 bg-ink/5 relative flex items-center justify-center">
              <Skeleton className="size-12 rounded-r10" />
            </div>
            <div className="min-w-0 py-1 pr-1 space-y-2.5">
              <div className="flex items-start justify-between gap-2.5">
                <Skeleton className="h-7 sm:h-9 w-2/3 rounded-r10" />
                <Skeleton className="h-6 w-20 rounded-pill shrink-0" />
              </div>
              <Skeleton className="h-4 w-1/2 rounded-pill" />
              <div className="mt-3.5 pt-2.5 border-t border-ink/10 flex gap-4">
                <Skeleton className="h-3 w-16 rounded-pill" />
                <Skeleton className="h-3 w-16 rounded-pill" />
                <Skeleton className="h-3 w-20 rounded-pill" />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <Skeleton className="h-2 w-16 rounded-pill" />
                <Skeleton className="size-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <span className="sr-only">Đang tải danh sách dự án... / Loading projects...</span>
    </AppScreen>
  );
}
