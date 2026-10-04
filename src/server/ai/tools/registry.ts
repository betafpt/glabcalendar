import type { AIToolDefinition } from "../types";
import type { AIContext } from "./context";
import { queryScheduleTool, findEventsTool, findFreeSlotsTool } from "./schedule-tools";
import { checkConflictsTool, checkMissingInfoTool } from "./conflict-tools";
import {
  getCrewAvailabilityTool,
  getEquipmentAvailabilityTool,
  getProjectSummaryTool,
  checkProductionReadinessTool,
  generateCallSheetDataTool,
  getDailyBriefTool,
} from "./crew-gear-tools";
import { createShootProposal, createMoveShootProposal, createBulkMoveProposal } from "../actions/proposals";

export const AI_COPILOT_TOOLS: AIToolDefinition[] = [
  {
    name: "querySchedule",
    description: "Tra cứu lịch sản xuất, lịch quay trong một khoảng thời gian cụ thể (hôm nay, ngày mai, tuần này, hoặc ngày bất kỳ).",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Ngày bắt đầu định dạng YYYY-MM-DD hoặc ISO" },
        endDate: { type: "string", description: "Ngày kết thúc định dạng YYYY-MM-DD hoặc ISO" },
        query: { type: "string", description: "Từ khóa lọc thêm (nếu có)" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "findEvents",
    description: "Tìm kiếm các buổi quay hoặc sự kiện theo tên dự án, khách hàng hoặc từ khóa liên quan.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tên dự án, khách hàng hoặc từ khóa cần tìm (ví dụ: VinFast, Nike)" },
        startDate: { type: "string", description: "Ngày bắt đầu tìm kiếm (tùy chọn)" },
        endDate: { type: "string", description: "Ngày kết thúc tìm kiếm (tùy chọn)" },
      },
      required: ["query"],
    },
  },
  {
    name: "findFreeSlots",
    description: "Tìm các khoảng thời gian trống không bị vướng lịch quay (ví dụ: tìm một buổi trống 4 tiếng tuần sau).",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Ngày bắt đầu tìm kiếm (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Ngày kết thúc tìm kiếm (YYYY-MM-DD)" },
        durationHours: { type: "number", description: "Thời lượng trống cần tìm theo giờ (mặc định 4)" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "checkConflicts",
    description: "Kiểm tra phát hiện trùng lịch (xung đột nhân sự crew hoặc thiết bị gear) trong tuần này hoặc khoảng thời gian chỉ định.",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Ngày bắt đầu kiểm tra (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Ngày kết thúc kiểm tra (YYYY-MM-DD)" },
      },
    },
  },
  {
    name: "checkMissingInfo",
    description: "Kiểm tra các buổi quay sắp tới bị thiếu thông tin quan trọng (thiếu địa điểm location, thiếu call time, chưa xếp crew, chưa đặt gear).",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Ngày bắt đầu (tùy chọn)" },
        endDate: { type: "string", description: "Ngày kết thúc (tùy chọn)" },
      },
    },
  },
  {
    name: "getCrewAvailability",
    description: "Kiểm tra lịch rảnh và phân công của nhân sự crew vào một ngày cụ thể hoặc theo vai trò.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Ngày cần kiểm tra (YYYY-MM-DD)" },
        role: { type: "string", description: "Vai trò cần lọc (ví dụ: Đạo diễn, Quay phim, Makeup)" },
      },
      required: ["date"],
    },
  },
  {
    name: "getEquipmentAvailability",
    description: "Kiểm tra tình trạng thiết bị / gear (ví dụ: FX3, máy quay, đèn) có còn trống vào ngày chỉ định hay không.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Ngày cần kiểm tra (YYYY-MM-DD)" },
        query: { type: "string", description: "Tên thiết bị (ví dụ: FX3, Sony, Macro)" },
        category: { type: "string", description: "Loại thiết bị (Camera, Lens, Lighting)" },
      },
      required: ["date"],
    },
  },
  {
    name: "getProjectSummary",
    description: "Tóm tắt tiến độ, số buổi quay, tình trạng hoàn thành và các cảnh báo của một dự án (Project Copilot).",
    parameters: {
      type: "object",
      properties: {
        projectQuery: { type: "string", description: "Tên dự án hoặc tên khách hàng cần xem (ví dụ: VinFast)" },
      },
      required: ["projectQuery"],
    },
  },
  {
    name: "checkProductionReadiness",
    description: "Kiểm tra độ sẵn sàng sản xuất (Production Readiness %) và các đầu việc còn thiếu của một buổi quay cụ thể.",
    parameters: {
      type: "object",
      properties: {
        shootIdOrTitle: { type: "string", description: "Tên hoặc ID của buổi quay cần kiểm tra" },
      },
      required: ["shootIdOrTitle"],
    },
  },
  {
    name: "generateCallSheetData",
    description: "Tạo dữ liệu call sheet và production brief cho ngày mai hoặc buổi quay cụ thể, bao gồm ekip, thiết bị, địa điểm và các thông tin còn thiếu.",
    parameters: {
      type: "object",
      properties: {
        targetDate: { type: "string", description: "Ngày cần tạo call sheet (YYYY-MM-DD), mặc định ngày mai" },
        shootIdOrTitle: { type: "string", description: "Tên hoặc ID buổi quay (nếu có)" },
      },
    },
  },
  {
    name: "getDailyBrief",
    description: "Tạo bản tóm tắt sản xuất trong ngày (Smart Daily Brief), lịch trình các buổi quay và cảnh báo quan trọng.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Ngày tóm tắt (YYYY-MM-DD), mặc định hôm nay" },
      },
    },
  },
  {
    name: "proposeCreateShoot",
    description: "Tạo ĐỀ XUẤT lịch quay mới để người dùng xác nhận trên giao diện. KHÔNG được tạo trực tiếp vào DB mà phải qua đề xuất.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Tiêu đề buổi quay (ví dụ: VinFast Campaign)" },
        startsAt: { type: "string", description: "Thời gian bắt đầu (ISO 8601 hoặc YYYY-MM-DDTHH:mm:ss)" },
        endsAt: { type: "string", description: "Thời gian kết thúc (ISO 8601 hoặc YYYY-MM-DDTHH:mm:ss)" },
        locationName: { type: "string", description: "Địa điểm quay (tùy chọn, ví dụ: Studio M)" },
        projectName: { type: "string", description: "Tên dự án hoặc khách hàng (tùy chọn)" },
        crewMemberNames: { type: "array", items: { type: "string" }, description: "Danh sách nhân sự ekip muốn gán (tùy chọn)" },
        equipmentNames: { type: "array", items: { type: "string" }, description: "Danh sách thiết bị muốn đặt (tùy chọn)" },
      },
      required: ["title", "startsAt", "endsAt"],
    },
  },
  {
    name: "proposeMoveShoot",
    description: "Tạo ĐỀ XUẤT dời lịch hoặc đổi địa điểm buổi quay để người dùng xem so sánh thay đổi (diff) và xác nhận.",
    parameters: {
      type: "object",
      properties: {
        shootIdOrTitle: { type: "string", description: "Tên hoặc ID của buổi quay cần dời" },
        newStartsAt: { type: "string", description: "Thời gian bắt đầu mới (ISO 8601 hoặc YYYY-MM-DDTHH:mm:ss)" },
        newEndsAt: { type: "string", description: "Thời gian kết thúc mới (ISO 8601 hoặc YYYY-MM-DDTHH:mm:ss)" },
        newLocationName: { type: "string", description: "Địa điểm mới (tùy chọn)" },
      },
      required: ["shootIdOrTitle", "newStartsAt", "newEndsAt"],
    },
  },
  {
    name: "proposeBulkMoveShoots",
    description: "Tạo ĐỀ XUẤT dời hàng loạt các buổi quay của một dự án (ví dụ: dời toàn bộ buổi quay VinFast sang tuần sau).",
    parameters: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Tên dự án hoặc từ khóa (ví dụ: VinFast)" },
        daysShift: { type: "number", description: "Số ngày dời (mặc định 7 ngày, tức sang tuần sau)" },
      },
      required: ["projectName"],
    },
  },
];

