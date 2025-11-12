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
 * Orchestrator callbacks
 */
export type OrchestratorCallbacks = {
  onThinking?: ThinkingCallback;
  onUI?: UICallback;
  onResponse?: ResponseCallback;
  onError?: ErrorCallback;
  onUserAction?: UserActionCallback;
}

/**
 * Render tool parameters
 */
export type RenderToolParams = {
  dataStructures: Record<string, string>;
  mainGoal: string;
  subGoal: string;
  stepType: "preview" | "confirm" | "progress" | "result" | "error";
  actions: Array<{
    id: string;
    label: string;
    variant?: "primary" | "danger" | "secondary" | "success";
    continues: boolean;
  }>;
  metadata?: {
    affectedCount?: number;
    operationType?: string;
    isDestructive?: boolean;
  };
}

