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
    const cancelBtn = document.getElementById("cancelBtn") as HTMLButtonElement;
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

    // Abort function reference
    let currentAbort: (() => void) | null = null;

    // Setup callbacks
    const callbacks: OrchestratorCallbacks = {
      onThinking: (thinking: string) => {
        if (thinking) {
          thinkingContainer.classList.remove("hidden");
          thinkingContent.textContent = thinking;
        } else {
          thinkingContainer.classList.add("hidden");
          thinkingContent.textContent = "";
        }
      },
      onUI: (html: string) => {
        if (html) {
          uiContainer.classList.remove("hidden");
          uiContainer.innerHTML = html;
        } else {
          uiContainer.classList.add("hidden");
          uiContainer.innerHTML = "";
        }
      },
      onUIWithUserAction: (html, onAction) => {
        // @TODO: remove this monstrosity
        (window as any).onAction = onAction;
        if (html) {
          uiContainer.classList.remove("hidden");
          uiContainer.innerHTML = html;
        } else {
          uiContainer.classList.add("hidden");
          uiContainer.innerHTML = "";
        }
      },
      onResponse: (text: string) => {
        responseContainer.classList.remove("hidden");
        responseContent.textContent = text;
      },
      onError: (error: Error) => {
        errorContainer.classList.remove("hidden");
        errorContent.textContent = error.message;
        console.error("Error:", error);
      },
      onUserAction: async (action) => {
        // User action is handled in the orchestrator
        // This callback is for logging/debugging
        console.log("User action:", action);
        // The orchestrator will continue processing after user action
      },
      onRenderRetry: async (error: Error, _renderCall: any) => {
        // Show retry dialog
        const message = `${error.message}\n\nWould you like to retry rendering?`;
        const shouldRetry = window.confirm(message);
        return shouldRetry;
      },
      onComplete: () => {
        // Re-enable submit button, disable cancel button when orchestration completes
        submitBtn.disabled = false;
        userInput.disabled = false;
        if (cancelBtn) {
          cancelBtn.disabled = true;
          cancelBtn.classList.add("hidden");
        }
        currentAbort = null;
        userInput.focus();
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
      const orchestrator = await initOrchestrator(currentApiKey, "http://localhost:3000/api/v1/", callbacks);

      // Disable submit button, enable cancel button
      submitBtn.disabled = true;
      userInput.disabled = true;
      if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.classList.remove("hidden");
      }

      // Clear previous display
      clearDisplay();

      // Execute orchestration (returns abort function immediately)
      const result = orchestrator.execute(input);
      currentAbort = result.abort;

      // Note: Orchestration runs in background, we don't await it
      // The abort function is available immediately
    };

    // Setup cancel handler
    const handleCancel = () => {
      if (currentAbort) {
        // Show confirmation dialog
        if (window.confirm("Are you sure you want to cancel the current workflow?")) {
          currentAbort();
          currentAbort = null;
          
          // Clear UI
          clearDisplay();
          
          // Re-enable submit button, disable cancel button
          submitBtn.disabled = false;
          userInput.disabled = false;
          if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.classList.add("hidden");
          }
        }
      }
    };

    submitBtn.addEventListener("click", handleSubmit);
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    });

    // Setup cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener("click", handleCancel);
      // Initially hidden and disabled
      cancelBtn.disabled = true;
      cancelBtn.classList.add("hidden");
    }

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

