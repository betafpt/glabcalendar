import { describe, expect, it } from "vitest";
import { resolveAIContext } from "./resolver";
import { AICredentialService } from "./credentials/service";
import { AIEntitlementService } from "./entitlements/service";
import type { AiProviderCredential, AiEntitlement, NewAiProviderCredential, NewAiEntitlement } from "@/server/db/schema";

function createMockCredentialRepo() {
  const store: AiProviderCredential[] = [];

  return {
    async findActive(ownerType: "user" | "workspace", ownerId: string, provider: string) {
      return (
        store.find(
          (c) =>
            c.ownerType === ownerType &&
            c.ownerId === ownerId &&
            c.provider === provider &&
            c.status === "active"
        ) ?? null
      );
    },

    async listByOwner(ownerType: "user" | "workspace", ownerId: string) {
      return store.filter((c) => c.ownerType === ownerType && c.ownerId === ownerId);
    },

    async create(input: NewAiProviderCredential) {
      const item: AiProviderCredential = {
        id: `cred-${store.length + 1}`,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        provider: input.provider ?? "302ai",
        encryptedSecret: input.encryptedSecret,
        secretLast4: input.secretLast4,
        status: input.status ?? "active",
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(item);
      return item;
    },

    async update(id: string, patch: Partial<NewAiProviderCredential>) {
      const idx = store.findIndex((c) => c.id === id);
      if (idx >= 0) {
        store[idx] = { ...store[idx], ...patch, updatedAt: new Date() };
        return store[idx];
      }
      return null;
    },

    async revoke(id: string) {
      const idx = store.findIndex((c) => c.id === id);
      if (idx >= 0) {
        store[idx].status = "revoked";
        return true;
      }
      return false;
    },
  };
}

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
        return store[idx];
      }
      return null;
    },
  };
}

describe("Centralized AI Context Resolver (Phase 3 & 4)", () => {
  it("USER_KEY_RESOLUTION: resolves User BYOK credential when available", async () => {
    const credRepo = createMockCredentialRepo();
    const entRepo = createMockEntitlementRepo();
    const credService = new AICredentialService(credRepo as any);
    const entService = new AIEntitlementService(entRepo as any);

    await credService.saveCredential({
      ownerType: "user",
      ownerId: "user-alpha",
      provider: "302ai",
      rawApiKey: "sk-302ai-user-alpha-99887766",
    });

    const ctx = await resolveAIContext({
      userId: "user-alpha",
      workspaceId: "workspace-1",
      requestedCapability: "schedule_qa",
      credentialService: credService,
      entitlementService: entService,
    });

    expect(ctx.canExecute).toBe(true);
    expect(ctx.credentialSource).toBe("user");
    expect(ctx.creditCost).toBe(1);
    expect(ctx.entitlement.remainingCredits).toBe(100);
  });

  it("WORKSPACE_KEY_RESOLUTION: falls back to Workspace credential when user has no key", async () => {
    const credRepo = createMockCredentialRepo();
    const entRepo = createMockEntitlementRepo();
    const credService = new AICredentialService(credRepo as any);
    const entService = new AIEntitlementService(entRepo as any);

    // Only workspace has a key configured
    await credService.saveCredential({
      ownerType: "workspace",
      ownerId: "workspace-shared",
      provider: "302ai",
      rawApiKey: "sk-302ai-workspace-key-55443322",
    });

    const ctx = await resolveAIContext({
      userId: "user-without-key",
      workspaceId: "workspace-shared",
      requestedCapability: "create_shoot",
      credentialService: credService,
      entitlementService: entService,
    });

    expect(ctx.canExecute).toBe(true);
    expect(ctx.credentialSource).toBe("workspace");
    expect(ctx.creditCost).toBe(2);
  });

  it("fails informatively when no user, workspace, or platform credentials exist", async () => {
    const credRepo = createMockCredentialRepo();
    const entRepo = createMockEntitlementRepo();
    const credService = new AICredentialService(credRepo as any);
    const entService = new AIEntitlementService(entRepo as any);

    // Save previous env and clear for test
    const origKey = process.env.AI_API_KEY;
    const origProvider = process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
    process.env.AI_PROVIDER = "302ai";

    try {
      await expect(
        resolveAIContext({
          userId: "user-empty",
          workspaceId: "workspace-empty",
          credentialService: credService,
          entitlementService: entService,
        })
      ).rejects.toThrow("Chưa có cấu hình API Key");
    } finally {
      process.env.AI_API_KEY = origKey;
      process.env.AI_PROVIDER = origProvider;
    }
  });
});
