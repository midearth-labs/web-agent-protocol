/**
 * LLM Provider Abstraction Layer
 * 
 * Provides a unified interface for different LLM providers (Gemini, Claude, etc.)
 */

/**
 * Provider-agnostic message type
 */
export type LLMMessage = {
  role: "user" | "assistant";
  content: string | LLMMessageContent[];
}

/**
 * Provider-agnostic message content (for structured content like tool calls/responses)
 */
export type LLMMessageContent = 
  | { type: "text"; text: string }
  | { type: "function_call"; functionCall: LLMFunctionCall }
  | { type: "function_response"; functionResponse: LLMFunctionResponse };

/**
 * Provider-agnostic function call type
 */
export type LLMFunctionCall = {
  name: string;
  args: Record<string, unknown>;
  id?: string; // Some providers (like Claude) require an ID
}

/**
 * Provider-agnostic function response type
 */
export type LLMFunctionResponse = {
  name: string;
  response: Record<string, unknown>;
  id?: string; // Match the function call ID if provider requires it
}

/**
 * Provider-agnostic response type
 */
export type LLMResponse = {
  thinking?: string | null;
  text?: string | null;
  functionCalls: LLMFunctionCall[];
}

/**
 * Options for creating an LLM provider
 */
export type LLMProviderOptions = {
  systemInstruction: string;
  manifest?: import("../api-client/manifest.type.js").WAPManifest; // Provider will transform this to its own tool format
  model?: string;
  temperature?: number;
}

/**
 * LLM Provider interface
 * 
 * All LLM providers must implement this interface to be used by the orchestrator
 */
export interface LLMProvider {
  /**
   * Generate content from messages
   * @param messages - Array of messages in the conversation
   * @param saveConversation - Whether to save messages to internal conversation state
   * @returns Provider-agnostic response
   */
  generateContent(
    messages: LLMMessage[],
    saveConversation?: boolean
  ): Promise<LLMResponse>;

  /**
   * Extract thinking/reasoning from response
   * @param response - The LLM response
   * @returns Thinking text or null if not available
   */
  extractThinking(response: LLMResponse): string | null;

  /**
   * Extract function calls from response
   * @param response - The LLM response
   * @returns Array of function calls
   */
  extractFunctionCalls(response: LLMResponse): LLMFunctionCall[];

  /**
   * Extract text content from response
   * @param response - The LLM response
   * @returns Text content or null if not available
   */
  extractText(response: LLMResponse): string | null;

  /**
   * Create messages for sending function responses back to the model
   * @param calls - Original function calls
   * @param responses - Function responses
   * @returns Messages to send back to the model
   */
  createFunctionResponseMessages(
    calls: LLMFunctionCall[],
    responses: LLMFunctionResponse[]
  ): LLMMessage[];
}

/**
 * Provider type
 */
export type LLMProviderType = "gemini" | "claude";
export const LLMProviderNames: Record<LLMProviderType, string> = {
  gemini: "Gemini",
  claude: "Anthropic Claude",
};

/**
 * Configuration for creating an LLM provider
 */
export type LLMProviderConfig = {
  apiKey: string;
  provider: LLMProviderType;
  options: LLMProviderOptions;
}

/**
 * Factory function to create an LLM provider
 */
export async function createLLMProvider(config: LLMProviderConfig): Promise<LLMProvider> {
  if (config.provider === "gemini") {
    // Dynamic import to avoid circular dependencies
    const { createGeminiProvider } = await import("./gemini-client.js");
    return createGeminiProvider({
      apiKey: config.apiKey,
      options: config.options,
    });
  } else if (config.provider === "claude") {
    // Dynamic import to avoid circular dependencies
    const { createClaudeProvider } = await import("./claude-client.js");
    return createClaudeProvider({
      apiKey: config.apiKey,
      options: config.options,
    });
  } else {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

