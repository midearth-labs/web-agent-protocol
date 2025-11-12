/**
 * Main orchestrator for WAP Dynamic UI Orchestration
 */

import { createGeminiClient } from "./gemini-client.js";
import { manifestToGemini } from "../api-client/manifest.transform.js";
import { ApiClient } from "../api-client/api-client.js";
import { executeSiteAPI, executeRender } from "./tool-executor.js";
import { SYSTEM_INSTRUCTION } from "./system-instruction.js";
import type {
  OrchestratorConfig,
  OrchestratorCallbacks,
  FunctionCall,
  RenderFunctionCall,
  RenderToolResponse,
  UserAction,
  FunctionResponse,
  OrchestrateResult,
} from "./types.js";
import type { Candidate, Content, Part } from "@google/genai";

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
      functionCalls.push(part.functionCall);
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
 * Type guard to check if a function call is a render call
 * Also validates and casts the args to RenderToolParams
 */
function isRenderFunctionCall(call: FunctionCall): call is RenderFunctionCall {
  if (call.name !== "render") {
    return false;
  }
  // Validate that args match RenderToolParams structure
  const args = call.args;
  return (
    typeof args === "object" &&
    args !== null &&
    "dataStructure" in args &&
    "data" in args &&
    "mainGoal" in args &&
    "subGoal" in args &&
    "stepType" in args &&
    "actions" in args
  );
}

/**
 * Check if render call requires user action
 */
function requiresUserAction(renderCall: RenderFunctionCall): boolean {
  const actions = renderCall.args.actions;
  if (!actions) {
    return false;
  }

  // If any action continues, we need user input
  return actions.some((action) => action.continues);
}

/**
 * Execute render function and return HTML
 */
function executeRenderFunction(
  renderCode: string,
  renderData: Record<string, unknown>,
  handleUserAction: (action: UserAction) => void
): string {
  const renderFn = new Function(
    "data",
    "onAction",
    renderCode + "; return render(data, onAction);"
  );

  return renderFn(renderData, handleUserAction);
}

/**
 * Process render with user action handling
 * Returns true if task is completed, false otherwise
 */
async function processRenderWithUserAction(
  renderCall: RenderFunctionCall,
  renderCode: string,
  callbacks: OrchestratorCallbacks | undefined,
  isAborted: () => boolean,
  setPendingUserAction: (promise: {
    promise: Promise<UserAction>;
    resolve: (action: UserAction) => void;
    reject: (error: Error) => void;
  }) => void,
  handleUserAction: (action: UserAction) => void
): Promise<boolean | RenderToolResponse> {
  if (isAborted()) {
    throw new Error("Workflow aborted");
  }

  const renderData = renderCall.args.data;
  // Execute and display render
  const html = executeRenderFunction(renderCode, renderData, handleUserAction);
  if (callbacks?.onUI) {
    callbacks.onUI(html);
  }

  // Check if task is completed
  if (renderCall.args.taskCompleted === true) {
    // Final render, no user action needed
    return true; // Task completed
  }

  // If requires user action, wait for it
  if (requiresUserAction(renderCall)) {
    let resolve: (action: UserAction) => void;
    let reject: (error: Error) => void;

    const actionPromise = new Promise<UserAction>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    setPendingUserAction({ promise: actionPromise, resolve: resolve!, reject: reject! });

    try {
      const userAction = await actionPromise;

      if (isAborted()) {
        throw new Error("Workflow aborted");
      }

      // Send structured user action response matching RenderToolResponse schema
      return {
        type: "userAction",
        actionId: userAction.actionId,
        ...(userAction.payload && { payload: userAction.payload }),
      } satisfies RenderToolResponse;
    } catch (error) {
      // Aborted or cancelled
      throw error;
    }
  }

  return false; // Task not completed
}

/**
 * Execute function calls in order: parallel normals + serial renders
 * Returns responses in original order
 */
async function executeFunctionCallsInOrder(
  functionCalls: FunctionCall[],
  apiClient: ApiClient,
  renderGeminiClient: ReturnType<typeof createGeminiClient>,
  callbacks: OrchestratorCallbacks | undefined,
  isAborted: () => boolean,
  setPendingUserAction: (promise: {
    promise: Promise<UserAction>;
    resolve: (action: UserAction) => void;
    reject: (error: Error) => void;
  }) => void,
  handleUserAction: (action: UserAction) => void
): Promise<FunctionResponse[]> {
  // Index each call to preserve order
  const indexedCalls = functionCalls.map((call, index) => ({ call, index }));

  // Separate renders from normals
  const normalCalls: Array<{ call: FunctionCall; index: number }> = [];
  const renderCalls: Array<{ call: RenderFunctionCall; index: number }> = [];

  indexedCalls.forEach(({ call, index }) => {
    if (isRenderFunctionCall(call)) {
      renderCalls.push({ call, index });
    } else {
      normalCalls.push({ call, index });
    }
  });

  // Execute normal calls in parallel
  const normalPromises = normalCalls.map(async ({ call, index }) => {
    if (isAborted()) {
      throw new Error("Workflow aborted");
    }
    const response = await executeSiteAPI(call, apiClient);
    return { index, response };
  });

  // Execute render chain serially
  const renderResults: Array<{ index: number; response: FunctionResponse }> = [];
  let taskCompleted = false;
  
  for (const { call, index } of renderCalls) {
    if (isAborted()) {
      throw new Error("Workflow aborted");
    }

    // Execute render with retry logic
    let renderCode: string;
    try {
      renderCode = await executeRender(call, renderGeminiClient);
    } catch (error) {
      // Show retry dialog
      if (callbacks?.onRenderRetry) {
        const shouldRetry = await callbacks.onRenderRetry(
          error instanceof Error ? error : new Error(String(error)),
          call
        );
        if (!shouldRetry) {
          throw new Error("Render cancelled by user");
        }
        // Retry
        renderCode = await executeRender(call, renderGeminiClient);
      } else {
        throw error;
      }
    }

    // Process render with user action handling
    const result = await processRenderWithUserAction(
      call,
      renderCode,
      callbacks,
      isAborted,
      setPendingUserAction,
      handleUserAction
    );

    if (typeof result === "boolean") {
      if (result) {
        taskCompleted = true;
        renderResults.push({ index, response: { name: "render", response: {} } });
      }
    } else {
      renderResults.push({ index, response: { name: "render", response: result } });
    }
  }

  // Wait for all normal calls
  const normalResults = await Promise.all(normalPromises);

  // Combine all results
  const allResults = [...normalResults, ...renderResults];

  // Create response map
  const responseMap = new Map<number, FunctionResponse>();
  allResults.forEach(({ index, response }) => {
    responseMap.set(index, response);
  });

  // Return in original order
  const orderedResponses = functionCalls.map((_, index) => {
    const response = responseMap.get(index);
    if (!response) {
      throw new Error(`Missing response for function call at index ${index}`);
    }
    return response;
  });

  // If task was completed, throw special error to signal completion
  if (taskCompleted) {
    const completionError = new Error("TASK_COMPLETED");
    (completionError as any).responses = orderedResponses;
    throw completionError;
  }

  return orderedResponses;
}

