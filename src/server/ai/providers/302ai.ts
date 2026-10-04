import { z } from "zod";
import type {
  AIModelInfo,
  AIProvider,
  AIProviderCapabilities,
  AIGenerateOptions,
  AIGenerateResult,
  AIToolCall,
} from "../types";
import { getAIConfig, type AIConfig } from "../config";

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly rawError?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class ThreeZeroTwoAIProvider implements AIProvider {
  readonly id = "302ai";
  readonly name = "302.AI";
  private config: AIConfig;

  constructor(customConfig?: Partial<AIConfig>) {
    this.config = { ...getAIConfig(), ...customConfig };
  }

  getCapabilities(): AIProviderCapabilities {
    return {
      supportsTools: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxTokens: 4096,
      defaultModel: this.config.model || "gpt-4o",
    };
  }

  private getAuthHeader(): Record<string, string> {
    if (!this.config.apiKey) {
      throw new ProviderError("302.AI API key is missing. Please configure AI_API_KEY.", 401);
    }
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Queries the 302.AI /models endpoint to verify and list available models.
   */
  async listModels(): Promise<AIModelInfo[]> {
    const url = `${this.config.baseUrl}/models`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeader(),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new ProviderError(`302.AI models listing failed with status ${response.status}: ${text}`, response.status);
      }

      const data = await response.json();
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      return list.map((item: any) => ({
        id: item.id || String(item),
        object: item.object,
        created: item.created,
        ownedBy: item.owned_by,
      }));
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(
        `Failed to reach 302.AI endpoint (${url}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Verifies if GPT-4o or a specific model variant is active in 302.AI account.
   */
  async verifyModel(preferredModel = "gpt-4o"): Promise<string> {
    try {
      const models = await this.listModels();
      const exactMatch = models.find((m) => m.id.toLowerCase() === preferredModel.toLowerCase());
      if (exactMatch) return exactMatch.id;

      // Find any gpt-4o variant
      const gpt4oVariant = models.find((m) => m.id.toLowerCase().includes("gpt-4o"));
      if (gpt4oVariant) return gpt4oVariant.id;

      return preferredModel;
    } catch (err) {
      console.warn("Could not query 302.AI models list, using default model:", preferredModel, err);
      return preferredModel;
    }
  }

  /**
   * Generates a completion using 302.AI OpenAI-compatible chat completions API.
   */
  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const url = `${this.config.baseUrl}/chat/completions`;

    // Format tools if provided
    const formattedTools = options.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    // Format messages
    const formattedMessages = options.messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          tool_call_id: msg.toolCallId,
          content: msg.content,
        };
      }

      if (msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }

      return {
        role: msg.role,
        content: msg.content,
        name: msg.name,
      };
    });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
    };

    if (formattedTools && formattedTools.length > 0) {
      body.tools = formattedTools;
      body.tool_choice = "auto";
    }

    if (options.responseFormat === "json_object") {
      body.response_format = { type: "json_object" };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
      if (options.abortSignal) {
        options.abortSignal.addEventListener("abort", () => controller.abort());
      }

      const response = await fetch(url, {
        method: "POST",
        headers: this.getAuthHeader(),
        body: JSON.stringify(body),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ProviderError(`302.AI completion failed (${response.status}): ${errorText}`, response.status);
      }

      const data = await response.json();
      const choice = data?.choices?.[0];
      const message = choice?.message;

      const toolCalls: AIToolCall[] = [];
      if (Array.isArray(message?.tool_calls)) {
        for (const tc of message.tool_calls) {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.function?.arguments || "{}");
          } catch {
            parsedArgs = { raw: tc.function?.arguments };
          }
          toolCalls.push({
            id: tc.id,
            name: tc.function?.name,
            arguments: parsedArgs,
          });
        }
      }

      return {
        content: message?.content || "",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: choice?.finish_reason,
        usage: data?.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(
        `302.AI request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Generates a strongly typed and validated structured output using Zod.
   */
  async generateStructured<T>(
    schema: z.ZodType<T>,
    prompt: string,
    options: Partial<AIGenerateOptions> = {}
  ): Promise<T> {
    const systemPrompt = `You are the G.Lab AI structured reasoning engine. You must output STRICT JSON matching the user schema. Do not wrap in markdown or backticks.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(options.messages || []),
      { role: "user" as const, content: prompt },
    ];

    const result = await this.generate({
      ...options,
      messages,
      responseFormat: "json_object",
      temperature: 0.1,
    });

    try {
      const cleanJson = result.content.trim().replace(/^```json/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleanJson);
      return schema.parse(parsed);
    } catch (err) {
      throw new ProviderError(
        `Failed to parse structured AI output: ${err instanceof Error ? err.message : String(err)}. Raw output: ${result.content}`
      );
    }
  }
}
