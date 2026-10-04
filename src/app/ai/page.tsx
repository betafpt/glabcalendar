"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Refresh2,
  CloseCircle,
  MagicStar,
  Setting2,
} from "@/components/ui/iconsax";

import { sendAIMessageAction } from "./actions";
import type { AIMessage, AIProposal } from "@/server/ai/types";
import { ScheduleSummaryCard } from "@/components/ai/schedule-summary-card";
import { ConflictCard } from "@/components/ai/conflict-card";
import { FreeSlotCard } from "@/components/ai/free-slot-card";
import { ReadinessCard } from "@/components/ai/readiness-card";
import { ProposalConfirmationCard } from "@/components/ai/proposal-confirmation-card";
import { CallSheetCard } from "@/components/ai/call-sheet-card";
import { DailyBriefCard } from "@/components/ai/daily-brief-card";
import { ContextChips } from "@/components/ai/context-chips";

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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cardType?: "schedule_summary" | "conflict_alert" | "free_slots" | "readiness" | "project_summary" | "mutation_proposal" | "call_sheet" | "daily_brief" | "text";
  cardData?: any;
  proposal?: AIProposal;
  createdAt: Date;
}

export default function AiPage() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Global shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || draft).trim();
    if (!prompt || isPending) return;

    setErrorMsg(null);
    setDraft("");

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: prompt,
      createdAt: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsPending(true);

    try {
      const historyPayload: AIMessage[] = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAIMessageAction(prompt, historyPayload.slice(-6));

      if (!res.ok) {
        setErrorMsg(res.error || "Không thể nhận phản hồi từ Trợ lý AI.");
        return;
      }

      if (res.response) {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: res.response.content,
          cardType: res.response.cardType,
          cardData: res.response.cardData,
          proposal: res.response.proposal,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối.");
    } finally {
      setIsPending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg(null);
  };

  return (
    <AppScreen className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 pt-5 pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/settings"
            className="grid size-10 place-items-center rounded-full border border-stroke bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press shrink-0"
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
            <p className="mt-1 text-[10px] font-black uppercase tracking-[.25em] text-secondary sm:text-xs truncate">
              <LocalizedText vi="COPILOT QUẢN LÝ LỊCH & VẬN HÀNH SẢN XUẤT" en="PRODUCTION PLANNING COPILOT" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/ai/settings"
            className="grid size-9 place-items-center rounded-full border border-stroke bg-surface text-secondary shadow-xs transition hover:bg-white hover:text-ink active:scale-press"
            aria-label="AI settings"
            title="Cài đặt AI"
          >
            <Setting2 size={16} />
          </Link>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-pill border border-stroke bg-surface px-3 py-1.5 text-[11px] font-bold text-secondary shadow-xs transition hover:bg-white hover:text-ink active:scale-press shrink-0"
            title="Xóa đoạn hội thoại"
          >
            <Refresh2 size={13} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        )}
        </div>
      </div>

      {/* Main Conversation / Suggestions Canvas */}
      <div className="flex-1 flex flex-col gap-4 min-h-[300px]">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="initial-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Suggested prompts responsive card grid */}
              <section>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[.2em] text-secondary">
                  <LocalizedText vi="GỢI Ý CÂU LỆNH" en="SUGGESTED PROMPTS" />
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggestions.map(([vi, en], idx) => (
                    <button
                      key={en}
                      type="button"
                      onClick={() => handleSendMessage(vi)}
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
                  ))}
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
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] sm:max-w-[70%] rounded-r20 bg-ink px-4 py-3 text-xs font-medium text-white shadow-soft">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="w-full max-w-full sm:max-w-[95%] space-y-3">
                      {/* Structured Result Cards */}
                      {msg.proposal && (
                        <ProposalConfirmationCard
                          proposal={msg.proposal}
                          onCompleted={(info) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: `ack-${Date.now()}`,
                                role: "assistant",
                                content: `✓ ${info}`,
                                createdAt: new Date(),
                              },
                            ]);
                          }}
                        />
                      )}

                      {msg.cardType === "schedule_summary" && msg.cardData?.events && (
                        <ScheduleSummaryCard
                          dateLabel={msg.cardData.range ? "LỊCH TRÌNH" : "HÔM NAY"}
                          totalEvents={msg.cardData.total || msg.cardData.events.length}
                          events={msg.cardData.events}
                        />
                      )}

                      {msg.cardType === "conflict_alert" && msg.cardData?.conflicts && (
                        <ConflictCard
                          totalConflicts={msg.cardData.totalConflicts || msg.cardData.conflicts.length}
                          conflicts={msg.cardData.conflicts}
                        />
                      )}

                      {msg.cardType === "free_slots" && msg.cardData?.slots && (
                        <FreeSlotCard
                          slots={msg.cardData.slots}
                          onSelectSlot={(slot) => {
                            setDraft(`Tạo lịch quay vào ${slot.date} từ ${slot.start} đến ${slot.end}`);
                            inputRef.current?.focus();
                          }}
                        />
                      )}

                      {msg.cardType === "readiness" && msg.cardData?.title && (
                        <ReadinessCard
                          title={msg.cardData.title}
                          date={msg.cardData.date}
                          readinessPercent={msg.cardData.readinessPercent || 0}
                          status={msg.cardData.status || "Kế hoạch"}
                          checklistProgress={msg.cardData.checklistProgress}
                          missingRequirements={msg.cardData.missingRequirements || []}
                        />
                      )}

                      {msg.cardType === "call_sheet" && msg.cardData?.callSheets && (
                        <CallSheetCard callSheets={msg.cardData.callSheets} />
                      )}

                      {msg.cardType === "daily_brief" && msg.cardData?.shoots && (
                        <DailyBriefCard
                          date={msg.cardData.date}
                          totalShoots={msg.cardData.totalShoots || 0}
                          shoots={msg.cardData.shoots}
                          notices={msg.cardData.notices || []}
                        />
                      )}

                      {/* Natural Language Explanation Text */}
                      {msg.content && msg.content !== "Đã xử lý thông tin thành công." && (
                        <div className="rounded-r20 border border-stroke/70 bg-surface px-4 py-3 text-xs leading-relaxed text-ink/90 shadow-soft">
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isPending && (
                <div className="flex items-center gap-2 text-xs font-bold text-secondary animate-pulse p-2">
                  <MagicStar size={16} className="text-pink animate-spin" />
                  <span>G.Lab Copilot đang phân tích và xử lý dữ liệu...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-r14 border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <CloseCircle size={15} />
          </button>
        </div>
      )}

      {/* Floating Bottom Chat Composer Area */}
      <div className="mt-auto space-y-2">
        {/* Rapid Context Chips */}
        <ContextChips
          disabled={isPending}
          onSelectChip={(prompt) => handleSendMessage(prompt)}
        />

        <div className="rounded-r28 border border-stroke/70 bg-surface p-2 shadow-soft">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 rounded-r22 bg-bg px-2.5 py-1.5"
          >
            <button
              type="button"
              aria-label="Voice input"
              disabled
              title="Tính năng Voice Input đang phát triển"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-stroke/60 bg-surface text-secondary opacity-40 cursor-not-allowed"
            >
              <Microphone2 size={18} variant="Linear" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={isPending}
              placeholder="Hỏi G.Lab Copilot... (Ctrl + K)"
              className="min-h-9 flex-1 bg-transparent px-2 text-xs font-medium text-ink placeholder:text-secondary outline-none disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!draft.trim() || isPending}
              aria-label="Send prompt"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-pink text-ink font-black shadow-sm transition hover:opacity-90 active:scale-press disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <div className="size-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              ) : (
                <Send2 size={18} variant="Bold" />
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] leading-4 text-secondary">
          <LocalizedText
            vi="G.Lab Production Copilot • Mọi đề xuất dời / tạo lịch đều cần bạn xác nhận trước khi thực thi."
            en="G.Lab Production Copilot • All scheduling mutations require your confirmation before execution."
          />
        </p>
      </div>
    </AppScreen>
  );
}
