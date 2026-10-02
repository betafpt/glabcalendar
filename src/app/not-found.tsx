import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";

export default function NotFound() {
  return (
    <AppScreen className="max-w-3xl pt-8 sm:pt-14">
      <div className="rounded-r28 border border-stroke/80 bg-surface/95 p-6 sm:p-12 text-center shadow-soft">
        <span className="inline-flex items-center rounded-pill bg-pink/10 border border-pink/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-pink">
          404 · <LocalizedText vi="Không tìm thấy" en="Not Found" />
        </span>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,8vw,4.5rem)] font-black uppercase leading-[0.88] tracking-[-0.04em] text-ink">
          <LocalizedText vi="Nội dung không tồn tại" en="Page Not Found" />
          <span className="text-pink ml-0.5">*</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium text-secondary sm:text-base">
          <LocalizedText
            vi="Mục bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đường dẫn không chính xác."
            en="The item you are looking for does not exist, has been removed, or the link is incorrect."
          />
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-6 text-xs sm:text-sm font-black uppercase tracking-[.06em] text-white shadow-soft transition-all duration-fast hover:bg-pink active:scale-press"
          >
            <LocalizedText vi="Về tổng quan" en="Back to dashboard" />
          </Link>
          <Link
            href="/calendar"
            className="inline-flex min-h-11 items-center justify-center rounded-pill border border-stroke/80 bg-white px-6 text-xs sm:text-sm font-black uppercase tracking-[.06em] text-ink shadow-soft transition-all duration-fast hover:bg-surface active:scale-press"
          >
            <LocalizedText vi="Xem lịch" en="View calendar" />
          </Link>
        </div>
      </div>
    </AppScreen>
  );
}
