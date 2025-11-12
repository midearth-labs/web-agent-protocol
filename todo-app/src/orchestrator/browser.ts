/**
 * Browser integration for orchestrator
 */

import { initOrchestrator, getApiKey } from "./index.js";
import type { OrchestratorCallbacks } from "./types.js";

/**
 * Initialize orchestrator in browser
 */
export async function initBrowserOrchestrator() {
  try {
    // Get DOM elements
    const userInput = document.getElementById("userInput") as HTMLInputElement;
    const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
    const thinkingContainer = document.getElementById("thinkingContainer") as HTMLDivElement;
    const thinkingContent = document.getElementById("thinkingContent") as HTMLDivElement;
    const uiContainer = document.getElementById("uiContainer") as HTMLDivElement;
    const responseContainer = document.getElementById("responseContainer") as HTMLDivElement;
    const responseContent = document.getElementById("responseContent") as HTMLDivElement;
    const errorContainer = document.getElementById("errorContainer") as HTMLDivElement;
    const errorContent = document.getElementById("errorContent") as HTMLDivElement;

    // Clear display function
    const clearDisplay = () => {
      thinkingContainer.classList.add("hidden");
      uiContainer.classList.add("hidden");
      uiContainer.innerHTML = "";
      responseContainer.classList.add("hidden");
      errorContainer.classList.add("hidden");
    };

    // Setup callbacks
    const callbacks: OrchestratorCallbacks = {
      onThinking: (thinking: string) => {
        thinkingContainer.classList.remove("hidden");
        thinkingContent.textContent = thinking;
      },
      onUI: (html: string) => {
        uiContainer.classList.remove("hidden");
        uiContainer.innerHTML = html;
      },
      onResponse: (text: string) => {
        responseContainer.classList.remove("hidden");
        responseContent.textContent = text;
      },
      onError: (error: Error) => {
        errorContainer.classList.remove("hidden");
        errorContent.textContent = error.message;
      },
      onUserAction: async (action) => {
        // User action is handled in the orchestrator
        // This callback is for logging/debugging
        console.log("User action:", action);
        // The orchestrator will continue processing after user action
      },
    };

    // Setup submit handler
    const handleSubmit = async () => {
      const input = userInput.value.trim();
      if (!input) {
        return;
      }

      // Check if API key is set (re-check in case it was updated)
      let currentApiKey: string;
      try {
        currentApiKey = getApiKey();
      } catch (error) {
        if (callbacks.onError) {
          callbacks.onError(
            new Error(
              "Please set your Gemini API key in the field above and click 'Save' before submitting requests."
            )
          );
        }
        return;
      }

      // Initialize orchestrator with current API key
      const orchestrator = await initOrchestrator(currentApiKey, "/api/v1/", callbacks);

      // Disable submit button
      submitBtn.disabled = true;
      userInput.disabled = true;

      // Clear previous display
      clearDisplay();

      try {
        await orchestrator.execute(input);
      } catch (error) {
        if (callbacks.onError) {
          callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
      }
    };

    submitBtn.addEventListener("click", handleSubmit);
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    });

    // Focus input on load
    userInput.focus();
  } catch (error) {
    const errorContainer = document.getElementById("errorContainer") as HTMLDivElement;
    const errorContent = document.getElementById("errorContent") as HTMLDivElement;
    if (errorContainer && errorContent) {
      errorContainer.classList.remove("hidden");
      errorContent.textContent =
        error instanceof Error ? error.message : String(error);
    }
    console.error("Failed to initialize orchestrator:", error);
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBrowserOrchestrator);
  } else {
    initBrowserOrchestrator();
  }
}

