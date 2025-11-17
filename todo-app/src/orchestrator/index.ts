/**
 * Main entry point for WAP Orchestrator
 */

import { orchestrate } from "./orchestrator.js";
import { fetchManifest } from "../api-client/manifest.loader.js";
import type { OrchestratorConfig, OrchestratorCallbacks, LLMProviderType } from "./types.js";

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
  provider: LLMProviderType,
  callbacks?: OrchestratorCallbacks
) {
  // Load manifest
  const manifest = await fetchManifest("/wap.json");

  // Create config
  const config: OrchestratorConfig = {
    apiKey,
    manifest,
    apiBaseUrl,
    provider,
  };

  return {
    /**
     * Execute orchestration for user input
     * Returns abort function to cancel the workflow immediately
     * Orchestration runs in the background
     */
    async execute(userInput: string): Promise<{ abort: () => void }> {
      const result = await orchestrate(userInput, config, callbacks);
      return result;
    },
  };
}

/**
 * Get provider from sessionStorage or environment variable
 * Falls back to checking LLM_PROVIDER env var/sessionStorage
 */
export function getProvider(): LLMProviderType {
  // Try to get from sessionStorage (browser)
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    const provider = sessionStorage.getItem("LLM_PROVIDER");
    if (provider === "gemini" || provider === "claude") {
      return provider;
    }
  }

  // Fallback to environment variable (for Node.js environments)
  if (typeof process !== "undefined" && process.env?.["LLM_PROVIDER"]) {
    const provider = process.env["LLM_PROVIDER"];
    if (provider === "gemini" || provider === "claude") {
      return provider;
    }
  }

  throw new Error(
    "LLM_PROVIDER not found or invalid. Please set it to 'gemini' or 'claude' in sessionStorage (browser) or environment variable (Node.js)."
  );
}

/**
 * Get API key from sessionStorage or environment variable based on provider
 */
export function getApiKey(provider: LLMProviderType): string {
  const keyName = provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";

  // Try to get from sessionStorage (browser)
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    const apiKey = sessionStorage.getItem(keyName);
    if (apiKey) {
      return apiKey;
    }
  }

  // Fallback to environment variable (for Node.js environments)
  if (typeof process !== "undefined" && process.env?.[keyName]) {
    return process.env[keyName];
  }

  throw new Error(
    `${keyName} not found. Please set it in sessionStorage (browser) or environment variable (Node.js).`
  );
}

