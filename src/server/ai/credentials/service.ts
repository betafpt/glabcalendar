import { encryptSecret, decryptSecret, maskSecret } from "../crypto";
import type { createAiCredentialRepository } from "@/server/db/ai-credentials";

export interface SafeCredentialMetadata {
  configured: boolean;
  provider: string;
  last4?: string;
  maskedKey?: string;
  status?: "active" | "revoked";
  ownerType?: "user" | "workspace";
  updatedAt?: Date;
}

export type CredentialRepo = ReturnType<typeof createAiCredentialRepository>;

async function getDefaultRepo(): Promise<CredentialRepo> {
  const { db } = await import("@/server/db");
  const { createAiCredentialRepository } = await import("@/server/db/ai-credentials");
  return createAiCredentialRepository(db);
}

export class AICredentialService {
  private repo?: CredentialRepo;

  constructor(repo?: CredentialRepo) {
    this.repo = repo;
  }

  private async getRepo(): Promise<CredentialRepo> {
    if (!this.repo) {
      this.repo = await getDefaultRepo();
    }
    return this.repo;
  }

  /**
   * Saves or replaces a provider API key.
   * Encrypts the raw secret server-side before persisting.
   * Returns ONLY safe metadata, NEVER the raw secret.
   */
  async saveCredential(params: {
    ownerType: "user" | "workspace";
    ownerId: string;
    provider?: string;
    rawApiKey: string;
  }): Promise<SafeCredentialMetadata> {
    const provider = params.provider || "302ai";
    const trimmedKey = params.rawApiKey.trim();

    if (!trimmedKey) {
      throw new Error("API Key không được để trống.");
    }

    const { encryptedSecret, secretLast4 } = encryptSecret(trimmedKey);

    const repo = await this.getRepo();
    const existing = await repo.findActive(params.ownerType, params.ownerId, provider);

    let saved;
    if (existing) {
      saved = await repo.update(existing.id, {
        encryptedSecret,
        secretLast4,
        status: "active",
        revokedAt: null,
      });
    } else {
      saved = await repo.create({
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        provider,
        encryptedSecret,
        secretLast4,
        status: "active",
      });
    }

    return {
      configured: true,
      provider,
      last4: secretLast4,
      maskedKey: maskSecret(secretLast4),
      status: "active",
      ownerType: params.ownerType,
      updatedAt: saved?.updatedAt ?? new Date(),
    };
  }

  /**
   * Retrieves safe metadata for display.
   * Never exposes raw plaintext keys.
   */
  async getCredentialMetadata(params: {
    ownerType: "user" | "workspace";
    ownerId: string;
    provider?: string;
  }): Promise<SafeCredentialMetadata> {
    const provider = params.provider || "302ai";
    const repo = await this.getRepo();
    const active = await repo.findActive(params.ownerType, params.ownerId, provider);

    if (!active) {
      return {
        configured: false,
        provider,
      };
    }

    return {
      configured: true,
      provider: active.provider,
      last4: active.secretLast4,
      maskedKey: maskSecret(active.secretLast4),
      status: active.status,
      ownerType: active.ownerType,
      updatedAt: active.updatedAt,
    };
  }

  /**
   * Revokes/deletes an active credential.
   */
  async revokeCredential(params: {
    ownerType: "user" | "workspace";
    ownerId: string;
    provider?: string;
  }): Promise<{ ok: boolean; message: string }> {
    const provider = params.provider || "302ai";
    const repo = await this.getRepo();
    const active = await repo.findActive(params.ownerType, params.ownerId, provider);

    if (!active) {
      return { ok: false, message: "Không tìm thấy API key nào đang hoạt động để xóa." };
    }

    await repo.revoke(active.id);
    return { ok: true, message: `Đã xóa cấu hình API key cho ${provider}.` };
  }

  /**
   * Server-only internal resolver to decrypt secret for active AI calls.
   * NEVER expose this to clients or serialize into response payloads.
   */
  async resolveActiveSecret(params: {
    ownerType: "user" | "workspace";
    ownerId: string;
    provider?: string;
  }): Promise<string | null> {
    const provider = params.provider || "302ai";
    const repo = await this.getRepo();
    const active = await repo.findActive(params.ownerType, params.ownerId, provider);

    if (!active) {
      return null;
    }

    // Update lastUsedAt asynchronously
    repo.update(active.id, { lastUsedAt: new Date() }).catch((err) => {
      console.warn("Failed to update credential lastUsedAt:", err);
    });

    return decryptSecret(active.encryptedSecret);
  }
}
