/**
 * Gemini API client wrapper for orchestrator
 */

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type {
  GoogleGenAIOptions,
  Content,
  GenerateContentConfig,
  Candidate,
  Part,
} from "@google/genai";
import type {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMFunctionCall,
  LLMFunctionResponse,
  LLMProviderOptions,
} from "./llm-provider.js";
import { manifestToGemini } from "../api-client/manifest.transform.js";

/**
 * Configuration for Gemini client
 */
export type GeminiClientConfig = GoogleGenAIOptions;

/**
 * Options for creating a Gemini client
 */
export interface CreateGeminiClientOptions {
  /** System instruction for the model */
  systemInstruction: string;
  /** Model name (default: "gemini-2.0-flash-thinking-exp-01-21") */
  model?: string;
  /** Tools configuration */
  tools?: GenerateContentConfig["tools"];
}

/**
 * Configuration for creating a Gemini provider
 */
export type GeminiProviderConfig = {
  apiKey: string;
  options: LLMProviderOptions;
};

/**
 * Create and configure Gemini provider (implements LLMProvider interface)
 *
 * @remarks
 * This client is NOT thread-safe. The conversation state is shared and mutable.
 * Do not use the same client instance concurrently from multiple threads/async contexts.
 */
export function createGeminiProvider(
  config: GeminiProviderConfig
): LLMProvider {
  const genAI = new GoogleGenAI({ apiKey: config.apiKey });
  const modelName = config.options.model || "gemini-flash-latest";
  const systemInstruction = config.options.systemInstruction;
  const temperature = config.options.temperature ?? 0.2;

  // Transform manifest to Gemini tools format if provided
  let tools: GenerateContentConfig["tools"] | undefined;
  if (config.options.manifest) {
    const toolsBundle = manifestToGemini(config.options.manifest);
    tools = [{ functionDeclarations: toolsBundle.tools }];
  }

  // Initialize conversation state
  const conversation: Content[] = [];

  // Build the config that will be used for all requests with default values
  const generateContentConfig: GenerateContentConfig = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    ...(tools && { 
      tools,
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
        },
      }
    }),
    temperature,
  };

  // Convert LLMMessage to Gemini Content format
  function toGeminiContent(msg: LLMMessage): Content[] {
    if (typeof msg.content === "string") {
      return [
        {
          role: msg.role,
          parts: [{ text: msg.content }],
        },
      ];
    }

    // Handle structured content
    const contents: Content[] = [];
    const parts: Part[] = [];

    for (const item of msg.content) {
      if (item.type === "text") {
        parts.push({ text: item.text });
      } else if (item.type === "function_response") {
        // Convert function response to Gemini functionResponse format
        const fr = item.functionResponse;
        parts.push({
          functionResponse: fr,
        });
      }
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role,
        parts,
      });
    }

    return contents;
  }

  // Convert Gemini Candidate to LLMResponse
  function fromGeminiCandidate(candidate: Candidate): LLMResponse {
    const parts = candidate?.content?.parts || [];
    
    // Extract thinking
    const thinkingParts = parts.filter(
      (part): part is Part => part.thought === true && part.text !== undefined
    );
    const thinking = thinkingParts.length > 0
      ? thinkingParts.map((part) => part.text).join("\n")
      : null;

    // Extract function calls
    const functionCalls: LLMFunctionCall[] = [];
    for (const part of parts) {
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name || "",
          args: (part.functionCall.args as Record<string, unknown>) || {},
        });
      }
    }

    // Extract text
    const textParts = parts
      .filter((part): part is Part => part.text !== undefined && !part.thought)
      .map((part) => part.text);
    const text = textParts.length > 0 ? textParts.join("") : null;

    return {
      thinking,
      text,
      functionCalls,
    };
  }

  return {
    async generateContent(
      messages: LLMMessage[],
      saveConversation: boolean = true
    ): Promise<LLMResponse> {
      // Convert LLM messages to Gemini Content format
      const geminiContents: Content[] = [];
      for (const msg of messages) {
        geminiContents.push(...toGeminiContent(msg));
      }

      // Make the API call
      const response = await genAI.models.generateContent({
        model: modelName,
        // Concatenate existing conversation with new contents
        contents: [...conversation, ...geminiContents],
        config: generateContentConfig,
      });

      // If successful, add new contents to conversation
      if (saveConversation) {
        conversation.push(...geminiContents);
      }

      // Extract candidate and convert to LLMResponse
      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error("No response from Gemini");
      }

      return fromGeminiCandidate(candidate);
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
      // Gemini format: model message with functionCall, then user message with functionResponse
      const messages: LLMMessage[] = [];

      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const response = responses[i];

        if (!call) {
          throw new Error(`Missing function call at index ${i}`);
        }
        if (!response) {
          throw new Error(`Missing response for function call: ${call.name}`);
        }

        // Gemini format: model message with function call
        messages.push({
          role: "assistant",
          content: [
            {
              type: "function_call",
              functionCall: {
                name: call.name,
                args: call.args,
              },
            },
          ],
        });

        // Then user message with function response
        messages.push({
          role: "user",
          content: [
            {
              type: "function_response",
              functionResponse: {
                name: response.name,
                response: response.response,
              },
            },
          ],
        });
      }

      return messages;
    },
  };
}
