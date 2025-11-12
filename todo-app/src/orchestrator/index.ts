/**
 * Main entry point for WAP Orchestrator
 */

import { orchestrate } from "./orchestrator.js";
import { fetchManifest } from "../api-client/manifest.loader.js";
import type { OrchestratorConfig, OrchestratorCallbacks } from "./types.js";

// Browser integration
if (typeof window !== "undefined") {
  import("./browser.js");
}

/**
 * Initialize and run orchestrator
 */
export async function initOrchestrator(
  apiKey: string,
  apiBaseUrl: string,
  callbacks?: OrchestratorCallbacks
) {
  // Load manifest
  const manifest = await fetchManifest("/wap.json");

  // Create config
  const config: OrchestratorConfig = {
    apiKey,
    manifest,
    apiBaseUrl,
  };

  return {
    /**
     * Execute orchestration for user input
     * Returns abort function to cancel the workflow immediately
     * Orchestration runs in the background
     */
    execute(userInput: string): { abort: () => void } {
      const result = orchestrate(userInput, config, callbacks);
      return result;
    },
  };
}

/**
 * Get API key from sessionStorage or environment variable
 */
export function getApiKey(): string {
  // Try to get from sessionStorage (browser)
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    const apiKey = sessionStorage.getItem("GEMINI_API_KEY");
    if (apiKey) {
      return apiKey;
    }
  }

  // Fallback to environment variable (for Node.js environments)
  if (typeof process !== "undefined" && process.env?.["GEMINI_API_KEY"]) {
    return process.env?.["GEMINI_API_KEY"];
  }

  throw new Error(
    "GEMINI_API_KEY not found. Please set it in sessionStorage (browser) or environment variable (Node.js)."
  );
}

