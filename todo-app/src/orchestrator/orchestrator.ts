/**
 * Main orchestrator for WAP Dynamic UI Orchestration
 */

import { createLLMProvider } from "./llm-provider.js";
import { buildFewShots } from "../api-client/manifest.transform.js";
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
  OrchestrateResult,
} from "./types.js";
import type { LLMProvider, LLMMessage, LLMFunctionCall, LLMFunctionResponse } from "./llm-provider.js";

/**
 * Type guard to check if a function call is a render call
 * Also validates and casts the args to RenderToolParams
 */
function isRenderFunctionCall(call: LLMFunctionCall | FunctionCall): call is RenderFunctionCall {
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

  const renderData = JSON.parse(renderCall.args.data || "{}");
  // Execute and display render
  const html = executeRenderFunction(renderCode, renderData, handleUserAction);
  if (callbacks?.onUIWithUserAction) {
    callbacks.onUIWithUserAction(html, handleUserAction);
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
  functionCalls: LLMFunctionCall[],
  apiClient: ApiClient,
  renderProvider: LLMProvider,
  callbacks: OrchestratorCallbacks | undefined,
  isAborted: () => boolean,
  setPendingUserAction: (promise: {
    promise: Promise<UserAction>;
    resolve: (action: UserAction) => void;
    reject: (error: Error) => void;
  }) => void,
  handleUserAction: (action: UserAction) => void
): Promise<LLMFunctionResponse[]> {
  // Index each call to preserve order
  const indexedCalls = functionCalls.map((call, index) => ({ call, index }));

  // Separate renders from normals
  const normalCalls: Array<{ call: LLMFunctionCall; index: number }> = [];
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
    // Convert LLMFunctionCall to FunctionCall for executeSiteAPI
    const functionCall: FunctionCall = {
      name: call.name,
      args: call.args,
    };
    const response = await executeSiteAPI(functionCall, apiClient);
    // Convert FunctionResponse to LLMFunctionResponse
    return { 
      index, 
      response: {
        name: response.name,
        response: response.response as Record<string, unknown>,
      } as LLMFunctionResponse
    };
  });

  // Execute render chain serially
  const renderResults: Array<{ index: number; response: LLMFunctionResponse }> = [];
  let taskCompleted = false;
  
  for (const { call, index } of renderCalls) {
    if (isAborted()) {
      throw new Error("Workflow aborted");
    }

    // Execute render with retry logic
    let renderCode: string;
    try {
      renderCode = await executeRender(call, renderProvider);
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
        renderCode = await executeRender(call, renderProvider);
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
  const responseMap = new Map<number, LLMFunctionResponse>();
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
export async function orchestrate(
  userInput: string,
  config: OrchestratorConfig,
  callbacks?: OrchestratorCallbacks
): Promise<OrchestrateResult> {
  const { apiKey, manifest, apiBaseUrl, provider } = config;

  // Build examples text from manifest for system instruction
  const examples = buildFewShots(manifest);
  const examplesText = examples.length > 0
    ? `\n\n# User Journey Examples\n\n${examples
        .map((example, index) => `## Example ${index + 1}:\n\nUser: ${example.user}\n\nAssistant: ${example.assistant}`)
        .join("\n\n")}`
    : "";

  const systemInstructionWithExamples = SYSTEM_INSTRUCTION + examplesText;

  // Initialize LLM provider with system instruction and manifest
  // Provider will transform manifest to its own tool format internally
  const llmProvider = await createLLMProvider({
    apiKey,
    provider,
    options: {
      systemInstruction: systemInstructionWithExamples,
      manifest,
    },
  });
  
  // Initialize render provider (separate from main orchestrator provider)
  const renderProvider = await createLLMProvider({
    apiKey,
    provider,
    options: {
      systemInstruction: "You are a UI code generator. Generate JavaScript functions that render HTML interfaces.",
    },
  });
  
  const apiClient = new ApiClient({
    baseUrl: apiBaseUrl,
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

  let nextConversation: LLMMessage[] = [
    {
      role: "user",
      content: userInput,
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

      // Generate content with LLM provider
      const response = await llmProvider.generateContent(nextConversation);
      nextConversation = [];

      if (aborted) {
        break;
      }

      // Extract and display thinking
      const thinking = llmProvider.extractThinking(response);
      if (thinking) {
        if (callbacks?.onThinking) {
          callbacks.onThinking(thinking);
        }
      }

      // Extract function calls
      const functionCalls = llmProvider.extractFunctionCalls(response);

      if (functionCalls.length === 0) {
        // No more function calls, show final response
        const text = llmProvider.extractText(response);
        if (text) {
          if (callbacks?.onResponse) {
            callbacks.onResponse(text);
          }
        }
        continueLoop = false;
        break;
      }

      // Execute function calls with parallel normals + serial renders
      let functionResponses: LLMFunctionResponse[];
      try {
        functionResponses = await executeFunctionCallsInOrder(
          functionCalls,
          apiClient,
          renderProvider,
          callbacks,
          isAborted,
          setPendingUserAction,
          handleUserAction
        );
      } catch (error) {
        // Check if this is a task completion signal
        if (error instanceof Error && error.message === "TASK_COMPLETED") {
          continueLoop = false;
          break;
        }
        throw error;
      }

      if (aborted) {
        break;
      }

      // Create function response messages using provider's method
      const responseMessages = llmProvider.createFunctionResponseMessages(
        functionCalls,
        functionResponses
      );
      nextConversation = responseMessages;
      
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

