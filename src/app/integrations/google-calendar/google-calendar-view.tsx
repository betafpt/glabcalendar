"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";
import { Calendar1, Refresh2, TickCircle } from "@/components/ui/iconsax";
import {
  disconnectGoogleCalendarAction,
  triggerGoogleCalendarSyncAction,
  updateGoogleCalendarSettingsAction,
} from "./actions";

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Đồng bộ hai chiều"
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex min-h-11 w-14 shrink-0 items-center rounded-pill p-1 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 active:scale-press disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-pink" : "bg-stroke"}`}
    >
      <span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-fast ${checked ? "translate-x-7" : "translate-x-0"}`} />
    </button>
  );
}

export interface GoogleCalendarViewProps {
  connection: {
    status: "connected" | "disconnected" | "revoked" | "error";
    accountEmail?: string | null;
    accountName?: string | null;
    lastSyncedAt?: Date | null;
    lastSyncStatus: string;
    lastSyncMessage?: string | null;
    syncEnabled: boolean;
  } | null;
  errorMessage?: string | null;
}

function formatLastSync(value?: Date | null) {
  if (!value) return "Chưa đồng bộ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function GoogleCalendarView({ connection, errorMessage }: GoogleCalendarViewProps) {
  const connected = connection?.status === "connected";
  const [syncEnabled, setSyncEnabled] = useState(connection?.syncEnabled ?? true);
  const [feedback, setFeedback] = useState<string | null>(errorMessage ?? null);
  const [isPending, startTransition] = useTransition();

  const toggleSync = () => {
    const next = !syncEnabled;
    setSyncEnabled(next);
    startTransition(async () => {
      const result = await updateGoogleCalendarSettingsAction({ syncEnabled: next });
      setFeedback(result.ok ? null : result.message ?? "Không thể cập nhật đồng bộ.");
      if (!result.ok) setSyncEnabled(!next);
    });
  };

  const syncNow = () => {
    startTransition(async () => {
      const result = await triggerGoogleCalendarSyncAction();
      setFeedback(result.message ?? (result.ok ? "Đồng bộ hoàn tất." : "Đồng bộ thất bại."));
    });
  };

  const disconnect = () => {
    startTransition(async () => {
      const result = await disconnectGoogleCalendarAction();
      setFeedback(result.message ?? null);
      if (result.ok) window.location.reload();
    });
  };

  return (
    <AppScreen className="max-w-3xl pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <Link href="/settings" aria-label="Quay lại cài đặt" className="grid size-11 place-items-center rounded-full bg-surface text-2xl font-bold transition hover:bg-white">←</Link>
        <span className="rounded-pill bg-coral px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-ink">Google Calendar</span>
      </div>

      <header className="mt-5">
        <p className="text-[10px] font-black uppercase tracking-[.28em] text-pink"><LocalizedText vi="TÍCH HỢP" en="INTEGRATION" /></p>
        <h1 className="mt-1 font-display text-[clamp(2rem,8vw,4rem)] font-black uppercase leading-[.9] tracking-[-.05em] text-ink">
          <LocalizedText vi="Lịch chính" en="Primary calendar" /><span className="text-pink">*</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-secondary">
          <LocalizedText vi="G.Lab đồng bộ trực tiếp hai chiều với Google Calendar chính của tài khoản đang kết nối." en="G.Lab syncs directly in both directions with the connected account's primary Google Calendar." />
        </p>
      </header>

      {!connected ? (
        <section className="mt-7 rounded-r28 border border-stroke/80 bg-surface p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-r16 bg-sky"><Calendar1 size={24} variant="Bold" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-black uppercase tracking-tight"><LocalizedText vi="Kết nối Google Calendar" en="Connect Google Calendar" /></h2>
              <p className="mt-1 text-sm font-semibold text-secondary"><LocalizedText vi="Kết nối tài khoản Google để bật đồng bộ với Lịch chính." en="Connect Google to enable Primary Calendar sync." /></p>
              <a href="/api/integrations/google-calendar/connect" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-[.12em] text-white transition hover:bg-pink">
                <LocalizedText vi="Kết nối Google" en="Connect Google" />
              </a>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-7 overflow-hidden rounded-r28 border border-stroke/80 bg-surface shadow-soft">
          <div className="border-b border-stroke/70 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-secondary"><LocalizedText vi="Tài khoản Google" en="Google account" /></p>
                <p className="mt-1 truncate text-base font-black text-ink">{connection?.accountName || connection?.accountEmail || "Google"}</p>
                {connection?.accountName && connection?.accountEmail ? <p className="truncate text-xs font-semibold text-secondary">{connection.accountEmail}</p> : null}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-mint px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-ink"><TickCircle size={14} variant="Bold" /> Đã kết nối</span>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 rounded-r20 bg-bg p-4">
              <div>
                <p className="text-sm font-black text-ink"><LocalizedText vi="Đồng bộ với Lịch chính" en="Sync with Primary Calendar" /></p>
                <p className="mt-1 text-xs font-semibold text-secondary"><LocalizedText vi="Không cần chọn hoặc tạo calendar riêng." en="No separate calendar selection required." /></p>
              </div>
              <span className="rounded-pill bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[.1em] text-secondary">Primary</span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-r20 bg-bg p-4">
              <div>
                <p className="text-sm font-black text-ink"><LocalizedText vi="Đồng bộ hai chiều" en="Two-way sync" /></p>
                <p className="mt-1 text-xs font-semibold text-secondary"><LocalizedText vi="Shoot G.Lab và event Google cập nhật qua lại." en="G.Lab shoots and Google events update both ways." /></p>
              </div>
              <Toggle checked={syncEnabled} disabled={isPending} onChange={toggleSync} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-r20 bg-mint/70 p-4">
              <span className="inline-flex items-center gap-2 text-xs font-black text-ink"><TickCircle size={16} variant="Bold" /> <LocalizedText vi="Tự động bỏ qua sinh nhật" en="Birthdays automatically excluded" /></span>
              <span className="rounded-pill bg-white/80 px-3 py-1 text-[10px] font-black text-secondary">✓ AUTO</span>
            </div>

            <div className="flex flex-col gap-3 rounded-r20 border border-stroke/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-secondary"><LocalizedText vi="Lần đồng bộ gần nhất" en="Last sync" /></p>
                <p className="mt-1 text-sm font-black text-ink">{formatLastSync(connection?.lastSyncedAt)}</p>
              </div>
              <button type="button" disabled={isPending || !syncEnabled} onClick={syncNow} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-[.1em] text-white transition hover:bg-pink disabled:cursor-not-allowed disabled:opacity-50">
                <Refresh2 size={16} className={isPending ? "animate-spin" : ""} /> <LocalizedText vi="Đồng bộ ngay" en="Sync now" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-stroke/70 px-5 py-4">
            <p className="text-[11px] font-semibold text-secondary">{connection?.lastSyncMessage || "Google Calendar · Primary"}</p>
            <button type="button" disabled={isPending} onClick={disconnect} className="text-[11px] font-black text-secondary transition hover:text-error disabled:opacity-50"><LocalizedText vi="Ngắt kết nối" en="Disconnect" /></button>
          </div>
        </section>
      )}

      {feedback ? <p className="mt-4 rounded-r16 bg-coral px-4 py-3 text-sm font-bold text-ink">{feedback}</p> : null}
    </AppScreen>
  );
}
