import { z } from "zod";

export type AIRole = "system" | "user" | "assistant" | "tool";

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIMessage {
  role: AIRole;
  content: string;
  name?: string;
  toolCalls?: AIToolCall[];
  toolCallId?: string;
}

export interface AIToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: Record<string, unknown>;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AIToolParameterProperty>;
    required?: string[];
  };
}

export interface AIProviderCapabilities {
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  maxTokens: number;
  defaultModel: string;
}

export interface AIGenerateOptions {
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  abortSignal?: AbortSignal;
}

export interface AIGenerateResult {
  content: string;
  toolCalls?: AIToolCall[];
  finishReason?: "stop" | "tool_calls" | "length" | "content_filter" | "error";
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIModelInfo {
  id: string;
  object?: string;
  created?: number;
  ownedBy?: string;
}

/**
 * Clean provider abstraction decouples G.Lab domain logic from 302.AI, OpenAI, Anthropic, etc.
 */
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  getCapabilities(): AIProviderCapabilities;
  generate(options: AIGenerateOptions): Promise<AIGenerateResult>;
  generateStructured<T>(schema: z.ZodType<T>, prompt: string, options?: Partial<AIGenerateOptions>): Promise<T>;
  listModels?(): Promise<AIModelInfo[]>;
}

/**
 * Mutation Proposal Gate:
 * Every mutation requested via AI MUST pass through proposal generation,
 * conflict calculation, preview, and explicit user confirmation.
 */
export interface AIProposalDiffField {
  field: string;
  labelVi: string;
  labelEn?: string;
  oldValue?: string | null;
  newValue: string | null;
}

export interface AIConflictItem {
  type: "crew" | "equipment" | "schedule";
  targetName: string;
  conflictingShootTitle: string;
  timeRange: string;
}

export interface AIProposal {
  id: string;
  actionType: "create_shoot" | "update_shoot" | "move_shoot" | "cancel_shoot" | "bulk_move_shoots";
  title: string;
  summaryVi: string;
  summaryEn: string;
  diff: AIProposalDiffField[];
  payload: Record<string, unknown>;
  hasConflicts: boolean;
  conflictCount: number;
  conflicts: AIConflictItem[];
  requiresConfirmation: true;
  createdAt: string;
}
