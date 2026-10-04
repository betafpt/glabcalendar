"use client";

import React, { useState, useTransition } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDown2, TickCircle } from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/ui/toast";
import { updateShootStatusAction } from "@/app/shoots/actions";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type ShootStatusType =
  | "planned"
  | "confirmed"
  | "ready"
  | "in_progress"
  | "completed"
  | "cancelled";

interface StatusConfig {
  value: ShootStatusType;
  labelVi: string;
  labelEn: string;
  descVi: string;
  descEn: string;
  // Pill styles
  pillClass: string;
  dotClass: string;
  // Dropdown swatch style
  swatchClass: string;
}

export const SHOOT_STATUS_CONFIGS: Record<ShootStatusType, StatusConfig> = {
  planned: {
    value: "planned",
    labelVi: "Kế hoạch",
    labelEn: "Planned",
    descVi: "Kế hoạch sơ bộ, chưa chốt lịch",
    descEn: "Preliminary schedule, draft",
    pillClass: "bg-[#F3EFEA] text-[#44403C] border-[#E5DDD4] hover:bg-[#EAE2D8]",
    dotClass: "bg-[#78716C]",
    swatchClass: "bg-[#F3EFEA] border-[#E5DDD4]",
  },
  confirmed: {
    value: "confirmed",
    labelVi: "Đã xác nhận",
    labelEn: "Confirmed",
    descVi: "Khách hàng & ekip đã chốt lịch",
    descEn: "Locked & confirmed by client",
    pillClass: "bg-[#D8F8E8] text-[#065F46] border-[#A7F3D0] hover:bg-[#C2F3DB]",
    dotClass: "bg-[#10B981]",
    swatchClass: "bg-[#D8F8E8] border-[#A7F3D0]",
  },
  ready: {
    value: "ready",
    labelVi: "Sẵn sàng",
    labelEn: "Ready",
    descVi: "Ekip, thiết bị & checklist đã chuẩn bị xong",
    descEn: "Crew, gear & checklist ready",
    pillClass: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]",
    dotClass: "bg-[#F59E0B]",
    swatchClass: "bg-[#FEF3C7] border-[#FDE68A]",
  },
  in_progress: {
    value: "in_progress",
    labelVi: "Đang diễn ra",
    labelEn: "In Progress",
    descVi: "Đang trong giờ bấm máy trên set",
    descEn: "Live shooting on set",
    pillClass: "bg-pink text-ink border-pink/50 hover:bg-[#FF358B] shadow-sm",
    dotClass: "bg-ink animate-pulse",
    swatchClass: "bg-pink border-pink/60",
  },
  completed: {
    value: "completed",
    labelVi: "Hoàn thành",
    labelEn: "Completed",
    descVi: "Đã đóng máy và kết thúc buổi quay",
    descEn: "Wrapped and completed",
    pillClass: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE] hover:bg-[#CBE1FD]",
    dotClass: "bg-[#3B82F6]",
    swatchClass: "bg-[#DBEAFE] border-[#BFDBFE]",
  },
  cancelled: {
    value: "cancelled",
    labelVi: "Đã hủy",
    labelEn: "Cancelled",
    descVi: "Buổi quay đã hoãn hoặc hủy bỏ",
    descEn: "Shoot cancelled or postponed",
    pillClass: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] hover:bg-[#FDD2D2]",
    dotClass: "bg-[#EF4444]",
    swatchClass: "bg-[#FEE2E2] border-[#FECACA]",
  },
};

export interface StatusPillProps {
  status: string;
  shootId?: string;
  editable?: boolean;
  onStatusChange?: (newStatus: ShootStatusType) => void;
  className?: string;
}

