"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";
import {
  triggerGoogleCalendarSyncAction,
  disconnectGoogleCalendarAction,
  updateGoogleCalendarSettingsAction,
} from "./actions";

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex min-h-11 w-14 shrink-0 cursor-pointer items-center rounded-pill p-1 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 active:scale-press disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-pink" : "bg-stroke"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform duration-fast ${
          checked ? "translate-x-7" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function GoogleCalendarIcon() {
  return (
    <div className="grid size-11 place-items-center rounded-r10 border border-stroke/70 bg-white shadow-sm">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="17" rx="3" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
        <path d="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3V7z" fill="#2563eb" />
        <rect x="7" y="2.5" width="2" height="3" rx="1" fill="#1e293b" />
        <rect x="15" y="2.5" width="2" height="3" rx="1" fill="#1e293b" />
        <text x="12" y="17.5" textAnchor="middle" fill="#2563eb" fontSize="8.5" fontWeight="900" fontFamily="sans-serif">
          31
        </text>
      </svg>
    </div>
  );
}

export interface GoogleCalendarViewProps {
  connection: {
    id?: string;
    status: "connected" | "disconnected" | "revoked" | "error";
    accountEmail?: string | null;
    accountName?: string | null;
    calendarId: string;
    lastSyncedAt?: Date | null;
    lastSyncStatus: string;
    lastSyncMessage?: string | null;
    syncEnabled: boolean;
    syncFromGoogle: boolean;
    syncToGoogle: boolean;
    syncShoots: boolean;
    syncMeetings: boolean;
    syncLocationScout: boolean;
    syncInternalEvents: boolean;
  } | null;
  errorMessage?: string | null;
}

