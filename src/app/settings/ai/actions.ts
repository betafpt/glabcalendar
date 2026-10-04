"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import { AICredentialService, type SafeCredentialMetadata } from "@/server/ai/credentials/service";
import { AIEntitlementService, PLAN_CONFIGS, type SubscriptionPlan } from "@/server/ai/entitlements/service";
import { AIUsageService } from "@/server/ai/usage/service";
import { getAIConfig } from "@/server/ai/config";

export interface AICredentialStatusResult {
  configured: boolean;
  provider: string;
  maskedKey?: string;
  last4?: string;
  status?: string;
  ownerType?: string;
  updatedAt?: string;
  planName: string;
  monthlyCredits: number;
  usedCredits: number;
  remainingCredits: number;
  totalRequests: number;
  totalTokens: number;
  totalCreditsUsed: number;
  model: string;
  userEmail: string;
}

export async function getAICredentialStatusAction(): Promise<{
  ok: boolean;
  error?: string;
  data?: AICredentialStatusResult;
}> {
  try {
    const session = await getCurrentSession();
    const userId = session?.user?.id || "anonymous";
    const userEmail = session?.user?.email || "founder@glab.vn";

    const config = getAIConfig();
    const credService = new AICredentialService();
    const entService = new AIEntitlementService();
    const usageService = new AIUsageService();

    // Check user credential first, then workspace if needed
    let meta: SafeCredentialMetadata = await credService.getCredentialMetadata({
      ownerType: "user",
      ownerId: userId,
      provider: "302ai",
    });

    if (!meta.configured && config.apiKey) {
      // Dev environment fallback notice
      meta = {
        configured: true,
        provider: config.provider,
        last4: config.apiKey.slice(-4).toUpperCase(),
        maskedKey: `••••••••${config.apiKey.slice(-4).toUpperCase()}`,
        status: "active",
        ownerType: "workspace",
      };
    }

    const entitlement = await entService.getOrCreateEntitlement("user", userId);
    const plan = (entitlement.plan as SubscriptionPlan) || "free";
    const planConfig = PLAN_CONFIGS[plan] || PLAN_CONFIGS.free;
    const remaining = Math.max(0, entitlement.monthlyCredits - entitlement.usedCredits);

    const usageSummary = await usageService.getSummary(userId);

    return {
      ok: true,
      data: {
        configured: meta.configured,
        provider: meta.provider,
        maskedKey: meta.maskedKey,
        last4: meta.last4,
        status: meta.status,
        ownerType: meta.ownerType,
        updatedAt: meta.updatedAt?.toISOString(),
        planName: planConfig.name,
        monthlyCredits: entitlement.monthlyCredits,
        usedCredits: entitlement.usedCredits,
        remainingCredits: remaining,
        totalRequests: usageSummary.totalRequests,
        totalTokens: usageSummary.totalTokens,
        totalCreditsUsed: usageSummary.totalCreditsUsed,
        model: config.model,
        userEmail,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể tải thông tin cấu hình AI.",
    };
  }
}

export async function saveAICredentialAction(
  rawApiKey: string,
  provider: string = "302ai"
): Promise<{ ok: boolean; message: string; metadata?: SafeCredentialMetadata }> {
  try {
    const session = await getCurrentSession();
    const userId = session?.user?.id;

    if (!userId) {
      return { ok: false, message: "Bạn cần đăng nhập để lưu cấu hình API key." };
    }

    const trimmed = rawApiKey.trim();
    if (!trimmed) {
      return { ok: false, message: "Vui lòng nhập API Key hợp lệ." };
    }

    const credService = new AICredentialService();
    const metadata = await credService.saveCredential({
      ownerType: "user",
      ownerId: userId,
      provider,
      rawApiKey: trimmed,
    });

    revalidatePath("/settings/ai");
    revalidatePath("/settings");
    revalidatePath("/ai");

    return {
      ok: true,
      message: "Đã lưu và mã hóa API Key thành công.",
      metadata,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Lỗi khi lưu API Key.",
    };
  }
}

export async function revokeAICredentialAction(
  provider: string = "302ai"
): Promise<{ ok: boolean; message: string }> {
  try {
    const session = await getCurrentSession();
    const userId = session?.user?.id;

    if (!userId) {
      return { ok: false, message: "Bạn cần đăng nhập để xóa cấu hình." };
    }

    const credService = new AICredentialService();
    const res = await credService.revokeCredential({
      ownerType: "user",
      ownerId: userId,
      provider,
    });

    revalidatePath("/settings/ai");
    revalidatePath("/settings");
    revalidatePath("/ai");

    return res;
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Lỗi khi xóa API Key.",
    };
  }
}
