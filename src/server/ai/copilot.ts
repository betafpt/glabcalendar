import { z } from "zod";
import type { AIProvider, AIMessage, AIProposal } from "./types";
import { getAIProvider } from "./providers";
import { getAIContext, type AIContext } from "./tools/context";
import { AI_COPILOT_TOOLS, executeAITool } from "./tools/registry";
import { createShootProposal, createMoveShootProposal } from "./actions/proposals";
import { formatZonedDate } from "@/lib/zoned-datetime";
import { resolveAIContext, type ResolvedAIContext } from "./resolver";
import { AIEntitlementService } from "./entitlements/service";
import { AIUsageService } from "./usage/service";

export interface CopilotResponse {
  content: string;
  cardType?: "schedule_summary" | "conflict_alert" | "free_slots" | "readiness" | "project_summary" | "mutation_proposal" | "call_sheet" | "daily_brief" | "text";
  cardData?: Record<string, unknown>;
  proposal?: AIProposal;
  toolCallsExecuted?: string[];
  creditsRemaining?: number;
}

export class GLabCopilot {
  private customProvider?: AIProvider;

  constructor(provider?: AIProvider) {
    this.customProvider = provider;
  }

  /**
   * Main copilot entry point: processes user prompt with context and tools.
   */
  async processUserMessage(
    userMessage: string,
    history: AIMessage[] = [],
    organizationId?: string,
    userId?: string
  ): Promise<CopilotResponse> {
    const ctx = await getAIContext(organizationId);
    const now = new Date();
    const todayStr = formatZonedDate(now, ctx.timezone);

    // Resolve provider and entitlement
    let resolved: ResolvedAIContext | null = null;
    let activeProvider: AIProvider;

    if (this.customProvider) {
      activeProvider = this.customProvider;
    } else {
      resolved = await resolveAIContext({
        userId,
        workspaceId: organizationId,
        requestedCapability: "chat",
      });
      activeProvider = resolved.provider;
    }

    const systemPrompt = `Bạn là "G.Lab Production Copilot", trợ lý điều hành lịch quay và sản xuất thông minh của G.Lab Studio.
Hôm nay là: ${todayStr}, Múi giờ: ${ctx.timezone}.

QUY TẮC CỐT LÕI:
1. Bạn KHÔNG ĐƯỢC tự ý ghi hay sửa database trực tiếp. Mọi yêu cầu tạo lịch mới, dời lịch, đổi địa điểm BẮT BUỘC phải gọi công cụ đề xuất (proposeCreateShoot hoặc proposeMoveShoot) để hệ thống kiểm tra xung đột và hiển thị bản xem trước cho người dùng xác nhận.
2. Trả lời bằng Tiếng Việt súc tích, chuyên nghiệp, chuẩn phong cách editorial studio.
3. Khi người dùng hỏi về lịch, kiểm tra trống, kiểm tra trùng, kiểm tra ekip, thiết bị, call sheet, bạn PHẢI dùng các công cụ (tools) có sẵn để truy xuất dữ liệu thật. Không được tự bịa thông tin.
4. Ngày mai là ngày tiếp theo của hôm nay. Hãy tính toán chính xác ngày tháng định dạng YYYY-MM-DD khi gọi công cụ.`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      { role: "user", content: userMessage },
    ];

