import { describe, expect, it } from "vitest";
import { AICredentialService } from "./service";
import type { AiProviderCredential, NewAiProviderCredential } from "@/server/db/schema";

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
        store[idx].revokedAt = new Date();
        return true;
      }
      return false;
    },

    getRawStore: () => store,
  };
}

describe("AICredentialService Isolation & Security", () => {
  it("enforces USER_CREDENTIAL_ISOLATION: User A cannot access User B's credentials", async () => {
    const mockRepo = createMockCredentialRepo();
    const service = new AICredentialService(mockRepo as any);

    // User A saves their key
    await service.saveCredential({
      ownerType: "user",
      ownerId: "user-A",
      provider: "302ai",
      rawApiKey: "sk-302ai-user-A-key-1111AAAA",
    });

    // User B saves their key
    await service.saveCredential({
      ownerType: "user",
      ownerId: "user-B",
      provider: "302ai",
      rawApiKey: "sk-302ai-user-B-key-2222BBBB",
    });

    // Check metadata isolation
    const metaA = await service.getCredentialMetadata({ ownerType: "user", ownerId: "user-A" });
    const metaB = await service.getCredentialMetadata({ ownerType: "user", ownerId: "user-B" });
    expect(metaA.last4).toBe("AAAA");
    expect(metaB.last4).toBe("BBBB");

    // Check decrypted secret resolution isolation
    const secretA = await service.resolveActiveSecret({ ownerType: "user", ownerId: "user-A" });
    const secretB = await service.resolveActiveSecret({ ownerType: "user", ownerId: "user-B" });
    expect(secretA).toBe("sk-302ai-user-A-key-1111AAAA");
    expect(secretB).toBe("sk-302ai-user-B-key-2222BBBB");

    // User C has no credentials
    const metaC = await service.getCredentialMetadata({ ownerType: "user", ownerId: "user-C" });
    expect(metaC.configured).toBe(false);
  });

  it("enforces WORKSPACE_CREDENTIAL_ISOLATION: Workspace A cannot access Workspace B's credentials", async () => {
    const mockRepo = createMockCredentialRepo();
    const service = new AICredentialService(mockRepo as any);

    await service.saveCredential({
      ownerType: "workspace",
      ownerId: "org-1",
      provider: "302ai",
      rawApiKey: "sk-302ai-workspace-1-key-3333CCCC",
    });

    const metaOrg1 = await service.getCredentialMetadata({ ownerType: "workspace", ownerId: "org-1" });
    const metaOrg2 = await service.getCredentialMetadata({ ownerType: "workspace", ownerId: "org-2" });

    expect(metaOrg1.configured).toBe(true);
    expect(metaOrg1.last4).toBe("CCCC");
    expect(metaOrg2.configured).toBe(false);
  });

  it("PLAINTEXT_SECRET_STORAGE is FALSE and RAW_KEY_CLIENT_EXPOSURE is FALSE", async () => {
    const mockRepo = createMockCredentialRepo();
    const service = new AICredentialService(mockRepo as any);
    const rawKey = "sk-302ai-top-secret-9999XYZW";

    const meta = await service.saveCredential({
      ownerType: "user",
      ownerId: "user-X",
      provider: "302ai",
      rawApiKey: rawKey,
    });

    // Verify metadata returned to client contains NO raw key
    expect(meta).not.toHaveProperty("rawApiKey");
    expect(meta).not.toHaveProperty("encryptedSecret");
    expect(meta.last4).toBe("XYZW");
    expect(meta.maskedKey).toBe("••••••••XYZW");

    // Verify storage in repository has NO plaintext raw key
    const rawStore = mockRepo.getRawStore();
    expect(rawStore[0].encryptedSecret).not.toBe(rawKey);
    expect(rawStore[0].encryptedSecret).not.toContain(rawKey);
  });

  it("CREDENTIAL_REPLACE: updates existing credential cleanly", async () => {
    const mockRepo = createMockCredentialRepo();
    const service = new AICredentialService(mockRepo as any);

    await service.saveCredential({
      ownerType: "user",
      ownerId: "user-1",
      provider: "302ai",
      rawApiKey: "sk-old-key-00001111",
    });

    const replaced = await service.saveCredential({
      ownerType: "user",
      ownerId: "user-1",
      provider: "302ai",
      rawApiKey: "sk-new-key-88889999",
    });

    expect(replaced.last4).toBe("9999");
    const activeSecret = await service.resolveActiveSecret({ ownerType: "user", ownerId: "user-1" });
    expect(activeSecret).toBe("sk-new-key-88889999");
  });

  it("CREDENTIAL_REVOKE: revokes active credential and prevents resolution", async () => {
    const mockRepo = createMockCredentialRepo();
    const service = new AICredentialService(mockRepo as any);

    await service.saveCredential({
      ownerType: "user",
      ownerId: "user-1",
      provider: "302ai",
      rawApiKey: "sk-active-key-12345678",
    });

    const res = await service.revokeCredential({ ownerType: "user", ownerId: "user-1" });
    expect(res.ok).toBe(true);

    const activeSecret = await service.resolveActiveSecret({ ownerType: "user", ownerId: "user-1" });
    expect(activeSecret).toBeNull();

    const meta = await service.getCredentialMetadata({ ownerType: "user", ownerId: "user-1" });
    expect(meta.configured).toBe(false);
  });
});
