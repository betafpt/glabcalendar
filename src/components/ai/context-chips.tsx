"use client";

interface ContextChipsProps {
  onSelectChip: (text: string) => void;
  disabled?: boolean;
}

const CHIPS = [
  { label: "Hôm nay", prompt: "Hôm nay tôi có lịch gì?" },
  { label: "Tuần này", prompt: "Tóm tắt production tuần này" },
  { label: "Khung giờ trống", prompt: "Tìm một buổi trống 4 tiếng tuần sau" },
  { label: "Kiểm tra trùng", prompt: "Tuần này có lịch nào bị trùng không?" },
  { label: "Call sheet ngày mai", prompt: "Tạo call sheet cho ngày mai" },
  { label: "Độ sẵn sàng", prompt: "Kiểm tra độ sẵn sàng của các buổi quay sắp tới" },
];

export function ContextChips({ onSelectChip, disabled }: ContextChipsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {CHIPS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelectChip(chip.prompt)}
          className="min-h-10 shrink-0 rounded-pill border border-stroke/70 bg-surface px-3 py-1.5 text-[11px] font-bold text-ink/80 shadow-xs transition hover:border-pink/40 hover:bg-white active:scale-press disabled:opacity-40"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
