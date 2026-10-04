import type { createAiUsageRepository } from "@/server/db/ai-usage";
import type { AiUsage } from "@/server/db/schema";

export interface RecordAIUsageParams {
  userId?: string | null;
  workspaceId?: string | null;
  provider: string;
  model: string;
  capability: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: string | null;
  creditsUsed?: number;
  credentialSource: "user" | "workspace" | "platform" | "dev_fallback";
}

export type UsageRepo = ReturnType<typeof createAiUsageRepository>;

async function getDefaultRepo(): Promise<UsageRepo> {
  const { db } = await import("@/server/db");
  const { createAiUsageRepository } = await import("@/server/db/ai-usage");
  return createAiUsageRepository(db);
}

export class AIUsageService {
  private repo?: UsageRepo;

  constructor(repo?: UsageRepo) {
    this.repo = repo;
  }

  private async getRepo(): Promise<UsageRepo> {
    if (!this.repo) {
      this.repo = await getDefaultRepo();
    }
    return this.repo;
  }

  /**
   * Records token and credit usage safely without storing raw sensitive prompts.
   */
  async recordUsage(params: RecordAIUsageParams): Promise<AiUsage> {
    const repo = await this.getRepo();
    const inputTokens = params.inputTokens ?? 0;
    const outputTokens = params.outputTokens ?? 0;
    const totalTokens = params.totalTokens ?? inputTokens + outputTokens;

    return repo.create({
      userId: params.userId || null,
      workspaceId: params.workspaceId || null,
      provider: params.provider,
      model: params.model,
      capability: params.capability,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: params.estimatedCost || null,
      creditsUsed: params.creditsUsed ?? 1,
      credentialSource: params.credentialSource,
    });
  }

  /**
   * Retrieves usage summary for diagnostic visibility.
   */
  async getUsageSummary(ownerId: string) {
    const repo = await this.getRepo();
    return repo.getSummary(ownerId);
  }

  async getSummary(ownerId: string) {
    return this.getUsageSummary(ownerId);
  }

  /**
   * Lists recent usage transactions for diagnostics.
   */
  async listRecentUsage(ownerId: string, limit: number = 20) {
    const repo = await this.getRepo();
    return repo.listRecent(ownerId, limit);
  }
}
