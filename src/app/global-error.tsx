"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#f3f1ea] font-sans text-[#111111] antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-lg rounded-[28px] border border-[#ff4f9a]/30 bg-white/95 p-6 sm:p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <span className="inline-flex items-center rounded-full bg-[#e8432d]/10 border border-[#e8432d]/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#e8432d]">
              Hệ thống · System Error
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black uppercase leading-tight tracking-tight text-[#111111]">
              Đã xảy ra sự cố
              <span className="text-[#ff4f9a] ml-0.5">*</span>
            </h1>
            <p className="mx-auto mt-3 text-sm font-medium text-[#64748b]">
              Ứng dụng gặp sự cố nghiêm trọng cấp hệ thống. Vui lòng tải lại trang hoặc thử lại sau giây lát.
            </p>

            {error?.message ? (
              <div className="mx-auto mt-4 max-w-md rounded-[16px] border border-amber-300 bg-amber-50 p-3 text-left text-xs font-semibold text-[#111111]">
                <span className="font-black uppercase tracking-wider text-[10px] text-[#64748b] block mb-1">
                  Chi tiết lỗi:
                </span>
                <span className="font-mono text-[11px] break-words text-slate-800">
                  {error.message}
                </span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111111] px-6 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-[#ff4f9a] active:scale-[0.98]"
              >
                Thử lại / Retry
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-xs sm:text-sm font-black uppercase tracking-wider text-[#111111] shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                Về trang chủ / Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
