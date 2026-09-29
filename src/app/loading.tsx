export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-9 w-72 max-w-full rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-2xl bg-white shadow-sm" />
          <div className="h-40 rounded-2xl bg-white shadow-sm" />
        </div>
        <span className="sr-only">Loading schedule</span>
      </div>
    </main>
  );
}
