"use client";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-rose-700">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">The page could not be loaded.</h1>
        <p className="mt-2 text-sm text-slate-600">Try the request again. If the problem continues, check the database connection and server logs.</p>
        <button type="button" onClick={reset} className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Try again</button>
      </div>
    </main>
  );
}
