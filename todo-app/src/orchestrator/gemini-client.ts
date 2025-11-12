/**
 * Gemini API client wrapper for orchestrator
 */

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type {
  GenerateContentResponse,
  GoogleGenAIOptions,
  Content,
  GenerateContentConfig,
} from "@google/genai";

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
 * Create and configure Gemini client
 *
 * @remarks
 * This client is NOT thread-safe. The conversation state is shared and mutable.
 * Do not use the same client instance concurrently from multiple threads/async contexts.
 */
export function createGeminiClient(
  config: GeminiClientConfig,
  options: CreateGeminiClientOptions
) {
  const genAI = new GoogleGenAI(config);
  const modelName = options.model || "gemini-flash-latest"; // || "gemini-2.0-flash-thinking-exp-01-21";

  // Initialize conversation state
  const conversation: Content[] = [];

  // Build the config that will be used for all requests with default values
  const generateContentConfig: GenerateContentConfig = {
    systemInstruction: {
      parts: [{ text: options.systemInstruction }],
    },
    ...(options.tools && { 
      tools: options.tools,
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
        },
      }
    }),
    temperature: 0.2,
    // maxOutputTokens: 8192,
    //thinkingConfig: {
      //includeThoughts: true,
      //thinkingBudget: -1,
    //},
  };

  return {
    /**
     * Generate content with new contents appended to conversation
     *
     * @remarks
     * This method is NOT thread-safe. The conversation state is shared and mutable.
     *
     * @param newContents - New content to add to the conversation
     * @returns The response from the model
     */
    async generateContent(
      newContents: Content[],
      saveConversation: boolean = true
    ): Promise<GenerateContentResponse> {

      // Make the API call
      const response = await genAI.models.generateContent({
        model: modelName,
        // Concatenate existing conversation with new contents
        contents: [...conversation, ...newContents],
        config: generateContentConfig,
      });

      // If successful, add newContents to conversation
      if (saveConversation) {
        conversation.push(...newContents);
      }
      return response;
    },
  };
}

