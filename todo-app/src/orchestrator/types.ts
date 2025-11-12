/**
 * Type definitions for WAP Orchestrator
 */

import type { WAPManifest } from "../api-client/manifest.type.js";

/**
 * Configuration for the orchestrator
 */
export type OrchestratorConfig = {
  apiKey: string;
  manifest: WAPManifest;
  apiBaseUrl: string;
}

/**
 * Function call from Gemini
 */
export type FunctionCall = {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Render function call with typed arguments matching render tool structure
 */
export type RenderFunctionCall = FunctionCall & {
  name: "render";
  args: RenderToolParams;
}

/**
 * Function response to send back to Gemini
 */
export type FunctionResponse = {
  name: string;
  response: unknown;
}

/**
 * User action from UI
 */
export type UserAction = {
  actionId: string;
  payload?: Record<string, unknown>;
}

/**
 * Callback for user actions
 */
export type UserActionCallback = (action: UserAction) => void | Promise<void>;

/**
 * Callback for displaying thinking
 */
export type ThinkingCallback = (thinking: string) => void;

/**
 * Callback for displaying UI
 */
export type UICallback = (html: string) => void;

/**
 * Callback for displaying final response
 */
export type ResponseCallback = (text: string) => void;

/**
 * Callback for displaying errors
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Callback for render retry dialog
 * Returns true if user wants to retry, false if they want to cancel
 */
export type RenderRetryCallback = (error: Error, renderCall: RenderFunctionCall) => Promise<boolean>;

/**
 * Structured user action response to send back to Gemini
 */
export type UserActionResponse = {
  actionId: string;
  payload?: Record<string, unknown>;
}

/**
 * Callback for orchestration completion
 */
export type CompletionCallback = () => void;

/**
 * Orchestrator callbacks
 */
export type OrchestratorCallbacks = {
  onThinking?: ThinkingCallback;
  onUI?: UICallback;
  onResponse?: ResponseCallback;
  onError?: ErrorCallback;
  onUserAction?: UserActionCallback;
  onRenderRetry?: RenderRetryCallback;
  onComplete?: CompletionCallback;
}

/**
 * Abort function to cancel ongoing orchestration
 */
export type AbortFunction = () => void;

/**
 * Return type from orchestrate function
 */
export type OrchestrateResult = {
  abort: AbortFunction;
}

/**
 * Render tool parameters
 */
export type RenderToolParams = {
  dataStructure: string;
  data: Record<string, unknown>; // Actual data to render - keys must match dataStructure
  mainGoal: string;
  subGoal: string;
  stepType: "preview" | "confirm" | "progress" | "result" | "error";
  actions: Array<{
    id: string;
    label: string;
    variant?: "primary" | "danger" | "secondary" | "success";
    continues: boolean;
  }>;
  taskCompleted?: boolean; // If true, signals that the task is complete and conversation should end
  metadata?: {
    affectedCount?: number;
    operationType?: string;
    isDestructive?: boolean;
  };
}

/**
 * Render tool response structure
 * Matches the structured user action response sent back to Gemini
 */
export type RenderToolResponse = {
  type: "userAction";
  actionId: string;
  payload?: Record<string, unknown>;
}

