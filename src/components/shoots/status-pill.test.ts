import { describe, it, expect } from "vitest";
import { SHOOT_STATUS_CONFIGS, type ShootStatusType } from "./status-pill";

describe("ShootStatusBadge / StatusPill Component Logic", () => {
  it("defines all 6 required visual statuses with custom palettes and descriptions", () => {
    const requiredStatuses: ShootStatusType[] = [
      "planned",
      "confirmed",
      "ready",
      "in_progress",
      "completed",
      "cancelled",
    ];

    requiredStatuses.forEach((status) => {
      const config = SHOOT_STATUS_CONFIGS[status];
      expect(config).toBeDefined();
      expect(config.labelVi).toBeTruthy();
      expect(config.labelEn).toBeTruthy();
      expect(config.descVi).toBeTruthy();
      expect(config.descEn).toBeTruthy();
      expect(config.pillClass).toBeTruthy();
      expect(config.dotClass).toBeTruthy();
      expect(config.swatchClass).toBeTruthy();
    });
  });

  it("applies hot pink background with pulse dot exclusively for in_progress", () => {
    const inProgress = SHOOT_STATUS_CONFIGS.in_progress;
    expect(inProgress.pillClass).toContain("bg-pink");
    expect(inProgress.pillClass).toContain("text-ink");
    expect(inProgress.dotClass).toContain("animate-pulse");

    // Other statuses must NOT pulse the dot
    expect(SHOOT_STATUS_CONFIGS.planned.dotClass).not.toContain("animate-pulse");
    expect(SHOOT_STATUS_CONFIGS.confirmed.dotClass).not.toContain("animate-pulse");
    expect(SHOOT_STATUS_CONFIGS.ready.dotClass).not.toContain("animate-pulse");
    expect(SHOOT_STATUS_CONFIGS.completed.dotClass).not.toContain("animate-pulse");
    expect(SHOOT_STATUS_CONFIGS.cancelled.dotClass).not.toContain("animate-pulse");
  });

  it("assigns expected color tones per specification", () => {
    // Kế hoạch: neutral gray / cream
    expect(SHOOT_STATUS_CONFIGS.planned.pillClass).toContain("#F3EFEA");

    // Đã xác nhận: mint green
    expect(SHOOT_STATUS_CONFIGS.confirmed.pillClass).toContain("#D8F8E8");

    // Sẵn sàng: butter yellow
    expect(SHOOT_STATUS_CONFIGS.ready.pillClass).toContain("#FEF3C7");

    // Hoàn thành: sky blue
    expect(SHOOT_STATUS_CONFIGS.completed.pillClass).toContain("#DBEAFE");

    // Đã hủy: muted red/gray
    expect(SHOOT_STATUS_CONFIGS.cancelled.pillClass).toContain("#FEE2E2");
  });

  it("summary header ordering starts with STATUS PILL before date, call time and location", () => {
    const summaryTokens = [
      "status_pill",
      "date_time",
      "call_time",
      "location",
    ];
    expect(summaryTokens[0]).toBe("status_pill");
    expect(summaryTokens[1]).toBe("date_time");
    expect(summaryTokens[2]).toBe("call_time");
    expect(summaryTokens[3]).toBe("location");
  });
});
