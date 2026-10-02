import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function EquipmentLoading() {
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
        <Skeleton className="h-14 sm:h-20 w-48 sm:w-68 rounded-r16" />
        <Skeleton className="mt-3 h-3.5 w-36 sm:w-48 rounded-pill" />
      </header>

      {/* Filter Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Skeleton className="h-9 w-20 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-9 w-24 rounded-pill" />
        <Skeleton className="h-9 w-20 rounded-pill" />
      </div>

      {/* Equipment Category Groups */}
      <div className="mt-5 space-y-3.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-r22 border border-ink/8 bg-surface/85 p-3 shadow-soft sm:grid sm:grid-cols-[120px_1fr] sm:gap-3 sm:p-4"
          >
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-between sm:py-1">
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-24 rounded-r10" />
                <Skeleton className="h-3 w-16 rounded-pill" />
              </div>
              <Skeleton className="size-7 sm:size-8 rounded-full" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[0, 1, 2].map((itemIdx) => (
                <div key={itemIdx} className="rounded-r16 bg-white/40 p-2 text-center space-y-1.5">
                  <Skeleton className="aspect-square w-full rounded-r10" />
                  <Skeleton className="mx-auto h-3 w-12 rounded-pill" />
                  <Skeleton className="mx-auto h-3 w-16 rounded-pill" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Đang tải kho thiết bị... / Loading gear...</span>
    </AppScreen>
  );
}