    // Tool calling loop (max 3 turns)
    let turns = 0;
    const toolsExecuted: string[] = [];
    let lastToolResultData: Record<string, unknown> | null = null;
    let detectedCardType: CopilotResponse["cardType"] = "text";
    let detectedProposal: AIProposal | undefined = undefined;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    while (turns < 3) {
      turns++;
      const result = await activeProvider.generate({
        messages,
        tools: AI_COPILOT_TOOLS,
        temperature: 0.1,
      });

      if (result.usage) {
        totalPromptTokens += result.usage.promptTokens || 0;
        totalCompletionTokens += result.usage.completionTokens || 0;
      }

      if (!result.toolCalls || result.toolCalls.length === 0) {
        if (resolved) {
          const usageService = new AIUsageService();
          usageService
            .recordUsage({
              userId,
              workspaceId: organizationId,
              provider: resolved.providerId,
              model: resolved.model,
              capability: "chat",
              inputTokens: totalPromptTokens,
              outputTokens: totalCompletionTokens,
              totalTokens: totalPromptTokens + totalCompletionTokens,
              creditsUsed: resolved.creditCost,
              credentialSource: resolved.credentialSource,
            })
            .catch((err) => console.warn("Failed to record AI usage:", err));

          const entitlementService = new AIEntitlementService();
          const ownerType = organizationId ? "workspace" : "user";
          const ownerId = organizationId || userId || "anonymous";
          entitlementService
            .deductCredits(ownerType, ownerId, resolved.creditCost)
            .catch((err) => console.warn("Failed to deduct AI credits:", err));
        }

        return {
          content: result.content,
          cardType: detectedCardType,
          cardData: lastToolResultData ?? undefined,
          proposal: detectedProposal,
          toolCallsExecuted: toolsExecuted,
          creditsRemaining: resolved
            ? Math.max(0, resolved.entitlement.remainingCredits - resolved.creditCost)
            : undefined,
        };
      }

      // Execute each tool call
      for (const tc of result.toolCalls) {
        toolsExecuted.push(tc.name);
        const toolOutput = await executeAITool(ctx, tc.name, tc.arguments);
        lastToolResultData = toolOutput;

        if (toolOutput.proposal) {
          detectedProposal = toolOutput.proposal as unknown as AIProposal;
          detectedCardType = "mutation_proposal";
        } else if (tc.name === "querySchedule") {
          detectedCardType = "schedule_summary";
        } else if (tc.name === "checkConflicts") {
          detectedCardType = "conflict_alert";
        } else if (tc.name === "findFreeSlots") {
          detectedCardType = "free_slots";
        } else if (tc.name === "checkProductionReadiness") {
          detectedCardType = "readiness";
        } else if (tc.name === "getProjectSummary") {
          detectedCardType = "project_summary";
        } else if (tc.name === "generateCallSheetData") {
          detectedCardType = "call_sheet";
        } else if (tc.name === "getDailyBrief") {
          detectedCardType = "daily_brief";
        }

        messages.push({
          role: "assistant",
          content: "",
          toolCalls: [tc],
        });

        messages.push({
          role: "tool",
          toolCallId: tc.id,
          name: tc.name,
          content: JSON.stringify(toolOutput),
        });
      }
    }

    if (resolved) {
      const usageService = new AIUsageService();
      usageService
        .recordUsage({
          userId,
          workspaceId: organizationId,
          provider: resolved.providerId,
          model: resolved.model,
          capability: "chat",
          inputTokens: totalPromptTokens,
          outputTokens: totalCompletionTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens,
          creditsUsed: resolved.creditCost,
          credentialSource: resolved.credentialSource,
        })
        .catch((err) => console.warn("Failed to record AI usage:", err));

      const entitlementService = new AIEntitlementService();
      const ownerType = organizationId ? "workspace" : "user";
      const ownerId = organizationId || userId || "anonymous";
      entitlementService
        .deductCredits(ownerType, ownerId, resolved.creditCost)
        .catch((err) => console.warn("Failed to deduct AI credits:", err));
    }

    return {
      content: "Đã xử lý thông tin thành công.",
      cardType: detectedCardType,
      cardData: lastToolResultData ?? undefined,
      proposal: detectedProposal,
      toolCallsExecuted: toolsExecuted,
      creditsRemaining: resolved
        ? Math.max(0, resolved.entitlement.remainingCredits - resolved.creditCost)
        : undefined,
    };
  }

  /**
   * Generates a structured mutation proposal with conflict calculation.
   */
  async createProposalFromIntent(
    userPrompt: string,
    actionType: "create_shoot" | "move_shoot",
    extractedData: {
      title?: string;
      startsAt: string;
      endsAt: string;
      locationName?: string;
      projectName?: string;
      crewMemberNames?: string[];
      equipmentNames?: string[];
      shootIdOrTitle?: string;
    },
    organizationId?: string,
    userId?: string
  ): Promise<AIProposal> {
    const ctx = await getAIContext(organizationId);

    if (actionType === "create_shoot") {
      return createShootProposal(ctx, {
        originalRequest: userPrompt,
        title: extractedData.title || "Buổi quay mới",
        startsAt: new Date(extractedData.startsAt),
        endsAt: new Date(extractedData.endsAt),
        locationName: extractedData.locationName,
        projectNameOrClient: extractedData.projectName,
        crewMemberNames: extractedData.crewMemberNames,
        equipmentNames: extractedData.equipmentNames,
        userId,
      });
    }

    if (actionType === "move_shoot") {
      return createMoveShootProposal(ctx, {
        originalRequest: userPrompt,
        shootIdOrTitle: extractedData.shootIdOrTitle || extractedData.title || "",
        newStartsAt: new Date(extractedData.startsAt),
        newEndsAt: new Date(extractedData.endsAt),
        newLocationName: extractedData.locationName,
        userId,
      });
    }

    throw new Error(`Loại hành động ${actionType} không hợp lệ.`);
  }
}
