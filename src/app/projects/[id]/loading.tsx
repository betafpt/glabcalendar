import { AppScreen } from "@/components/ui/app-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailLoading() {
  return (
    <AppScreen aria-busy="true" aria-live="polite">
      {/* Back button */}
      <Skeleton className="h-11 w-28 rounded-pill" />

      {/* Main Grid */}
      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        {/* Left Hero Card */}
        <section className="rounded-r28 border border-stroke/70 bg-surface/80 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded-pill" />
              <Skeleton className="h-14 sm:h-20 w-72 sm:w-96 rounded-r16" />
            </div>
            <Skeleton className="h-8 w-24 rounded-pill" />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-r22 bg-surface/90 p-4 space-y-2">
                <Skeleton className="h-3 w-16 rounded-pill" />
                <Skeleton className="h-6 w-24 rounded-r10" />
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-pill" />
            <Skeleton className="h-4 w-1/2 rounded-pill" />
          </div>
        </section>

        {/* Right Form Card */}
        <section className="rounded-r28 border border-stroke/70 bg-surface/80 p-5 sm:p-6 space-y-4">
          <Skeleton className="h-3 w-20 rounded-pill" />
          <Skeleton className="h-7 w-40 rounded-r10" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-11 w-full rounded-r16" />
            <Skeleton className="h-11 w-full rounded-r16" />
            <Skeleton className="h-11 w-full rounded-r16" />
            <Skeleton className="h-12 w-full rounded-pill mt-4" />
          </div>
        </section>
      </div>

      <span className="sr-only">Đang tải thông tin dự án... / Loading project details...</span>
    </AppScreen>
  );
}
