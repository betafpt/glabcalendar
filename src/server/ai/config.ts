import { z } from "zod";

const aiConfigSchema = z.object({
  AI_ASSISTANT_ENABLED: z
    .string()
    .optional()
    .transform((val) => {
      const normalized = val?.trim().toLowerCase();
      return normalized === "true" || normalized === "1";
    }),
  AI_PROVIDER: z.enum(["302ai", "openai", "mock"]).default("302ai"),
  AI_BASE_URL: z.string().trim().default("https://api.302.ai/v1"),
  AI_API_KEY: z.string().trim().optional(),
  AI_MODEL: z.string().trim().default("gpt-4o"),
  AI_REQUEST_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 30_000)),
});

export type AIConfig = {
  enabled: boolean;
  provider: "302ai" | "openai" | "mock";
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
};

export function getAIConfig(): AIConfig {
  const parsed = aiConfigSchema.parse(process.env);
  return {
    enabled: parsed.AI_ASSISTANT_ENABLED,
    provider: parsed.AI_PROVIDER,
    baseUrl: parsed.AI_BASE_URL.replace(/\/+$/, ""),
    apiKey: parsed.AI_API_KEY,
    model: parsed.AI_MODEL,
    timeoutMs: parsed.AI_REQUEST_TIMEOUT_MS,
  };
}

export function isAIAssistantEnabled(): boolean {
  return getAIConfig().enabled;
}

export function isAIAssistantConfigured(): boolean {
  const config = getAIConfig();
  if (config.provider === "mock") return true;
  return Boolean(config.apiKey && config.apiKey.length > 0);
}
