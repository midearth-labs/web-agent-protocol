/**
 * Claude API client wrapper for orchestrator
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMFunctionCall,
  LLMFunctionResponse,
  LLMProviderOptions,
} from "./llm-provider.js";
import { manifestToClaudeTools } from "../api-client/manifest.transform.js";

/**
 * Configuration for Claude client
 */
export type ClaudeClientConfig = {
  apiKey: string;
  options: LLMProviderOptions;
};

/**
 * Create and configure Claude client
 *
 * @remarks
 * This client is NOT thread-safe. The conversation state is shared and mutable.
 * Do not use the same client instance concurrently from multiple threads/async contexts.
 */
export function createClaudeProvider(
  config: ClaudeClientConfig
): LLMProvider {
  const anthropic = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
  const modelName = config.options.model || "claude-sonnet-4-5";
  const systemInstruction = config.options.systemInstruction;
  const temperature = config.options.temperature ?? 0.2;

  // Transform manifest to Claude tools format if provided
  let tools: Anthropic.Tool[] | undefined;
  if (config.options.manifest) {
    const toolsBundle = manifestToClaudeTools(config.options.manifest);
    tools = toolsBundle.tools;
  }

  // Initialize conversation state
  const conversation: Anthropic.MessageParam[] = [];

  // Convert LLMMessage to Claude Message format
  function toClaudeMessage(msg: LLMMessage): Anthropic.MessageParam {
    if (typeof msg.content === "string") {
      return {
        role: msg.role,
        content: msg.content,
      };
    }

    // Handle structured content
    const content: Anthropic.MessageParam["content"] = [];
    for (const item of msg.content) {
      if (item.type === "text") {
        content.push({ type: "text", text: item.text });
      } else if (item.type === "function_response") {
        // Convert function response to tool_result
        const fr = item.functionResponse;
        if (!fr.id) {
          throw new Error(`Function response ${fr.name} is missing required ID for Claude provider`);
        }
        content.push({
          type: "tool_result",
          tool_use_id: fr.id,
          content: JSON.stringify(fr.response),
        });
      }
      // Note: function_call type is not used in user messages for Claude
    }

    return {
      role: msg.role,
      content: content.length > 0 ? content : [{ type: "text", text: "" }],
    };
  }


  return {
    async generateContent(
      messages: LLMMessage[],
      saveConversation: boolean = true
    ): Promise<LLMResponse> {
      // Convert LLM messages to Claude format
      const claudeMessages: Anthropic.MessageParam[] = messages.map(toClaudeMessage);

      // Make the API call
      const response = await anthropic.beta.messages.create({
        model: modelName,
        max_tokens: 8192,
        system: systemInstruction,
        messages: [...conversation, ...claudeMessages],
        ...(tools && { tools }),
        temperature,
        betas: ["structured-outputs-2025-11-13"],
      });

      // If successful, add new messages to conversation
      if (saveConversation) {
        conversation.push(...claudeMessages);
        // Add assistant response to conversation
        if (response.content && response.content.length > 0) {
          conversation.push({
            role: "assistant",
            content: response.content as Anthropic.MessageParam["content"],
          });
        }
      }

      // Extract thinking, text, and function calls from response
      let thinking: string | null = null;
      let text: string | null = null;
      const functionCalls: LLMFunctionCall[] = [];

      if (response.content) {
        for (const block of response.content) {
          if (block.type === "text") {
            // Claude may include thinking in text blocks - we'll extract it if it's marked
            // For now, we'll treat all text as regular text
            if (!text) {
              text = block.text;
            } else {
              text += "\n" + block.text;
            }
          } else if (block.type === "tool_use") {
            functionCalls.push({
              name: block.name,
              args: block.input as Record<string, unknown>,
              id: block.id,
            });
          }
        }
      }

      return {
        thinking,
        text: text || null,
        functionCalls,
      };
    },

    extractThinking(response: LLMResponse): string | null {
      return response.thinking || null;
    },

    extractFunctionCalls(response: LLMResponse): LLMFunctionCall[] {
      return response.functionCalls;
    },

    extractText(response: LLMResponse): string | null {
      return response.text || null;
    },

    createFunctionResponseMessages(
      calls: LLMFunctionCall[],
      responses: LLMFunctionResponse[]
    ): LLMMessage[] {
      // Claude requires all tool results in a single user message
      // Each tool_result must match the tool_use_id from the original call
      const content: Array<{ type: "function_response"; functionResponse: LLMFunctionResponse }> = [];

      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const response = responses[i];

        if (!call) {
          throw new Error(`Missing function call at index ${i}`);
        }
        if (!response) {
          throw new Error(`Missing response for function call: ${call.name}`);
        }

        // Claude format: tool_result content block with matching tool_use_id
        // Use call.id (tool_use_id) - it's required for Claude
        const toolUseId = call.id;
        if (!toolUseId) {
          throw new Error(`Function call ${call.name} is missing required ID for Claude provider`);
        }

        content.push({
          type: "function_response",
          functionResponse: {
            name: response.name,
            response: response.response,
            id: toolUseId,
          },
        });
      }

      // Return single user message with all tool results
      return [
        {
          role: "user",
          content: content.length > 0 ? (content as LLMMessage["content"]) : "",
        },
      ];
    },
  };
}

