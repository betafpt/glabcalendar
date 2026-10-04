import { describe, expect, it } from "vitest";
import { AIEntitlementService, getCreditCostForCapability } from "./service";
import type { AiEntitlement, NewAiEntitlement } from "@/server/db/schema";
import { AIUsageService } from "../usage/service";
import type { AiUsage, NewAiUsage } from "@/server/db/schema";

function createMockEntitlementRepo() {
  const store: AiEntitlement[] = [];

  return {
    async findByOwner(ownerType: "user" | "workspace", ownerId: string) {
      return store.find((e) => e.ownerType === ownerType && e.ownerId === ownerId) ?? null;
    },

    async create(input: NewAiEntitlement) {
      const item: AiEntitlement = {
        id: `ent-${store.length + 1}`,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        plan: input.plan ?? "free",
        status: input.status ?? "active",
        monthlyCredits: input.monthlyCredits ?? 100,
        usedCredits: input.usedCredits ?? 0,
        resetAt: input.resetAt,
        allowBYOK: input.allowBYOK ?? true,
        allowManagedAI: input.allowManagedAI ?? false,
        allowedModels: input.allowedModels ?? "gpt-4o",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(item);
      return item;
    },

    async update(id: string, patch: Partial<NewAiEntitlement>) {
      const idx = store.findIndex((e) => e.id === id);
      if (idx >= 0) {
        store[idx] = { ...store[idx], ...patch, updatedAt: new Date() };
        return store[idx];
      }
      return null;
    },

    async incrementUsedCredits(id: string, amount: number) {
      const idx = store.findIndex((e) => e.id === id);
      if (idx >= 0) {
        store[idx].usedCredits += amount;
        store[idx].updatedAt = new Date();
        return store[idx];
      }
      return null;
    },
  };
}

function createMockUsageRepo() {
  const store: AiUsage[] = [];

  return {
    async create(input: NewAiUsage) {
      const item: AiUsage = {
        id: `usage-${store.length + 1}`,
        userId: input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        provider: input.provider,
        model: input.model,
        capability: input.capability,
        inputTokens: input.inputTokens ?? 0,
        outputTokens: input.outputTokens ?? 0,
        totalTokens: input.totalTokens ?? 0,
        estimatedCost: input.estimatedCost ?? null,
        creditsUsed: input.creditsUsed ?? 1,
        credentialSource: input.credentialSource,
        createdAt: new Date(),
      };
      store.push(item);
      return item;
    },

    async listRecent(ownerId: string, limit: number = 20) {
      return store.filter((u) => u.userId === ownerId || u.workspaceId === ownerId).slice(0, limit);
    },

    async getSummary(ownerId: string) {
      const matched = store.filter((u) => u.userId === ownerId || u.workspaceId === ownerId);
      return {
        totalRequests: matched.length,
        totalTokens: matched.reduce((acc, u) => acc + u.totalTokens, 0),
        totalCreditsUsed: matched.reduce((acc, u) => acc + u.creditsUsed, 0),
      };
    },
  };
}

describe("AI Entitlement & Credits Foundation (Phase 5, 6, 7)", () => {
  it("auto-provisions default FREE plan with 100 credits and BYOK allowed", async () => {
    const mockRepo = createMockEntitlementRepo();
    const service = new AIEntitlementService(mockRepo as any);

    const entitlement = await service.getOrCreateEntitlement("user", "user-1");
    expect(entitlement.plan).toBe("free");
    expect(entitlement.monthlyCredits).toBe(100);
    expect(entitlement.usedCredits).toBe(0);
    expect(entitlement.allowBYOK).toBe(true);
    expect(entitlement.allowManagedAI).toBe(false);
  });

  it("checks entitlement permissions: allows BYOK for Free tier", async () => {
    const mockRepo = createMockEntitlementRepo();
    const service = new AIEntitlementService(mockRepo as any);

    const checkBYOK = await service.checkEntitlement({
      ownerType: "user",
      ownerId: "user-1",
      capability: "chat",
      isBYOK: true,
      requestedModel: "gpt-4o",
    });
    expect(checkBYOK.allowed).toBe(true);
    expect(checkBYOK.remainingCredits).toBe(100);
    expect(checkBYOK.creditCost).toBe(1);

    // Free tier without BYOK (managed AI) should be rejected
    const checkManaged = await service.checkEntitlement({
      ownerType: "user",
      ownerId: "user-1",
      capability: "chat",
      isBYOK: false,
      requestedModel: "gpt-4o",
    });
    expect(checkManaged.allowed).toBe(false);
    expect(checkManaged.reason).toContain("BYOK");
  });

  it("calculates capability costs and deducts credits properly", async () => {
    const mockRepo = createMockEntitlementRepo();
    const service = new AIEntitlementService(mockRepo as any);

    expect(getCreditCostForCapability("chat")).toBe(1);
    expect(getCreditCostForCapability("create_shoot")).toBe(2);
    expect(getCreditCostForCapability("call_sheet")).toBe(3);
    expect(getCreditCostForCapability("bulk_move")).toBe(5);

    await service.getOrCreateEntitlement("user", "user-1");
    const updated = await service.deductCredits("user", "user-1", 5);
    expect(updated?.usedCredits).toBe(5);

    const check = await service.checkEntitlement({
      ownerType: "user",
      ownerId: "user-1",
      isBYOK: true,
    });
    expect(check.remainingCredits).toBe(95);
  });

  it("records AI usage tokens, credits, and credential source accurately", async () => {
    const mockRepo = createMockUsageRepo();
    const usageService = new AIUsageService(mockRepo as any);

    const record = await usageService.recordUsage({
      userId: "user-1",
      workspaceId: "org-1",
      provider: "302ai",
      model: "gpt-4o",
      capability: "create_shoot",
      inputTokens: 520,
      outputTokens: 180,
      totalTokens: 700,
      creditsUsed: 2,
      credentialSource: "user",
    });

    expect(record.totalTokens).toBe(700);
    expect(record.creditsUsed).toBe(2);
    expect(record.credentialSource).toBe("user");

    const summary = await usageService.getSummary("user-1");
    expect(summary.totalRequests).toBe(1);
    expect(summary.totalTokens).toBe(700);
    expect(summary.totalCreditsUsed).toBe(2);
  });
});
