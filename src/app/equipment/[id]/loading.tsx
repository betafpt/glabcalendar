import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function EquipmentDetailLoading() {
  return (
    <AppScreen className="max-w-5xl pt-5 sm:pt-7" aria-busy="true" aria-live="polite">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 pr-14 lg:pr-0">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      {/* Title */}
      <header className="mt-2">
        <Skeleton className="h-16 sm:h-24 w-72 sm:w-[480px] rounded-r16" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-pill" />
          <Skeleton className="h-6 w-16 rounded-pill" />
          <Skeleton className="h-6 w-16 rounded-pill" />
        </div>
      </header>

      {/* Visual & Specs Grid */}
      <section className="mt-4 grid gap-2.5 sm:grid-cols-[1.25fr_.75fr] md:grid-cols-[minmax(0,1.5fr)_minmax(240px,.7fr)] md:gap-3">
        <div className="min-h-[188px] sm:min-h-[360px] rounded-r22 sm:rounded-r28 bg-surface/80 border border-stroke/70 p-3 sm:p-6 flex items-center justify-center">
          <Skeleton className="aspect-[1.28] w-[min(90%,480px)] rounded-r16 sm:rounded-r22" />
        </div>

        <div className="grid content-start gap-1.5 sm:gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-r16 sm:rounded-r22 bg-surface/80 border border-stroke/60 p-2.5 sm:p-4 space-y-1.5">
              <Skeleton className="h-2.5 w-16 rounded-pill" />
              <Skeleton className="h-4 sm:h-5 w-28 rounded-r10" />
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Section */}
      <section className="mt-5 space-y-3">
        <div className="flex items-end justify-between">
          <Skeleton className="h-7 w-48 rounded-r10" />
          <Skeleton className="h-4 w-24 rounded-pill" />
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14 sm:h-16 rounded-r10 sm:rounded-r16" />
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-r16" />
          <Skeleton className="h-16 rounded-r16" />
        </div>
      </section>

      <span className="sr-only">Đang tải chi tiết thiết bị... / Loading gear details...</span>
    </AppScreen>
  );
}
