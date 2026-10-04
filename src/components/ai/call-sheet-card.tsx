"use client";

import { motion } from "motion/react";
import { DocumentText, Clock, Location, Profile2User, Camera, Warning2 } from "@/components/ui/iconsax";

export interface CallSheetItemData {
  shootId: string;
  title: string;
  date: string;
  timeRange: string;
  location: string;
  project: string;
  client: string;
  crew: Array<{ name: string; role: string }>;
  equipment: Array<{ name: string; code?: string; quantity: number }>;
  missingOperationalFacts: string[];
}

interface CallSheetCardProps {
  callSheets: CallSheetItemData[];
}

export function CallSheetCard({ callSheets }: CallSheetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-r22 border border-stroke/70 bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-stroke/60 bg-pink/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <DocumentText size={18} variant="Bold" className="text-pink" />
          <span className="font-display text-sm font-black uppercase tracking-wider text-ink">
            CALL SHEET / PRODUCTION BRIEF
          </span>
        </div>
        <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-secondary shadow-xs">
          {callSheets.length} Buổi quay
        </span>
      </div>

      <div className="divide-y divide-stroke/40 p-3 space-y-4">
        {callSheets.map((cs) => (
          <div key={cs.shootId} className="space-y-3 pt-3 first:pt-0">
            {/* Title & Project */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
                {cs.project} {cs.client !== "Chưa có thông tin khách hàng" ? `• ${cs.client}` : ""}
              </span>
              <h3 className="font-display text-base font-bold text-ink">{cs.title}</h3>
            </div>

            {/* Timing & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-r14 bg-bg/80 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-secondary">
                <Clock size={15} className="text-pink shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-ink/60">Giờ quay</p>
                  <p className="font-semibold text-ink">{cs.timeRange}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-secondary">
                <Location size={15} className="text-pink shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-ink/60">Địa điểm</p>
                  <p className="font-semibold text-ink truncate">{cs.location}</p>
                </div>
              </div>
            </div>

            {/* Crew section */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-secondary flex items-center gap-1">
                <Profile2User size={13} className="text-pink" />
                Ekip ({cs.crew.length})
              </p>
              {cs.crew.length === 0 ? (
                <p className="text-xs text-secondary italic">Chưa phân công nhân sự.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {cs.crew.map((c, idx) => (
                    <span
                      key={idx}
                      className="rounded-pill bg-bg border border-stroke/60 px-2.5 py-1 text-xs text-ink"
                    >
                      <strong className="font-bold">{c.name}</strong>{" "}
                      <span className="text-secondary text-[11px]">({c.role})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Equipment section */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-secondary flex items-center gap-1">
                <Camera size={13} className="text-pink" />
                Thiết bị ({cs.equipment.length})
              </p>
              {cs.equipment.length === 0 ? (
                <p className="text-xs text-secondary italic">Chưa đặt thiết bị.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {cs.equipment.map((g, idx) => (
                    <span
                      key={idx}
                      className="rounded-pill bg-bg border border-stroke/60 px-2.5 py-1 text-xs text-ink"
                    >
                      {g.name} {g.quantity > 1 ? `x${g.quantity}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Operational Facts Notice */}
            {cs.missingOperationalFacts.length > 0 && (
              <div className="rounded-r14 border border-amber-200/80 bg-amber-50/50 p-2.5 text-xs text-amber-900/90 flex items-start gap-2">
                <Warning2 size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Thông tin còn thiếu:</strong>
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    {cs.missingOperationalFacts.join(" • ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
