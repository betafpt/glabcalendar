import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1 sm:px-2"
      role="status"
      aria-label="Đang tải nội dung"
      aria-live="polite"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 pb-5 pt-1 sm:pb-6">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-9 w-52 max-w-[60vw] sm:h-11 sm:w-72" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="hidden h-10 w-28 rounded-full sm:block" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(300px,20vw,360px)] lg:gap-6">
        <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-black/[0.05] bg-white p-4 shadow-sm sm:p-5 lg:min-h-0">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.05] pb-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-7 w-44 sm:w-56" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-7 gap-1.5 py-4 sm:gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="space-y-2 text-center">
                <Skeleton className="mx-auto h-2.5 w-8 rounded-full" />
                <Skeleton className="mx-auto size-8 rounded-full sm:size-9" />
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[44px_repeat(7,minmax(0,1fr))] overflow-hidden rounded-[18px] border border-black/[0.05] bg-bg/45">
            <div className="space-y-8 border-r border-black/[0.05] px-2 py-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-2.5 w-7 rounded-full" />
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="relative border-r border-black/[0.04] p-1.5 last:border-r-0"
              >
                {dayIndex === 1 || dayIndex === 3 || dayIndex === 5 ? (
                  <Skeleton
                    className={
                      dayIndex === 3
                        ? "mt-24 h-24 w-full rounded-r14"
                        : "mt-12 h-16 w-full rounded-r14"
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <aside className="hidden min-h-0 space-y-4 overflow-hidden lg:block">
          <div className="rounded-[24px] border border-black/[0.05] bg-white/70 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square w-full rounded-full" />
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-black/[0.05] bg-white/70 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-16 w-full rounded-r14" />
            <Skeleton className="mt-2 h-16 w-full rounded-r14" />
          </div>
        </aside>
      </div>

      <span className="sr-only">Đang tải nội dung…</span>
    </div>
  );
}
