import type { createAiEntitlementRepository } from "@/server/db/ai-entitlements";
import type { AiEntitlement } from "@/server/db/schema";

export type SubscriptionPlan = "free" | "pro" | "studio";

export interface PlanConfig {
  name: string;
  monthlyCredits: number;
  allowBYOK: boolean;
  allowManagedAI: boolean;
  allowedModels: string[];
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: "Free Tier",
    monthlyCredits: 100,
    allowBYOK: true,
    allowManagedAI: false,
    allowedModels: ["gpt-4o", "gpt-4o-mini"],
  },
  pro: {
    name: "Pro Member",
    monthlyCredits: 1000,
    allowBYOK: true,
    allowManagedAI: true,
    allowedModels: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet"],
  },
  studio: {
    name: "Studio Tier",
    monthlyCredits: 5000,
    allowBYOK: true,
    allowManagedAI: true,
    allowedModels: ["*"],
  },
};

export const CAPABILITY_CREDIT_COSTS: Record<string, number> = {
  chat: 1,
  schedule_qa: 1,
  summary: 1,
  free_slots: 1,
  conflict_detection: 1,
  crew_availability: 1,
  equipment_availability: 1,
  project_summary: 1,
  create_shoot: 2,
  move_shoot: 2,
  readiness: 2,
  call_sheet: 3,
  daily_brief: 2,
  bulk_move: 5,
  optimization: 5,
};

export function getCreditCostForCapability(capability: string): number {
  return CAPABILITY_CREDIT_COSTS[capability] ?? 1;
}

export type EntitlementRepo = ReturnType<typeof createAiEntitlementRepository>;

async function getDefaultRepo(): Promise<EntitlementRepo> {
  const { db } = await import("@/server/db");
  const { createAiEntitlementRepository } = await import("@/server/db/ai-entitlements");
  return createAiEntitlementRepository(db);
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  plan: SubscriptionPlan;
  monthlyCredits: number;
  usedCredits: number;
  remainingCredits: number;
  creditCost: number;
  allowBYOK: boolean;
  allowManagedAI: boolean;
}

export class AIEntitlementService {
  private repo?: EntitlementRepo;

  constructor(repo?: EntitlementRepo) {
    this.repo = repo;
  }

  private async getRepo(): Promise<EntitlementRepo> {
    if (!this.repo) {
      this.repo = await getDefaultRepo();
    }
    return this.repo;
  }

  /**
   * Retrieves or provisions the default entitlement for a user or workspace.
   */
  async getOrCreateEntitlement(
    ownerType: "user" | "workspace",
    ownerId: string
  ): Promise<AiEntitlement> {
    const repo = await this.getRepo();
    let record = await repo.findByOwner(ownerType, ownerId);

    const now = new Date();

    if (!record) {
      const resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      record = await repo.create({
        ownerType,
        ownerId,
        plan: "free",
        status: "active",
        monthlyCredits: PLAN_CONFIGS.free.monthlyCredits,
        usedCredits: 0,
        resetAt,
        allowBYOK: PLAN_CONFIGS.free.allowBYOK,
        allowManagedAI: PLAN_CONFIGS.free.allowManagedAI,
        allowedModels: PLAN_CONFIGS.free.allowedModels.join(","),
      });
      return record;
    }

    // Auto-reset monthly quota if resetAt has passed
    if (record.resetAt.getTime() <= now.getTime()) {
      const nextReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const updated = await repo.update(record.id, {
        usedCredits: 0,
        resetAt: nextReset,
      });
      if (updated) {
        record = updated;
      }
    }

    return record;
  }

  /**
   * Evaluates entitlement permissions, model access, and remaining credit balance.
   */
  async checkEntitlement(params: {
    ownerType: "user" | "workspace";
    ownerId: string;
    capability?: string;
    requestedModel?: string;
    isBYOK: boolean;
  }): Promise<EntitlementCheckResult> {
    const entitlement = await this.getOrCreateEntitlement(params.ownerType, params.ownerId);
    const plan = (entitlement.plan as SubscriptionPlan) || "free";
    const capability = params.capability || "chat";
    const cost = getCreditCostForCapability(capability);
    const remaining = Math.max(0, entitlement.monthlyCredits - entitlement.usedCredits);

    if (entitlement.status !== "active") {
      return {
        allowed: false,
        reason: `Gói dịch vụ AI đang ở trạng thái "${entitlement.status}". Vui lòng kiểm tra lại tài khoản.`,
        plan,
        monthlyCredits: entitlement.monthlyCredits,
        usedCredits: entitlement.usedCredits,
        remainingCredits: remaining,
        creditCost: cost,
        allowBYOK: entitlement.allowBYOK,
        allowManagedAI: entitlement.allowManagedAI,
      };
    }

    // If using Managed AI (not BYOK), ensure plan allows managed AI
    if (!params.isBYOK && !entitlement.allowManagedAI) {
      return {
        allowed: false,
        reason: "Gói Free hiện tại hỗ trợ tính năng BYOK (mang theo API key riêng). Hãy cấu hình API Key 302.AI trong Cài đặt.",
        plan,
        monthlyCredits: entitlement.monthlyCredits,
        usedCredits: entitlement.usedCredits,
        remainingCredits: remaining,
        creditCost: cost,
        allowBYOK: entitlement.allowBYOK,
        allowManagedAI: entitlement.allowManagedAI,
      };
    }

    // Model check
    const allowedList = entitlement.allowedModels.split(",").map((m) => m.trim().toLowerCase());
    const modelToCheck = (params.requestedModel || "gpt-4o").toLowerCase();
    const isModelAllowed = allowedList.includes("*") || allowedList.includes(modelToCheck);

    if (!isModelAllowed) {
      return {
        allowed: false,
        reason: `Model "${params.requestedModel}" không khả dụng trên gói ${PLAN_CONFIGS[plan]?.name || plan}.`,
        plan,
        monthlyCredits: entitlement.monthlyCredits,
        usedCredits: entitlement.usedCredits,
        remainingCredits: remaining,
        creditCost: cost,
        allowBYOK: entitlement.allowBYOK,
        allowManagedAI: entitlement.allowManagedAI,
      };
    }

    // Credits check (even for BYOK, track internal usage quota)
    if (remaining < cost && !params.isBYOK) {
      return {
        allowed: false,
        reason: `Bạn đã sử dụng hết hạn mức AI tháng này (${entitlement.usedCredits}/${entitlement.monthlyCredits} credits).`,
        plan,
        monthlyCredits: entitlement.monthlyCredits,
        usedCredits: entitlement.usedCredits,
        remainingCredits: remaining,
        creditCost: cost,
        allowBYOK: entitlement.allowBYOK,
        allowManagedAI: entitlement.allowManagedAI,
      };
    }

    return {
      allowed: true,
      plan,
      monthlyCredits: entitlement.monthlyCredits,
      usedCredits: entitlement.usedCredits,
      remainingCredits: remaining,
      creditCost: cost,
      allowBYOK: entitlement.allowBYOK,
      allowManagedAI: entitlement.allowManagedAI,
    };
  }

  /**
   * Deducts credits after successful execution.
   */
  async deductCredits(
    ownerType: "user" | "workspace",
    ownerId: string,
    amount: number
  ): Promise<AiEntitlement | null> {
    if (amount <= 0) return null;
    const entitlement = await this.getOrCreateEntitlement(ownerType, ownerId);
    const repo = await this.getRepo();
    return repo.incrementUsedCredits(entitlement.id, amount);
  }
}
