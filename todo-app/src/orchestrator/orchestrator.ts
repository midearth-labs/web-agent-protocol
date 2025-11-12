/**
 * Main orchestrator for WAP Dynamic UI Orchestration
 */

import { createGeminiClient } from "./gemini-client.js";
import { manifestToGemini } from "../api-client/manifest.transform.js";
import { ApiClient } from "../api-client/api-client.js";
import { executeToolCalls } from "./tool-executor.js";
import { SYSTEM_INSTRUCTION } from "./system-instruction.js";
import type {
  OrchestratorConfig,
  OrchestratorCallbacks,
  FunctionCall,
  UserAction,
} from "./types.js";
import type { Candidate, Part } from "@google/genai";

/**
 * Extract thinking from Gemini candidate
 * 
 * According to the official Gemini API docs:
 * - Parts with thinking have `thought: true` and the text in `text` property
 * - See: https://ai.google.dev/gemini-api/docs/thinking
 */
function extractThinking(candidate: Candidate): string | null {
  // Check for thinking in content parts
  // Parts with thinking have thought: true and the text in the text property
  const thinkingParts = candidate?.content?.parts?.filter(
    (part): part is Part =>
      part.thought === true && part.text !== undefined
  ) || [];

  if (thinkingParts.length === 0) {
    return null;
  }

  // Concatenate all thought parts
  return thinkingParts.map((part) => part.text).join("\n") || null;
}

/**
 * Extract function calls from Gemini candidate
 */
function extractFunctionCalls(candidate: Candidate): FunctionCall[] {
  const parts = candidate?.content?.parts || [];
  const functionCalls: FunctionCall[] = [];

  for (const part of parts) {
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name || "",
        args: part.functionCall.args || {},
      });
    }
  }

  return functionCalls;
}

/**
 * Extract text from Gemini candidate
 */
function extractText(candidate: Candidate): string | null {
  const parts = candidate?.content?.parts || [];
  const textParts = parts
    .filter((part): part is Part => part.text !== undefined)
    .map((part) => part.text)
    .join("");

  return textParts || null;
}

/**
 * Extract render data from function call args and previous responses
 */
function extractRenderData(
  renderArgs: Record<string, unknown>,
  functionResponses: Array<{ name: string; response: unknown }>
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const dataStructures = renderArgs["dataStructures"] as Record<string, string> | undefined;

  if (!dataStructures) {
    return data;
  }

  // Map data structure names to function response data
  for (const [varName] of Object.entries(dataStructures)) {
    // Try to find matching response by name or infer from context
    // For now, we'll use the first response that matches the expected structure
    // This is a simplified version - in practice, the LLM should specify which responses to use
    const matchingResponse = functionResponses.find((fr) => {
      // Check if response structure matches expected type
      if (varName === "items" && Array.isArray(fr.response)) {
        return true;
      }
      if (varName === "summary" && typeof fr.response === "object") {
        return true;
      }
      return false;
    });

    if (matchingResponse) {
      data[varName] = matchingResponse.response;
    }
  }

  return data;
}

/**
 * Check if render call requires user action
 */
function requiresUserAction(renderArgs: Record<string, unknown>): boolean {
  const actions = renderArgs["actions"] as Array<{ continues: boolean }> | undefined;
  if (!actions) {
    return false;
  }

  // If any action continues, we need user input
  return actions.some((action) => action.continues);
}

/**
 * Main orchestration function
 */
