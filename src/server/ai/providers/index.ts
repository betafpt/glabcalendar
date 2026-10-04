import type { AIProvider } from "../types";
import { getAIConfig } from "../config";
import { ThreeZeroTwoAIProvider } from "./302ai";
import { MockAIProvider } from "./mock";

export function getAIProvider(overrideProvider?: string): AIProvider {
  const config = getAIConfig();
  const providerType = overrideProvider || config.provider;

  switch (providerType) {
    case "302ai":
      return new ThreeZeroTwoAIProvider();
    case "mock":
      return new MockAIProvider();
    case "openai":
      // OpenAI can use the standard 302ai/OpenAI compatible class with official base URL
      return new ThreeZeroTwoAIProvider({
        provider: "openai",
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        apiKey: process.env.OPENAI_API_KEY || config.apiKey,
      });
    default:
      return new ThreeZeroTwoAIProvider();
  }
}

export * from "./302ai";
export * from "./mock";
