import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

const TAB_WIDTH_CLASSES = ["w-16", "w-24", "w-20", "w-20", "w-24", "w-20"];

export default function EquipmentLoading() {
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
        <Skeleton className="mt-2 h-3.5 w-40 rounded-pill" />
      </header>

      {/* Filter Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TAB_WIDTH_CLASSES.map((widthClass, i) => (
          <Skeleton key={i} className={`h-9 ${widthClass} shrink-0 rounded-pill`} />
        ))}
      </div>

      {/* Equipment Category Sections */}
      <section className="mt-4 space-y-2.5">
        {[0, 1].map((sectionIndex) => (
          <div
            key={sectionIndex}
            className="grid grid-cols-[78px_1fr] gap-2.5 rounded-r22 border border-ink/5 bg-surface/85 p-2.5 sm:grid-cols-[110px_1fr] sm:gap-3 sm:p-3"
          >
            <div className="flex min-h-[124px] flex-col justify-between py-1">
              <div className="space-y-1">
                <Skeleton className="h-6 sm:h-8 w-16 sm:w-20 rounded-r10" />
                <Skeleton className="h-3 w-12 rounded-pill" />
              </div>
              <Skeleton className="size-8 sm:size-9 rounded-full" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[0, 1, 2].map((itemIndex) => (
                <div
                  key={itemIndex}
                  className="rounded-r16 bg-white/40 p-1.5 text-center sm:p-2 space-y-1.5 flex flex-col items-center"
                >
                  <Skeleton className="aspect-[1.04] w-full rounded-r10" />
                  <Skeleton className="h-4 w-12 rounded-pill" />
                  <Skeleton className="h-3 w-16 rounded-pill" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <span className="sr-only">Đang tải kho thiết bị... / Loading gear library...</span>
    </AppScreen>
  );
}
