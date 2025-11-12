/**
 * UI display layer for orchestrator
 */

import type {
  ThinkingCallback,
  UICallback,
  ResponseCallback,
  ErrorCallback,
} from "./types.js";

/**
 * Display thinking process
 */
export function displayThinking(thinking: string, callback?: ThinkingCallback): void {
  if (callback) {
    callback(thinking);
  } else {
    console.log("[Thinking]", thinking);
  }
}

/**
 * Display generated UI
 */
export function displayUI(html: string, callback?: UICallback): void {
  if (callback) {
    callback(html);
  } else {
    console.log("[UI]", html);
  }
}

/**
 * Display final text response
 */
export function displayFinalResponse(text: string, callback?: ResponseCallback): void {
  if (callback) {
    callback(text);
  } else {
    console.log("[Response]", text);
  }
}

/**
 * Display error
 */
export function displayError(error: Error, callback?: ErrorCallback): void {
  if (callback) {
    callback(error);
  } else {
    console.error("[Error]", error);
  }
}

