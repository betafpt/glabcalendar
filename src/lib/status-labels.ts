export type StatusDefinition = {
  vi: string;
  en: string;
  tone: "success" | "warning" | "error" | "neutral";
};

export const STATUS_MAP: Record<string, StatusDefinition> = {
  confirmed: { vi: "Đã xác nhận", en: "Confirmed", tone: "success" },
  ready: { vi: "Sẵn sàng", en: "Ready", tone: "warning" },
  planned: { vi: "Kế hoạch", en: "Planned", tone: "warning" },
  in_progress: { vi: "Đang diễn ra", en: "In progress", tone: "warning" },
  completed: { vi: "Hoàn thành", en: "Completed", tone: "neutral" },
  cancelled: { vi: "Đã hủy", en: "Cancelled", tone: "error" },
  active: { vi: "Đang thực hiện", en: "Active", tone: "success" },
  archived: { vi: "Lưu trữ", en: "Archived", tone: "neutral" },
  available: { vi: "Sẵn sàng", en: "Available", tone: "success" },
  maintenance: { vi: "Bảo trì", en: "Maintenance", tone: "warning" },
  retired: { vi: "Ngừng sử dụng", en: "Retired", tone: "neutral" },
  inactive: { vi: "Tạm ngưng", en: "Inactive", tone: "neutral" },
};

export function getStatusLabel(status: string | null | undefined, locale: "vi" | "en" = "vi"): string {
  if (!status) return "";
  const key = status.trim().toLowerCase();
  const def = STATUS_MAP[key];
  if (def) return def[locale];
  return status.replaceAll("_", " ");
}

export function getStatusTone(status: string | null | undefined): "success" | "warning" | "error" | "neutral" {
  if (!status) return "neutral";
  const key = status.trim().toLowerCase();
  return STATUS_MAP[key]?.tone ?? "neutral";
}