export function StatusPill({
  status,
  shootId,
  editable = true,
  onStatusChange,
  className = "",
}: StatusPillProps) {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ShootStatusType>(
    (status as ShootStatusType) in SHOOT_STATUS_CONFIGS
      ? (status as ShootStatusType)
      : "planned"
  );
  const [isPending, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  // Đồng bộ prop status nếu có thay đổi từ ngoài
  React.useEffect(() => {
    if ((status as ShootStatusType) in SHOOT_STATUS_CONFIGS) {
      setCurrentStatus(status as ShootStatusType);
    }
  }, [status]);

  const config = SHOOT_STATUS_CONFIGS[currentStatus] ?? SHOOT_STATUS_CONFIGS.planned;
  const isEditable = editable && Boolean(shootId || onStatusChange);

  const handleSelectStatus = (newStatus: ShootStatusType) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    const previousStatus = currentStatus;
    setCurrentStatus(newStatus);
    setIsOpen(false);
    onStatusChange?.(newStatus);

    if (shootId) {
      startTransition(async () => {
        const result = await updateShootStatusAction(shootId, newStatus);
        if (result.ok) {
          const nextConfig = SHOOT_STATUS_CONFIGS[newStatus];
          const label = locale === "vi" ? nextConfig.labelVi : nextConfig.labelEn;
          showToast({
            message:
              locale === "vi"
                ? `Đã chuyển trạng thái sang "${label}"`
                : `Updated status to "${label}"`,
          });
        } else {
          // Revert nếu lỗi
          setCurrentStatus(previousStatus);
          showToast({
            message:
              result.messageVi ||
              result.messageEn ||
              (locale === "vi"
                ? "Không thể đổi trạng thái lúc này"
                : "Unable to update status"),
          });
        }
      });
    }
  };

  // Pill Trigger UI
  const pillContent = (
    <motion.div
      initial={false}
      animate={{ opacity: isPending ? 0.6 : 1, scale: isPending ? 0.98 : 1 }}
      transition={
        shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
      }
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.09em] transition-all duration-fast select-none sm:min-h-[40px] sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-xs sm:tracking-wider",
        config.pillClass,
        isEditable ? "cursor-pointer active:scale-press" : "cursor-default",
        className
      )}
    >
      {/* Status Dot: chỉ pulse nhẹ ở in_progress */}
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full shrink-0 sm:size-2.5", config.dotClass)}
      />

      {/* Label */}
      <span className="leading-none whitespace-nowrap">
        {locale === "vi" ? config.labelVi : config.labelEn}
      </span>

      {/* Small Chevron if editable */}
      {isEditable && (
        <span
          className={cn(
            "grid size-3.5 place-items-center opacity-70 transition-transform duration-200 sm:size-4",
            isOpen && "rotate-180 opacity-100"
          )}
        >
          <ArrowDown2 size={12} variant="Linear" className="sm:size-[13px]" />
        </span>
      )}
    </motion.div>
  );

  if (!isEditable) {
    return pillContent;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            locale === "vi"
              ? `Trạng thái: ${config.labelVi}. Bấm để thay đổi.`
              : `Status: ${config.labelEn}. Click to change.`
          }
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-pill"
          onClick={(e) => {
            // Ngăn chặn nổi bọt sự kiện lên AccordionTrigger bên ngoài
            e.stopPropagation();
          }}
        >
          {pillContent}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-76 sm:w-84 rounded-r24 border border-stroke/90 bg-surface/95 p-2 shadow-xl backdrop-blur-md z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 pt-1 pb-2 border-b border-stroke/50">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-secondary">
            <LocalizedText vi="CHUYỂN TRẠNG THÁI BUỔI QUAY" en="CHANGE SHOOT STATUS" />
          </p>
        </div>

        <div className="mt-1 space-y-1" role="radiogroup" aria-label="Shoot Status Options">
          {(Object.keys(SHOOT_STATUS_CONFIGS) as ShootStatusType[]).map((key) => {
            const item = SHOOT_STATUS_CONFIGS[key];
            const isSelected = key === currentStatus;

            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectStatus(key)}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-r18 p-2.5 text-left transition duration-fast select-none active:scale-[.99]",
                  isSelected
                    ? "bg-white border border-stroke shadow-xs"
                    : "hover:bg-white/80 hover:border-stroke/50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Swatch with Dot */}
                  <div
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border",
                      item.swatchClass
                    )}
                  >
                    <span className={cn("size-2 rounded-full", item.dotClass)} />
                  </div>

                  {/* Texts */}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase tracking-wider text-ink leading-tight">
                      {locale === "vi" ? item.labelVi : item.labelEn}
                    </p>
                    <p className="truncate text-[10px] font-medium text-secondary/80 leading-normal">
                      {locale === "vi" ? item.descVi : item.descEn}
                    </p>
                  </div>
                </div>

                {/* Selected Checkmark */}
                {isSelected ? (
                  <div className="shrink-0 text-pink">
                    <TickCircle size={18} variant="Bold" />
                  </div>
                ) : (
                  <div className="size-4 shrink-0 rounded-full border border-stroke/60 opacity-30" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const ShootStatusBadge = StatusPill;
