import { AICredentialService } from "./credentials/service";
import { AIEntitlementService, type EntitlementCheckResult } from "./entitlements/service";
import { getAIConfig } from "./config";
import type { AIProvider } from "./types";
import { ThreeZeroTwoAIProvider } from "./providers/302ai";
import { MockAIProvider } from "./providers/mock";

export interface ResolveAIOptions {
  userId?: string | null;
  workspaceId?: string | null;
  requestedCapability?: string;
  requestedModel?: string;
  credentialService?: AICredentialService;
  entitlementService?: AIEntitlementService;
}

export interface ResolvedAIContext {
  userId?: string | null;
  workspaceId?: string | null;
  provider: AIProvider;
  providerId: string;
  model: string;
  credentialSource: "user" | "workspace" | "platform" | "dev_fallback";
  entitlement: EntitlementCheckResult;
  canExecute: boolean;
  creditCost: number;
}

/**
 * Centralized AI context resolver.
 * Enforces security hierarchy:
 * User BYOK -> Workspace BYOK -> Managed AI -> Dev Fallback -> Unavailable.
 */
export async function resolveAIContext(options: ResolveAIOptions): Promise<ResolvedAIContext> {
  const config = getAIConfig();
  const credentialService = options.credentialService ?? new AICredentialService();
  const entitlementService = options.entitlementService ?? new AIEntitlementService();
  const capability = options.requestedCapability || "chat";
  const requestedModel = options.requestedModel || config.model || "gpt-4o";

  // Step 1: Check User Credential (User BYOK)
  let activeSecret: string | null = null;
  let credentialSource: ResolvedAIContext["credentialSource"] = "user";

  if (options.userId) {
    activeSecret = await credentialService.resolveActiveSecret({
      ownerType: "user",
      ownerId: options.userId,
      provider: config.provider,
    });
  }

  // Step 2: Check Workspace Credential (Workspace BYOK)
  if (!activeSecret && options.workspaceId) {
    activeSecret = await credentialService.resolveActiveSecret({
      ownerType: "workspace",
      ownerId: options.workspaceId,
      provider: config.provider,
    });
    if (activeSecret) {
      credentialSource = "workspace";
    }
  }

  // Step 3: Check Platform / Dev Fallback
  const isBYOK = Boolean(activeSecret);
  if (!activeSecret) {
    if (config.provider === "mock") {
      activeSecret = "mock-secret";
      credentialSource = "dev_fallback";
    } else if (config.apiKey && config.apiKey.length > 0) {
      activeSecret = config.apiKey;
      credentialSource = "dev_fallback";
    }
  }

  // Determine owner for entitlement checks
  const ownerType = options.workspaceId ? "workspace" : "user";
  const ownerId = options.workspaceId || options.userId || "anonymous";

  // Step 4: Check Entitlement & Remaining Credits
  const entitlement = await entitlementService.checkEntitlement({
    ownerType,
    ownerId,
    capability,
    requestedModel,
    isBYOK,
  });

  if (!activeSecret) {
    throw new Error(
      "Chưa có cấu hình API Key. Vui lòng vào Cài đặt > Trợ lý AI để thêm API Key 302.AI của bạn."
    );
  }

  if (!entitlement.allowed) {
    throw new Error(entitlement.reason || "Hành động AI bị từ chối do chính sách gói tài khoản.");
  }

  // Step 5: Instantiate Scoped Provider
  let provider: AIProvider;
  if (config.provider === "mock" || activeSecret.startsWith("mock-")) {
    provider = new MockAIProvider();
  } else {
    provider = new ThreeZeroTwoAIProvider({
      apiKey: activeSecret,
      baseUrl: config.baseUrl,
      model: requestedModel,
      timeoutMs: config.timeoutMs,
    });
  }

  return {
    userId: options.userId,
    workspaceId: options.workspaceId,
    provider,
    providerId: config.provider,
    model: requestedModel,
    credentialSource,
    entitlement,
    canExecute: true,
    creditCost: entitlement.creditCost,
  };
}