export async function executeAITool(
  ctx: AIContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case "querySchedule":
      return queryScheduleTool(ctx, args as any);
    case "findEvents":
      return findEventsTool(ctx, args as any);
    case "findFreeSlots":
      return findFreeSlotsTool(ctx, args as any);
    case "checkConflicts":
      return checkConflictsTool(ctx, args as any);
    case "checkMissingInfo":
      return checkMissingInfoTool(ctx, args as any);
    case "getCrewAvailability":
      return getCrewAvailabilityTool(ctx, args as any);
    case "getEquipmentAvailability":
      return getEquipmentAvailabilityTool(ctx, args as any);
    case "getProjectSummary":
      return getProjectSummaryTool(ctx, args as any);
    case "checkProductionReadiness":
      return checkProductionReadinessTool(ctx, args as any);
    case "generateCallSheetData":
      return generateCallSheetDataTool(ctx, args as any);
    case "getDailyBrief":
      return getDailyBriefTool(ctx, args as any);
    case "proposeCreateShoot": {
      const p = await createShootProposal(ctx, {
        originalRequest: "Tạo lịch quay do AI đề xuất",
        title: String(args.title || "Buổi quay mới"),
        startsAt: new Date(String(args.startsAt)),
        endsAt: new Date(String(args.endsAt)),
        locationName: args.locationName ? String(args.locationName) : null,
        projectNameOrClient: args.projectName ? String(args.projectName) : null,
        crewMemberNames: Array.isArray(args.crewMemberNames) ? (args.crewMemberNames as string[]) : undefined,
        equipmentNames: Array.isArray(args.equipmentNames) ? (args.equipmentNames as string[]) : undefined,
      });
      return { proposal: p as unknown as Record<string, unknown> };
    }
    case "proposeMoveShoot": {
      const p = await createMoveShootProposal(ctx, {
        originalRequest: "Dời lịch quay do AI đề xuất",
        shootIdOrTitle: String(args.shootIdOrTitle),
        newStartsAt: new Date(String(args.newStartsAt)),
        newEndsAt: new Date(String(args.newEndsAt)),
        newLocationName: args.newLocationName ? String(args.newLocationName) : undefined,
      });
      return { proposal: p as unknown as Record<string, unknown> };
    }
    case "proposeBulkMoveShoots": {
      const p = await createBulkMoveProposal(ctx, {
        originalRequest: "Dời lịch hàng loạt do AI đề xuất",
        projectNameOrQuery: String(args.projectName),
        daysShift: typeof args.daysShift === "number" ? args.daysShift : 7,
      });
      return { proposal: p as unknown as Record<string, unknown> };
    }
    default:
      return { error: `Công cụ ${toolName} không tồn tại trong hệ thống G.Lab.` };
  }
}