export function GoogleCalendarView({ connection, errorMessage }: GoogleCalendarViewProps) {
  const isConnected = connection?.status === "connected";
  const isRevoked = connection?.status === "revoked";
  const isError = connection?.status === "error";

  const [isPending, startTransition] = useTransition();
  const [syncFeedback, setSyncFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const [fromGoogle, setFromGoogle] = useState(connection?.syncFromGoogle ?? true);
  const [toGoogle, setToGoogle] = useState(connection?.syncToGoogle ?? true);
  const [options, setOptions] = useState({
    shoots: connection?.syncShoots ?? true,
    meetings: connection?.syncMeetings ?? true,
    locationScout: connection?.syncLocationScout ?? true,
    internalEvents: connection?.syncInternalEvents ?? true,
  });

  const handleToggleFromGoogle = () => {
    const nextVal = !fromGoogle;
    setFromGoogle(nextVal);
    startTransition(async () => {
      await updateGoogleCalendarSettingsAction({ syncFromGoogle: nextVal });
    });
  };

  const handleToggleToGoogle = () => {
    const nextVal = !toGoogle;
    setToGoogle(nextVal);
    startTransition(async () => {
      await updateGoogleCalendarSettingsAction({ syncToGoogle: nextVal });
    });
  };

  const toggleOption = (key: keyof typeof options) => {
    const nextVal = !options[key];
    const newOptions = { ...options, [key]: nextVal };
    setOptions(newOptions);
    startTransition(async () => {
      await updateGoogleCalendarSettingsAction({
        syncShoots: newOptions.shoots,
        syncMeetings: newOptions.meetings,
        syncLocationScout: newOptions.locationScout,
        syncInternalEvents: newOptions.internalEvents,
      });
    });
  };

  const handleManualSync = () => {
    setSyncFeedback(null);
    startTransition(async () => {
      const res = await triggerGoogleCalendarSyncAction();
      setSyncFeedback({
        ok: res.ok,
        message: res.message || (res.ok ? "Đồng bộ thành công." : "Đồng bộ thất bại."),
      });
    });
  };

  const handleDisconnect = () => {
    if (confirm("Bạn có chắc chắn muốn ngắt kết nối Google Calendar không?")) {
      startTransition(async () => {
        await disconnectGoogleCalendarAction();
      });
    }
  };

  const formatLastSync = (date?: Date | null) => {
    if (!date) return "Chưa đồng bộ";
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  return (
    <AppScreen className="space-y-4 pt-5 sm:space-y-5">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="grid size-10 place-items-center rounded-full border border-stroke bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"
          aria-label="Quay lại cài đặt"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-[1.85rem] font-black uppercase leading-none tracking-[-0.04em] text-ink sm:text-[2.2rem]">
          <LocalizedText vi="Tích hợp Google Calendar" en="Google Calendar Integration" />
          <span className="text-pink">*</span>
        </h1>
      </div>

      {/* Global / Query Error Alert */}
      {errorMessage ? (
        <div className="rounded-r20 border border-error/30 bg-coral p-4 shadow-soft text-error">
          <p className="text-xs font-black uppercase tracking-wider">
            <LocalizedText vi="Lỗi kết nối" en="Connection Error" />
          </p>
          <p className="mt-1 text-xs font-bold text-ink">{errorMessage}</p>
        </div>
      ) : null}

      {/* Revoked Credentials Alert Banner */}
      {isRevoked ? (
        <div className="rounded-r20 border border-error/40 bg-error/10 p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-error">
                <LocalizedText vi="Phiên làm việc đã hết hạn" en="Session Expired" />
              </p>
              <p className="mt-1 text-xs font-bold text-ink">
                <LocalizedText
                  vi="Quyền truy cập Google Calendar đã bị thu hồi hoặc đã hết hạn. Vui lòng kết nối lại để tiếp tục đồng bộ lịch trình."
                  en="Google Calendar access was revoked or has expired. Please reconnect to resume schedule synchronization."
                />
              </p>
            </div>
            <a
              href="/api/integrations/google-calendar/connect"
              className="inline-flex min-h-9 items-center justify-center shrink-0 rounded-pill bg-[#2563eb] px-4 text-xs font-black uppercase tracking-wider text-white shadow-soft transition hover:bg-[#1d4ed8] active:scale-press"
            >
              <LocalizedText vi="Kết nối lại" en="Reconnect" />
            </a>
          </div>
        </div>
      ) : null}

      {/* Sync Status Feedback Message */}
      {syncFeedback ? (
        <div
          className={`rounded-r16 p-3.5 text-xs font-bold shadow-soft transition ${
            syncFeedback.ok ? "bg-mint text-[#166534] border border-[#166534]/20" : "bg-coral text-error border border-error/20"
          }`}
        >
          {syncFeedback.message}
        </div>
      ) : null}

      {/* Connected / Disconnected Account Card */}
      <section className="rounded-r22 border border-stroke/70 bg-surface p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <GoogleCalendarIcon />
            <div className="min-w-0">
              <h2 className="text-[15px] font-black leading-tight text-ink">Google Calendar</h2>
              <p className="mt-0.5 text-xs font-medium text-secondary">
                <LocalizedText vi="Đồng bộ lịch quay, sự kiện và nhắc việc" en="Sync shoots, events and reminders" />
              </p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <span className="rounded-pill bg-mint px-3 py-1 text-[11px] font-black text-[#166534]">
                <LocalizedText vi="Đã kết nối" en="Connected" />
              </span>
            ) : isRevoked ? (
              <span className="rounded-pill bg-error/15 px-3 py-1 text-[11px] font-black text-error">
                <LocalizedText vi="Cần kết nối lại" en="Action Needed" />
              </span>
            ) : isError ? (
              <span className="rounded-pill bg-coral px-3 py-1 text-[11px] font-black text-error">
                <LocalizedText vi="Lỗi đồng bộ" en="Sync Error" />
              </span>
            ) : (
              <span className="rounded-pill bg-neutral-200 px-3 py-1 text-[11px] font-black text-secondary">
                <LocalizedText vi="Chưa kết nối" en="Not Connected" />
              </span>
            )}
          </div>
        </div>

        {isConnected || isRevoked || isError ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stroke/60 pt-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1e293b] text-xs font-black text-white shadow-sm">
                  {connection?.accountName?.charAt(0) || "G"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-ink">
                    {connection?.accountEmail || connection?.accountName || "Tài khoản Google"}
                  </p>
                  <p className="text-[11px] font-medium text-secondary">
                    <LocalizedText vi="Đồng bộ gần nhất: " en="Last synced: " />
                    <span className="font-bold">{formatLastSync(connection?.lastSyncedAt)}</span>
                  </p>
                  {connection?.lastSyncMessage ? (
                    <p className="mt-0.5 text-[10px] text-secondary/80 italic">{connection.lastSyncMessage}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isPending || isRevoked}
                  className="inline-flex min-h-10 items-center justify-center rounded-pill bg-ink px-4 text-xs font-black uppercase tracking-wider text-white shadow-soft transition hover:bg-pink active:scale-press disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <LocalizedText vi="ĐANG ĐỒNG BỘ..." en="SYNCING..." />
                  ) : (
                    <LocalizedText vi="ĐỒNG BỘ NGAY ↻" en="SYNC NOW ↻" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isPending}
                  className="inline-flex min-h-10 items-center justify-center rounded-pill border border-error/30 bg-error/5 px-3.5 text-xs font-bold text-error transition hover:bg-error hover:text-white active:scale-press disabled:opacity-50"
                >
                  <LocalizedText vi="Ngắt kết nối" en="Disconnect" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 border-t border-stroke/60 pt-4 text-center sm:text-left">
            <p className="text-xs font-medium text-secondary mb-3">
              <LocalizedText
                vi="Kết nối với Google Calendar để tự động đồng bộ lịch sản xuất 2 chiều, quản lý thời gian quay và ngăn ngừa xung đột lịch trình."
                en="Connect your Google Calendar to automatically synchronize production schedules two-way and prevent timetable conflicts."
              />
            </p>
            <a
              href="/api/integrations/google-calendar/connect"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-[#2563eb] px-5 text-xs font-black uppercase tracking-wider text-white shadow-soft transition hover:bg-[#1d4ed8] active:scale-press"
            >
              <GoogleCalendarIcon />
              <LocalizedText vi="Kết nối với Google Calendar" en="Connect Google Calendar" />
            </a>
          </div>
        )}
      </section>

      {/* Two-Way Sync Controls */}
      <section className="overflow-hidden rounded-r22 border border-stroke/70 bg-surface shadow-soft">
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-stroke/60 bg-bg text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v14M5 10l7 7 7-7M5 21h14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-ink leading-tight">
              <LocalizedText vi="Đồng bộ từ Google sang G.Lab" en="Sync from Google to G.Lab" />
            </p>
            <p className="mt-0.5 text-[11px] text-secondary">
              <LocalizedText vi="Nhập sự kiện vào lịch sản xuất" en="Import events to your schedule" />
            </p>
          </div>
          <Toggle
            checked={fromGoogle}
            onChange={handleToggleFromGoogle}
            disabled={!isConnected || isPending}
            label="Sync from Google to G.Lab"
          />
        </div>

        <div className="flex items-center gap-3.5 border-t border-stroke/60 px-4 py-3.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-stroke/60 bg-bg text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21V7M5 14l7-7 7 7M5 3h14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-ink leading-tight">
              <LocalizedText vi="Đồng bộ từ G.Lab sang Google" en="Sync from G.Lab to Google" />
            </p>
            <p className="mt-0.5 text-[11px] text-secondary">
              <LocalizedText vi="Xuất shoot sang Google Calendar" en="Export shoots to Google Calendar" />
            </p>
          </div>
          <Toggle
            checked={toGoogle}
            onChange={handleToggleToGoogle}
            disabled={!isConnected || isPending}
            label="Sync from G.Lab to Google"
          />
        </div>
      </section>

      {/* Sync Options Checkboxes */}
      <section className="rounded-r22 border border-stroke/70 bg-surface p-4 shadow-soft sm:p-5">
        <h2 className="mb-3 text-[13px] font-black text-ink">
          <LocalizedText vi="Tùy chọn đồng bộ" en="Sync options" />
        </h2>
        <div className="space-y-2.5">
          {[
            { key: "shoots" as const, vi: "Buổi quay", en: "Shoots" },
            { key: "meetings" as const, vi: "Cuộc họp", en: "Meetings" },
            { key: "locationScout" as const, vi: "Khảo sát bối cảnh", en: "Location scout" },
            { key: "internalEvents" as const, vi: "Sự kiện nội bộ", en: "Internal events" },
          ].map((item) => {
            const checked = options[item.key];
            return (
              <label key={item.key} className="flex cursor-pointer items-center gap-3 select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={!isConnected || isPending}
                  onClick={() => toggleOption(item.key)}
                  aria-label={`${checked ? "Disable" : "Enable"} ${item.en}`}
                  className={`grid size-10 place-items-center rounded-r10 transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    checked
                      ? "bg-ink text-white shadow-sm"
                      : "border border-stroke bg-white text-transparent"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <span className="text-[13px] font-bold text-ink">
                  <LocalizedText vi={item.vi} en={item.en} />
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Explicit Reconciliation & Conflict Rules Card */}
      <section className="rounded-r22 border border-stroke/70 bg-[#f8fafc] p-4 shadow-soft sm:p-5 text-ink space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-pink">
          <LocalizedText vi="Quy tắc đối soát dữ liệu & Nguồn chân lý" en="Reconciliation & Source of Truth Rules" />
        </h3>
        <ul className="text-xs font-medium text-secondary space-y-1.5 list-disc pl-4 leading-relaxed">
          <li>
            <strong className="text-ink font-bold">Nguồn chân lý (Source of Truth):</strong> G.Lab là hệ thống quyết định cho phân công nhân sự, thiết bị, dự án và checklist sản xuất.
          </li>
          <li>
            <strong className="text-ink font-bold">Thời gian & Địa điểm:</strong> Áp dụng cơ chế thay đổi mới nhất (Last-write-wins) giữa G.Lab và Google Calendar.
          </li>
          <li>
            <strong className="text-ink font-bold">Huỷ sự kiện:</strong> Khi sự kiện trên Google bị xoá, lịch quay tương ứng trên G.Lab được chuyển sang trạng thái <em>Đã huỷ</em> để bảo toàn lịch sử.
          </li>
          <li>
            <strong className="text-ink font-bold">Tính lũy đẳng (Idempotent):</strong> Đồng bộ nhiều lần đảm bảo không tạo bản ghi trùng lặp trên cả hai hệ thống.
          </li>
        </ul>
      </section>
    </AppScreen>
  );
}
