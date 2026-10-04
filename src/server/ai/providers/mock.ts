import { z } from "zod";
import type {
  AIModelInfo,
  AIProvider,
  AIProviderCapabilities,
  AIGenerateOptions,
  AIGenerateResult,
} from "../types";

export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly name = "Mock AI Provider";

  getCapabilities(): AIProviderCapabilities {
    return {
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxTokens: 4096,
      defaultModel: "mock-gpt-4o",
    };
  }

  async listModels(): Promise<AIModelInfo[]> {
    return [
      { id: "gpt-4o", object: "model", created: Date.now(), ownedBy: "mock" },
      { id: "gpt-4o-2024-08-06", object: "model", created: Date.now(), ownedBy: "mock" },
    ];
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const lastUserMsg = options.messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

    if (lastUserMsg.toLowerCase().includes("xin chào")) {
      return {
        content: JSON.stringify({
          greeting: "Xin chào bạn, tôi là G.Lab Production Copilot!",
          status: "ready",
          capabilities: ["calendar", "shoots", "crew", "equipment", "conflicts"],
        }),
        finishReason: "stop",
      };
    }

    return {
      content: `[Mock AI Response for: "${lastUserMsg}"]`,
      finishReason: "stop",
    };
  }

  async generateStructured<T>(
    schema: z.ZodType<T>,
    prompt: string,
    options?: Partial<AIGenerateOptions>
  ): Promise<T> {
    const result = await this.generate({
      messages: [{ role: "user", content: prompt }],
      ...options,
    });

    try {
      const parsed = JSON.parse(result.content);
      return schema.parse(parsed);
    } catch {
      // Return a basic mock conforming to the schema if possible
      throw new Error(`Mock failed to produce valid JSON for schema. Output was: ${result.content}`);
    }
  }
}
