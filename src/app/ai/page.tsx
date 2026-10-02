"use client";

import Link from "next/link";
import { useState } from "react";
import { AppScreen } from "@/components/ui/app-screen";
import { LocalizedText } from "@/components/ui/localized-text";
import {
  ArrowLeft2,
  ArrowRight2,
  CalendarAdd,
  DocumentText,
  UserSearch,
  Camera,
  Clock,
  Microphone2,
  Send2,
} from "@/components/ui/iconsax";

const suggestions = [
  ["Lên lịch buổi quay mới từ ghi chú", "Plan a new shoot from my notes"],
  ["Tạo call sheet cho ngày mai", "Create a call sheet for tomorrow"],
  ["Kiểm tra lịch rảnh của crew", "Check crew availability"],
  ["Liệt kê gear của dự án này", "List all gear for this project"],
  ["Tìm khung giờ tốt nhất tuần sau", "Find the best time next week for a shoot"],
];

const suggestionIcons = [
  <CalendarAdd key="cal" size={18} variant="Linear" className="text-pink" />,
  <DocumentText key="doc" size={18} variant="Linear" className="text-[#6366f1]" />,
  <UserSearch key="usr" size={18} variant="Linear" className="text-[#0ea5e9]" />,
  <Camera key="cam" size={18} variant="Linear" className="text-[#10b981]" />,
  <Clock key="clk" size={18} variant="Linear" className="text-[#f59e0b]" />,
];

export default function AiPage() {
  const [draft, setDraft] = useState("");

  return (
    <AppScreen className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 pt-5">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="grid size-10 place-items-center rounded-full border border-stroke bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"
          aria-label="Back"
        >
          <ArrowLeft2 size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[1.85rem] font-black uppercase leading-none tracking-[-0.04em] text-ink sm:text-[2.2rem]">
              <LocalizedText vi="Trợ lý AI" en="AI Assistant" />
              <span className="text-pink">*</span>
            </h1>
            <span className="rounded-pill bg-lilac/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#574ea2]">
              Beta
            </span>
          </div>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[.25em] text-secondary sm:text-xs">
            <LocalizedText vi="COPILOT QUẢN LÝ LỊCH & VẬN HÀNH SẢN XUẤT" en="PRODUCTION PLANNING COPILOT" />
          </p>
        </div>
      </div>

      {/* Suggested prompts responsive card grid */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[.2em] text-secondary">
          <LocalizedText vi="GỢI Ý CÂU LỆNH" en="SUGGESTED PROMPTS" />
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {suggestions.map(([vi, en], idx) => {
            return (
              <button
                key={en}
                type="button"
                onClick={() => setDraft(en)}
                className="group flex min-h-[52px] items-center gap-3 rounded-r16 border border-stroke/70 bg-surface p-3 text-left text-xs font-bold text-ink shadow-soft transition duration-fast hover:border-pink/30 hover:bg-white active:scale-press"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg text-sm group-hover:scale-110 transition duration-fast">
                  {suggestionIcons[idx % suggestionIcons.length]}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <LocalizedText vi={vi} en={en} />
                </span>
                <span className="text-secondary/50 transition group-hover:translate-x-0.5 group-hover:text-pink">
                  <ArrowRight2 size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Rich example prompt card */}
      <section className="rounded-r22 border border-stroke/70 bg-surface p-4 shadow-soft">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-secondary">
          <LocalizedText vi="Câu lệnh mẫu" en="Example prompt" />
        </p>
        <p className="text-xs leading-relaxed text-ink/85">
          <LocalizedText
            vi="Lên kế hoạch quay sản phẩm sáng thứ Sáu tới tại ROMRA Studio với 3 đồ uống. Sử dụng FX3, 24–70mm và 90mm macro. Phân công Nam và Linh. Tạo checklist và thêm vào lịch."
            en="Plan a product shoot next Friday morning at ROMRA studio with 3 drinks. Use FX3, 24-70mm and 90mm macro. Assign Nam and Linh. Create checklist and add to calendar."
          />
        </p>
      </section>

      {/* Floating Bottom Chat Input */}
      <div className="mt-auto rounded-r28 border border-stroke/70 bg-surface p-2 shadow-soft">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="flex items-center gap-2 rounded-r22 bg-bg px-2.5 py-1.5"
        >
          <button
            type="button"
            aria-label="Voice input"
            disabled
            title="Voice input is not available yet"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-stroke/60 bg-surface text-secondary opacity-45"
          >
            <Microphone2 size={18} variant="Linear" />
          </button>

          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask G.Lab AI..."
            className="min-h-9 flex-1 bg-transparent px-2 text-xs font-medium text-ink placeholder:text-secondary outline-none"
          />

          <button
            type="submit"
            disabled
            aria-label="Send prompt"
            title="AI actions are not available yet"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-pink text-white font-black shadow-sm opacity-50"
          >
            <Send2 size={18} variant="Bold" />
          </button>
        </form>
      </div>

      <p className="text-center text-[10px] leading-4 text-secondary">
        <LocalizedText
          vi="Bản xem trước giao diện. Gửi lệnh và nhập giọng nói chưa khả dụng."
          en="Interface preview. Sending prompts and voice input are not available yet."
        />
      </p>
    </AppScreen>
  );
}
