"use client";

import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppScreen className="max-w-3xl pt-8 sm:pt-14">
      <div className="rounded-r28 border border-error/25 bg-surface/95 p-6 sm:p-12 text-center shadow-soft">
        <span className="inline-flex items-center rounded-pill bg-error/10 border border-error/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-error">
          <LocalizedText vi="Đã xảy ra sự cố" en="Application Error" />
        </span>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,4.5rem)] font-black uppercase leading-[0.88] tracking-[-0.04em] text-ink">
          <LocalizedText vi="Không thể tải trang" en="Unable to Load Page" />
          <span className="text-pink ml-0.5">*</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium text-secondary sm:text-base">
          <LocalizedText
            vi="Hệ thống gặp sự cố khi tải dữ liệu. Vui lòng thử lại hoặc kiểm tra kết nối cơ sở dữ liệu và nhật ký máy chủ."
            en="A problem occurred while loading data. Please try again or check the database connection and server logs."
          />
        </p>

        {error?.message ? (
          <div className="mx-auto mt-5 max-w-lg rounded-r16 border border-warning/30 bg-yellow/80 p-3.5 text-left text-xs font-semibold text-ink">
            <span className="font-black uppercase tracking-wider text-[10px] text-secondary block mb-1">
              <LocalizedText vi="Chi tiết lỗi:" en="Error details:" />
            </span>
            <span className="font-mono text-[11px] break-words text-ink/90">
              {error.message}
            </span>
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-6 text-xs sm:text-sm font-black uppercase tracking-[.06em] text-white shadow-soft transition-all duration-fast hover:bg-pink active:scale-press"
          >
            <LocalizedText vi="Thử lại" en="Try again" />
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-pill border border-stroke/80 bg-white px-6 text-xs sm:text-sm font-black uppercase tracking-[.06em] text-ink shadow-soft transition-all duration-fast hover:bg-surface active:scale-press"
          >
            <LocalizedText vi="Về tổng quan" en="Back to dashboard" />
          </Link>
        </div>
      </div>
    </AppScreen>
  );
}
