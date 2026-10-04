"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { CompactPageHeader } from "@/components/ui/compact-page-header";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { LocalizedText } from "@/components/ui/localized-text";
import { logoutAction } from "@/app/login/actions";
import { clearClientDataOnSignOut } from "@/lib/client-cleanup";

import {
  User,
  People,
  Notification,
  Category,
  Sun1,
  Global,
  MagicStar,
  Card,
  LogoutCurve,
  ArrowRight2,
} from "@/components/ui/iconsax";

type SettingsRow = {
  vi: string;
  en: string;
  subVi: string;
  subEn: string;
  icon: ReactNode;
  href?: string;
  isLanguage?: boolean;
  available?: boolean;
};

const settingsRows: SettingsRow[] = [
  {
    vi: "Tài khoản",
    en: "Account",
    subVi: "Hồ sơ, email, mật khẩu",
    subEn: "Profile, email, password",
    href: "/settings/account",
    available: true,
    icon: <User size={18} variant="Linear" />,
  },
  {
    vi: "Đội ngũ",
    en: "Team",
    subVi: "Quản lý thành viên",
    subEn: "Manage team members",
    href: "/settings/team",
    available: true,
    icon: <People size={18} variant="Linear" />,
  },
  {
    vi: "Thông báo",
    en: "Notifications",
    subVi: "Email, push notifications",
    subEn: "Email, push notifications",
    available: false,
    icon: <Notification size={18} variant="Linear" />,
  },
  {
    vi: "Tích hợp",
    en: "Integrations",
    subVi: "Google Calendar, Gmail",
    subEn: "Google Calendar, Gmail",
    href: "/integrations/google-calendar",
    icon: <Category size={18} variant="Linear" />,
  },
  {
    vi: "Giao diện",
    en: "Appearance",
    subVi: "Sáng / Tối / Hệ thống",
    subEn: "Light / Dark / System",
    available: false,
    icon: <Sun1 size={18} variant="Linear" />,
  },
  {
    vi: "Ngôn ngữ",
    en: "Language",
    subVi: "Tiếng Việt / English",
    subEn: "English / Tiếng Việt",
    isLanguage: true,
    icon: <Global size={18} variant="Linear" />,
  },
  {
    vi: "Trợ lý AI",
    en: "AI Assistant",
    subVi: "API Key 302.AI, Model & Hạn mức",
    subEn: "302.AI Key, Model & Quota",
    href: "/settings/ai",
    available: true,
    icon: <MagicStar size={18} variant="Linear" />,
  },
  {
    vi: "Thanh toán",
    en: "Billing",
    subVi: "Quản lý gói dịch vụ",
    subEn: "Manage subscription",
    available: false,
    icon: <Card size={18} variant="Linear" />,
  },
];

export default function SettingsPage() {
  return (
    <AppScreen className="space-y-4 pt-5 sm:space-y-5">
      <CompactPageHeader
        viTitle="Cài đặt"
        enTitle="Settings"
        viSubtitle="Cấu hình hệ thống & tài khoản"
        enSubtitle="Preferences & workspace"
      />

      {/* User Account / Profile Card */}
      <section className="flex items-center gap-3.5 rounded-r22 border border-stroke/70 bg-surface p-4 shadow-soft">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#1e293b] text-sm font-black text-white shadow-sm">
          GL
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-tight text-ink">G.Lab Studio</p>
          <p className="mt-0.5 truncate text-xs font-medium text-secondary">
            <LocalizedText vi="Không gian sản xuất" en="Production Workspace" />
          </p>
        </div>
        <span className="rounded-pill bg-ink/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
          <LocalizedText vi="Sắp có" en="Coming soon" />
        </span>
      </section>

      {/* Settings Navigation List */}
      <section className="overflow-hidden rounded-r22 border border-stroke/70 bg-surface shadow-soft">
        {settingsRows.map((row, index) => {
          if (row.isLanguage) {
            return (
              <div
                key={row.en}
                className={`flex min-h-[58px] items-center gap-3.5 px-4 py-3 ${
                  index ? "border-t border-stroke/60" : ""
                }`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-stroke/60 bg-bg text-secondary">
                  {row.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold leading-tight text-ink">
                    <LocalizedText vi={row.vi} en={row.en} />
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-secondary">
                    <LocalizedText vi={row.subVi} en={row.subEn} />
                  </p>
                </div>
                <LanguageSwitcher compact />
              </div>
            );
          }

          const rowContent = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-stroke/60 bg-bg text-secondary transition group-hover:text-ink">
                {row.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold leading-tight text-ink">
                  <LocalizedText vi={row.vi} en={row.en} />
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-secondary">
                  <LocalizedText vi={row.subVi} en={row.subEn} />
                </p>
              </div>
              {row.available === false ? (
                <span className="rounded-pill bg-ink/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-secondary">
                  <LocalizedText vi="Sắp có" en="Coming soon" />
                </span>
              ) : (
                <span className="grid size-6 place-items-center text-secondary/60 transition group-hover:translate-x-0.5">
                  <ArrowRight2 size={16} />
                </span>
              )}
            </>
          );

          if (row.href) {
            return (
              <Link
                key={row.en}
                href={row.href}
                className={`group flex min-h-[58px] items-center gap-3.5 px-4 py-3 transition hover:bg-white active:scale-press ${
                  index ? "border-t border-stroke/60" : ""
                }`}
              >
                {rowContent}
              </Link>
            );
          }

          return (
            <div
              key={row.en}
              aria-disabled="true"
              className={`flex min-h-[58px] items-center gap-3.5 px-4 py-3 opacity-75 ${
                index ? "border-t border-stroke/60" : ""
              }`}
            >
              {rowContent}
            </div>
          );
        })}
      </section>

      {/* Sign Out Card */}
      <section className="overflow-hidden rounded-r22 border border-error/20 bg-surface shadow-soft p-4">
        <form
          action={async () => {
            await clearClientDataOnSignOut();
            await logoutAction();
          }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-error/10 text-error">
              <LogoutCurve size={18} variant="Linear" />
            </span>
            <div>
              <p className="text-sm font-black text-ink">
                <LocalizedText vi="Đăng xuất" en="Sign out" />
              </p>
              <p className="text-xs font-semibold text-secondary">
                <LocalizedText vi="Kết thúc phiên làm việc trên thiết bị này" en="End current session on this device" />
              </p>
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center rounded-pill border border-error/40 bg-error/10 px-4 text-xs font-black uppercase tracking-wider text-error transition hover:bg-error hover:text-white active:scale-press"
          >
            <LocalizedText vi="Đăng xuất" en="Sign out" />
          </button>
        </form>
      </section>
    </AppScreen>
  );
}
