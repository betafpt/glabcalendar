"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ArrowLeft2,
  MagicStar,
  TickCircle,
  CloseCircle,
  Warning2,
  Refresh2,
} from "@/components/ui/iconsax";
import {
  getAICredentialStatusAction,
  saveAICredentialAction,
  revokeAICredentialAction,
  type AICredentialStatusResult,
} from "./actions";

export default function AISettingsPage() {
  const [data, setData] = useState<AICredentialStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Key Edit State
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    const res = await getAICredentialStatusAction();
    if (res.ok && res.data) {
      setData(res.data);
    } else {
      setErrorMsg(res.error || "Không thể tải cấu hình.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await saveAICredentialAction(inputKey.trim());
    if (res.ok) {
      setSuccessMsg(res.message);
      setIsEditingKey(false);
      setInputKey("");
      await fetchStatus();
    } else {
      setErrorMsg(res.message);
    }
    setIsSaving(false);
  };

  const handleRevokeKey = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa cấu hình API key này không?")) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await revokeAICredentialAction();
    if (res.ok) {
      setSuccessMsg(res.message);
      await fetchStatus();
    } else {
      setErrorMsg(res.message);
    }
    setIsSaving(false);
  };

  const creditPercent = data
    ? Math.round(((data.monthlyCredits - data.usedCredits) / data.monthlyCredits) * 100)
    : 100;

  return (
    <AppScreen className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 pt-5 pb-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="grid size-10 place-items-center rounded-full border border-stroke bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"
          aria-label="Back to settings"
        >
          <ArrowLeft2 size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[1.85rem] font-black uppercase leading-none tracking-[-0.04em] text-ink sm:text-[2.2rem]">
              <LocalizedText vi="Cấu hình AI" en="AI Settings" />
              <span className="text-pink">*</span>
            </h1>
            <span className="rounded-pill bg-lilac/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#574ea2]">
              Security
            </span>
          </div>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[.25em] text-secondary sm:text-xs">
            <LocalizedText
              vi="QUẢN LÝ API KEY 302.AI & HẠN MỨC SỬ DỤNG"
              en="MANAGE 302.AI API KEY & USAGE QUOTA"
            />
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-r14 border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800">
          <span className="flex items-center gap-1.5">
            <TickCircle size={16} className="text-emerald-600" />
            {successMsg}
          </span>
          <button type="button" onClick={() => setSuccessMsg(null)}>
            <CloseCircle size={15} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between rounded-r14 border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800">
          <span className="flex items-center gap-1.5">
            <Warning2 size={16} className="text-rose-600" />
            {errorMsg}
          </span>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <CloseCircle size={15} />
          </button>
        </div>
      )}

      {/* Main Settings Sections */}
      <div className="space-y-4">
        {/* Card 1: Provider & BYOK Credential */}
        <section className="rounded-r22 border border-stroke/70 bg-surface p-4 shadow-soft space-y-3">
          <div className="flex items-center justify-between border-b border-stroke/50 pb-2.5">
            <div>
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-ink">
                <LocalizedText vi="NHÀ CUNG CẤP & API KEY" en="PROVIDER & API KEY" />
              </h2>
              <p className="text-[11px] text-secondary">
                <LocalizedText
                  vi="Mô hình BYOK (Bring Your Own Key) • Mã hóa AES-256-GCM an toàn"
                  en="BYOK Model (Bring Your Own Key) • Secured with AES-256-GCM"
                />
              </p>
            </div>
            <span className="rounded-pill bg-pink/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
              302.AI
            </span>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-secondary animate-pulse">
              Đang tải thông tin cấu hình...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-r16 bg-bg/70 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-secondary">Nhà cung cấp</p>
                  <p className="font-display text-xs font-bold text-ink mt-0.5">302.AI (OpenAI-compatible)</p>
                  <p className="text-[10px] text-secondary mt-1">Model: {data?.model || "gpt-4o"}</p>
                </div>

                <div className="rounded-r16 bg-bg/70 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-secondary">Trạng thái API Key</p>
                  <div className="flex items-center gap-2 mt-1">
                    {data?.configured ? (
                      <>
                        <TickCircle size={15} className="text-emerald-600" />
                        <span className="font-display text-xs font-bold text-ink tracking-wider">
                          {data.maskedKey || "••••••••39AF"}
                        </span>
                        <span className="ml-auto rounded-pill bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Đã cấu hình
                        </span>
                      </>
                    ) : (
                      <>
                        <CloseCircle size={15} className="text-secondary" />
                        <span className="text-xs text-secondary font-medium">Chưa thiết lập</span>
                        <span className="ml-auto rounded-pill bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-secondary">
                          Chưa có key
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons / Input Form */}
              {!isEditingKey ? (
                <div className="flex items-center justify-end gap-2 pt-1">
                  {data?.configured ? (
                    <>
                      <button
                        type="button"
                        onClick={handleRevokeKey}
                        disabled={isSaving}
                        className="rounded-pill border border-stroke bg-surface px-3 py-1.5 text-xs font-bold text-secondary transition hover:bg-rose-50 hover:text-rose-700 active:scale-press disabled:opacity-40"
                      >
                        Xóa API key
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingKey(true)}
                        disabled={isSaving}
                        className="rounded-pill bg-pink px-4 py-1.5 text-xs font-bold text-ink shadow-soft transition hover:opacity-90 active:scale-press disabled:opacity-40"
                      >
                        Thay API key
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingKey(true)}
                      className="rounded-pill bg-pink px-4 py-1.5 text-xs font-bold text-ink shadow-soft transition hover:opacity-90 active:scale-press"
                    >
                      Thêm API key 302.AI
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveKey} className="rounded-r16 border border-pink/30 bg-bg p-3 space-y-2.5">
                  <p className="text-xs font-bold text-ink">
                    <LocalizedText vi="Nhập API Key 302.AI mới" en="Enter new 302.AI API Key" />
                  </p>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="sk-..."
                    disabled={isSaving}
                    required
                    className="w-full rounded-r14 border border-stroke bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-pink"
                  />
                  <p className="text-[10px] text-secondary">
                    🔒 Khóa bí mật được mã hóa AES-256-GCM trên server và không bao giờ lưu trữ dạng văn bản thuần.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingKey(false);
                        setInputKey("");
                      }}
                      disabled={isSaving}
                      className="rounded-pill border border-stroke px-3 py-1 text-xs font-bold text-secondary transition hover:bg-surface"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || !inputKey.trim()}
                      className="rounded-pill bg-pink px-4 py-1 text-xs font-bold text-ink shadow-soft transition hover:opacity-90 disabled:opacity-40"
                    >
                      {isSaving ? "Đang mã hóa & lưu..." : "Lưu API Key"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>

        {/* Card 2: Entitlement & Quota (Credits) */}
        <section className="rounded-r22 border border-stroke/70 bg-surface p-4 shadow-soft space-y-3">
          <div className="flex items-center justify-between border-b border-stroke/50 pb-2.5">
            <div>
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-ink">
                <LocalizedText vi="GÓI TÀI KHOẢN & HẠN MỨC CREDITS" en="MEMBERSHIP PLAN & CREDITS" />
              </h2>
              <p className="text-[11px] text-secondary">
                <LocalizedText
                  vi="Hạn mức cấp tự động hàng tháng cho mỗi tài khoản / không gian làm việc"
                  en="Monthly quota allocated per account / workspace"
                />
              </p>
            </div>
            <span className="rounded-pill bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              {data?.planName || "Free Tier"}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-secondary">Credits còn lại:</span>
                <span className="font-bold text-ink">
                  {data?.remainingCredits ?? 100} / {data?.monthlyCredits ?? 100} credits
                </span>
              </div>
              <ProgressBar value={creditPercent} className="h-2.5" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-r14 bg-bg/70 p-2.5">
                <p className="text-[10px] uppercase font-bold text-secondary">Lượt yêu cầu AI</p>
                <p className="font-display text-base font-black text-ink mt-0.5">
                  {data?.totalRequests ?? 0}
                </p>
              </div>
              <div className="rounded-r14 bg-bg/70 p-2.5">
                <p className="text-[10px] uppercase font-bold text-secondary">Tổng Tokens xử lý</p>
                <p className="font-display text-base font-black text-ink mt-0.5">
                  {data?.totalTokens ? data.totalTokens.toLocaleString() : 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Card 3: Safe Diagnostics */}
        <section className="rounded-r22 border border-stroke/70 bg-surface p-4 shadow-soft space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-secondary">
            THÔNG TIN AN TOÀN & CHẨN ĐOÁN
          </p>
          <div className="divide-y divide-stroke/30 text-xs">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-secondary">Tài khoản xác thực:</span>
              <span className="font-bold text-ink">{data?.userEmail || "founder@glab.vn"}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-secondary">Nguồn chứng thực (Credential Source):</span>
              <span className="font-bold text-ink uppercase">
                {data?.ownerType === "user" ? "User BYOK" : data?.ownerType === "workspace" ? "Workspace BYOK" : "Mặc định hệ thống"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-secondary">Chuẩn mã hóa:</span>
              <span className="font-bold text-emerald-700">AES-256-GCM (Zero Plaintext)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-secondary">Model chỉ định:</span>
              <span className="font-bold text-ink">{data?.model || "gpt-4o"}</span>
            </div>
          </div>
        </section>
      </div>
    </AppScreen>
  );
}
