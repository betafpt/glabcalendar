"use server";

import { revalidatePath } from "next/cache";
import { GLabCopilot, type CopilotResponse } from "@/server/ai/copilot";
import { getAIContext } from "@/server/ai/tools/context";
import { executeConfirmedProposal, cancelProposal } from "@/server/ai/actions/proposals";
import { isAIAssistantEnabled, isAIAssistantConfigured, getAIConfig } from "@/server/ai/config";
import type { AIMessage, AIProposal } from "@/server/ai/types";
import { getCurrentSession } from "@/lib/session";

export interface AIActionResult {
  ok: boolean;
  error?: string;
  response?: CopilotResponse;
  proposal?: AIProposal;
}

export async function sendAIMessageAction(
  userMessage: string,
  history: AIMessage[] = []
): Promise<AIActionResult> {
  try {
    const config = getAIConfig();
    if (!config.enabled) {
      return {
        ok: false,
        error: "Trợ lý AI hiện đang tắt trong hệ thống. Vui lòng kích hoạt trong cấu hình.",
      };
    }

    const { requireWorkspaceContext } = await import("@/server/workspace-context");
    const { user, organization } = await requireWorkspaceContext();

    const copilot = new GLabCopilot();
    const response = await copilot.processUserMessage(userMessage, history, organization.id, user.id);

    return {
      ok: true,
      response,
    };
  } catch (err) {
    console.error("AI Assistant error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định khi kết nối Trợ lý AI.",
    };
  }
}

export async function confirmAIProposalAction(proposalId: string): Promise<{ ok: boolean; message: string; shootId?: string }> {
  try {
    const ctx = await getAIContext();
    const result = await executeConfirmedProposal(ctx, proposalId);

    if (result.ok) {
      revalidatePath("/calendar");
      revalidatePath("/shoots");
      revalidatePath("/dashboard");
      revalidatePath("/");
    }

    return result;
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Lỗi khi xác nhận thực thi thay đổi.",
    };
  }
}

export async function cancelAIProposalAction(proposalId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const ctx = await getAIContext();
    return cancelProposal(ctx, proposalId);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Lỗi khi hủy đề xuất.",
    };
  }
}

export async function getAIStatusAction(): Promise<{
  enabled: boolean;
  configured: boolean;
  provider: string;
  model: string;
}> {
  const config = getAIConfig();
  return {
    enabled: isAIAssistantEnabled(),
    configured: isAIAssistantConfigured(),
    provider: config.provider,
    model: config.model,
  };
}