/**
 * Main orchestration function
 * Returns abort function immediately, orchestration runs in background
 */
export function orchestrate(
  userInput: string,
  config: OrchestratorConfig,
  callbacks?: OrchestratorCallbacks
): OrchestrateResult {
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
  let aborted = false;
  let abortReason: Error | null = null;
  let pendingUserAction: {
    promise: Promise<UserAction>;
    resolve: (action: UserAction) => void;
    reject: (error: Error) => void;
  } | null = null;

  // Abort check function
  const isAborted = () => aborted;

  // Set pending user action
  const setPendingUserAction = (promise: {
    promise: Promise<UserAction>;
    resolve: (action: UserAction) => void;
    reject: (error: Error) => void;
  }) => {
    pendingUserAction = promise;
  };

  // Create user action handler
  const handleUserAction = (action: UserAction) => {
    if (pendingUserAction) {
      pendingUserAction.resolve(action);
      pendingUserAction = null;
    }
    if (callbacks?.onUserAction) {
      callbacks.onUserAction(action);
    }
  };

  // Abort function - available immediately
  const abort = () => {
    aborted = true;
    abortReason = new Error("Workflow aborted by user");
    continueLoop = false;

    // Reject pending user action
    if (pendingUserAction) {
      pendingUserAction.reject(abortReason);
      pendingUserAction = null;
    }

    // Clear UI
    if (callbacks?.onUI) {
      callbacks.onUI(""); // Clear render UI
    }
    if (callbacks?.onThinking) {
      callbacks.onThinking(""); // Clear thinking
    }
  };

  // Start orchestration in background (don't await)
  (async () => {

  let nextConversation: Content[] = [
    {
      role: "user",
      parts: [{ text: userInput }],
    },
  ];

  while (continueLoop && !aborted) {
    try {
      if (nextConversation.length == 0) {
        throw new Error("No conversation to generate content. This should not happen.");
      }
      // Check abort before each major operation
      if (aborted) {
        break;
      }

      // Generate content with Gemini
      // First iteration: send initial user message
      // Subsequent iterations: send empty array to continue conversation
      const response = await geminiClient.generateContent(nextConversation);
      nextConversation = [];

      if (aborted) {
        break;
      }

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

      // Execute function calls with parallel normals + serial renders
      let functionResponses: FunctionResponse[];
      try {
        functionResponses = await executeFunctionCallsInOrder(
          functionCalls,
          apiClient,
          renderGeminiClient,
          callbacks,
          isAborted,
          setPendingUserAction,
          handleUserAction
        );
      } catch (error) {
        // Check if this is a task completion signal
        if (error instanceof Error && error.message === "TASK_COMPLETED") {
          /*
          // Extract responses from error if available
          functionResponses = (error as any).responses || [];
          // Send responses back to model before stopping
          if (functionResponses.length > 0) {
            await geminiClient . generateContent([
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
          }
          */
          continueLoop = false;
          break;
        }
        throw error;
      }

      if (aborted) {
        break;
      }

      // Populate nextConversation with model's function calls and function responses
      // Following Gemini API pattern: add model's function call, then user's function response
      functionCalls.forEach((functionCall, index) => {
        nextConversation.push({
          role: "model",
          parts: [{ functionCall: functionCall }],
        });
        nextConversation.push({
          role: "user",
          parts: [
            {
              functionResponse: functionResponses[index]!,
            },
          ],
        })
      });
      // Continue loop to get next response
      continue;
    } catch (error) {
      if (aborted && abortReason) {
        // Abort was intentional, exit cleanly
        break;
      }
      if (callbacks?.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      continueLoop = false;
      break;
    }
  }
  })().catch((error) => {
    if (!aborted && callbacks?.onError) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }).finally(() => {
    // Call completion callback if not aborted
    if (!aborted && callbacks?.onComplete) {
      callbacks.onComplete();
    }
  });

  // Return abort function immediately
  return { abort };
}