export async function orchestrate(
  userInput: string,
  config: OrchestratorConfig,
  callbacks?: OrchestratorCallbacks
): Promise<void> {
  const { apiKey, manifest, apiBaseUrl } = config;

  // Build tools from manifest
  const toolsBundle = manifestToGemini(manifest);
  const tools = toolsBundle.tools.functionDeclarations;

  // Initialize clients with system instruction and tools
  const geminiClient = createGeminiClient(
    { apiKey },
    {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }],
    }
  );
  
  // Initialize render client (separate from main orchestrator client)
  const renderGeminiClient = createGeminiClient(
    { apiKey },
    {
      systemInstruction: "You are a UI code generator. Generate JavaScript functions that render HTML interfaces.",
    }
  );
  
  const apiClient = new ApiClient({
    baseUrl: apiBaseUrl || "/api/v1/",
  });

  let continueLoop = true;
  let pendingUserAction: Promise<UserAction> | null = null;
  let userActionResolve: ((action: UserAction) => void) | null = null;
  let isFirstCall = true;

  // Create user action handler
  const handleUserAction = (action: UserAction) => {
    if (userActionResolve) {
      userActionResolve(action);
      userActionResolve = null;
    }
    if (callbacks?.onUserAction) {
      callbacks.onUserAction(action);
    }
  };

  while (continueLoop) {
    try {
      // Generate content with Gemini
      // First iteration: send initial user message
      // Subsequent iterations: send empty array to continue conversation
      const response = await geminiClient.generateContent(
        isFirstCall
          ? [
              {
                role: "user",
                parts: [{ text: userInput }],
              },
            ]
          : []
      );
      isFirstCall = false;

      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error("No response from Gemini");
      }

      // Extract and display thinking
      const thinking = extractThinking(candidate);
      if (thinking) {
        if (callbacks?.onThinking) {
          callbacks.onThinking(thinking);
        }
      }

      // Extract function calls
      const functionCalls = extractFunctionCalls(candidate);

      if (functionCalls.length === 0) {
        // No more function calls, show final response
        const text = extractText(candidate);
        if (text) {
          if (callbacks?.onResponse) {
            callbacks.onResponse(text);
          }
        }
        continueLoop = false;
        break;
      }

      // Execute function calls (in parallel where possible)
      const functionResponses = await executeToolCalls(functionCalls, apiClient, renderGeminiClient);

      // Process render tool calls
      for (const fc of functionCalls) {
        if (fc.name === "render") {
          const renderResponse = functionResponses.find((r) => r.name === "render");
          if (renderResponse && typeof renderResponse.response === "string") {
            const renderCode = renderResponse.response;

            // Extract render data
            const renderData = extractRenderData(fc.args, functionResponses);

            // Execute render function with real data
            try {
              // Create render function in safe context
              const renderFn = new Function(
                "data",
                "onAction",
                renderCode + "; return render(data, onAction);"
              );

              // Display UI
              const html = renderFn(renderData, (actionId: string, payload?: Record<string, unknown>) => {
                handleUserAction(payload ? { actionId, payload } : { actionId });
              });

              if (callbacks?.onUI) {
                callbacks.onUI(html);
              }

              // If action requires user input, wait for it
              if (requiresUserAction(fc.args)) {
                pendingUserAction = new Promise<UserAction>((resolve) => {
                  userActionResolve = resolve;
                });

                const userAction = await pendingUserAction;
                pendingUserAction = null;

                // Add user action to conversation and continue
                await geminiClient.generateContent([
                  {
                    role: "user",
                    parts: [
                      {
                        text: `User action: ${userAction.actionId}${userAction.payload ? ` with payload: ${JSON.stringify(userAction.payload)}` : ""}`,
                      },
                    ],
                  },
                ]);

                // Continue loop to process user action
                continue;
              }
            } catch (error) {
              if (callbacks?.onError) {
                callbacks.onError(
                  error instanceof Error ? error : new Error(String(error))
                );
              }
            }
          }
        }
      }

      // Add function responses to conversation and get next model response
      const functionResponseContent = await geminiClient.generateContent([
        {
          role: "user",
          parts: functionResponses.map((fr) => ({
            functionResponse: {
              name: fr.name,
              response: fr.response as Record<string, unknown>,
            },
          })),
        },
      ]);

      // Process the response from function responses
      const functionResponseCandidate = functionResponseContent.candidates?.[0];
      if (!functionResponseCandidate) {
        continueLoop = false;
        break;
      }

      // Extract and display thinking from function response
      const functionResponseThinking = extractThinking(functionResponseCandidate);
      if (functionResponseThinking) {
        if (callbacks?.onThinking) {
          callbacks.onThinking(functionResponseThinking);
        }
      }

      // Extract function calls from function response
      const nextFunctionCalls = extractFunctionCalls(functionResponseCandidate);

      if (nextFunctionCalls.length === 0) {
        // No more function calls, show final response
        const text = extractText(functionResponseCandidate);
        if (text) {
          if (callbacks?.onResponse) {
            callbacks.onResponse(text);
          }
        }
        continueLoop = false;
        break;
      }

      // Process next function calls inline (similar to first set)
      const nextFunctionResponses = await executeToolCalls(nextFunctionCalls, apiClient, renderGeminiClient);

      // Process render tool calls from next set
      for (const fc of nextFunctionCalls) {
        if (fc.name === "render") {
          const renderResponse = nextFunctionResponses.find((r) => r.name === "render");
          if (renderResponse && typeof renderResponse.response === "string") {
            const renderCode = renderResponse.response;
            const renderData = extractRenderData(fc.args, nextFunctionResponses);

            try {
              const renderFn = new Function(
                "data",
                "onAction",
                renderCode + "; return render(data, onAction);"
              );

              const html = renderFn(renderData, (actionId: string, payload?: Record<string, unknown>) => {
                handleUserAction(payload ? { actionId, payload } : { actionId });
              });

              if (callbacks?.onUI) {
                callbacks.onUI(html);
              }

              if (requiresUserAction(fc.args)) {
                pendingUserAction = new Promise<UserAction>((resolve) => {
                  userActionResolve = resolve;
                });

                const userAction = await pendingUserAction;
                pendingUserAction = null;

                await geminiClient.generateContent([
                  {
                    role: "user",
                    parts: [
                      {
                        text: `User action: ${userAction.actionId}${userAction.payload ? ` with payload: ${JSON.stringify(userAction.payload)}` : ""}`,
                      },
                    ],
                  },
                ]);

                continue;
              }
            } catch (error) {
              if (callbacks?.onError) {
                callbacks.onError(
                  error instanceof Error ? error : new Error(String(error))
                );
              }
            }
          }
        }
      }

      // Add next function responses and continue the loop
      // The loop will handle getting the next response
      await geminiClient.generateContent([
        {
          role: "user",
          parts: nextFunctionResponses.map((fr) => ({
            functionResponse: {
              name: fr.name,
              response: fr.response as Record<string, unknown>,
            },
          })),
        },
      ]);

      // Continue loop to get next response
      continue;
    } catch (error) {
      if (callbacks?.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      continueLoop = false;
      break;
    }
  }
}

