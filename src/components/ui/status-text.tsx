"use client";

import { useLanguage } from "@/components/language-provider";

const labels: Record<string, { vi: string; en: string }> = {
  planned: { vi: "Kế hoạch", en: "Planned" },
  active: { vi: "Đang thực hiện", en: "Active" },
  completed: { vi: "Hoàn thành", en: "Completed" },
  archived: { vi: "Lưu trữ", en: "Archived" },
  confirmed: { vi: "Đã xác nhận", en: "Confirmed" },
  in_progress: { vi: "Đang diễn ra", en: "In progress" },
  cancelled: { vi: "Đã hủy", en: "Cancelled" },
  inactive: { vi: "Tạm ngưng", en: "Inactive" },
  available: { vi: "Sẵn sàng", en: "Available" },
  maintenance: { vi: "Bảo trì", en: "Maintenance" },
  retired: { vi: "Ngừng sử dụng", en: "Retired" },
};

export function StatusText({ status }: { status: string }) {
  const { locale } = useLanguage();
  const label = labels[status.toLowerCase()];
  return <>{label ? label[locale] : status.replaceAll("_", " ")}</>;
}
