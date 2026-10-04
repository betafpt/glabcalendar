import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MockAIProvider } from "./providers/mock";
import { ThreeZeroTwoAIProvider, ProviderError } from "./providers/302ai";
import { getAIConfig, isAIAssistantConfigured } from "./config";

describe("AI Foundation & Provider Abstraction (Phase 0 & 1)", () => {
  it("provides capabilities via provider abstraction", () => {
    const provider = new MockAIProvider();
    const caps = provider.getCapabilities();

    expect(caps.supportsTools).toBe(true);
    expect(caps.supportsStructuredOutput).toBe(true);
    expect(provider.id).toBe("mock");
  });

  it("handles 'Xin chào G.Lab' health test and returns structured response", async () => {
    const provider = new MockAIProvider();
    const HealthResponseSchema = z.object({
      greeting: z.string(),
      status: z.string(),
      capabilities: z.array(z.string()),
    });

    const result = await provider.generateStructured(
      HealthResponseSchema,
      "Xin chào G.Lab"
    );

    expect(result.status).toBe("ready");
    expect(result.greeting).toContain("G.Lab");
    expect(result.capabilities).toContain("calendar");
  });

  it("throws ProviderError if 302.AI API key is missing when executing live request", async () => {
    const unconfiguredProvider = new ThreeZeroTwoAIProvider({ apiKey: "" });

    await expect(
      unconfiguredProvider.generate({
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow(ProviderError);
  });

  it("safely handles config without exposing raw secrets", () => {
    const config = getAIConfig();
    expect(typeof config.enabled).toBe("boolean");
    expect(typeof config.baseUrl).toBe("string");
    expect(typeof config.model).toBe("string");
  });
});
