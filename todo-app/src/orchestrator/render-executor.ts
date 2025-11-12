/**
 * Render tool executor - generates UI render functions via secondary LLM call
 */

import type { RenderToolParams } from "./types.js";
import type { GenerateContentResponse } from "@google/genai";
import type { Content } from "@google/genai";

/**
 * Type for Gemini client used for render operations
 */
export type RenderGeminiClient = {
  generateContent(
    newContents: Content[],
    saveConversation?: boolean
  ): Promise<GenerateContentResponse>;
};

/**
 * Build the prompt for render generation
 */
function buildRenderPrompt(params: RenderToolParams): string {
  const { dataStructures, mainGoal, subGoal, stepType, actions, metadata } = params;

  const dataStructuresText = Object.entries(dataStructures)
    .map(([name, type]) => `  ${name}: ${type}`)
    .join("\n");

  const actionsText = actions
    .map(
      (action) =>
        `  - ${action.id}: ${action.label} (${action.variant || "primary"}, continues: ${action.continues})`
    )
    .join("\n");

  const metadataText = metadata
    ? Object.entries(metadata)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n")
    : "";

  return `You are a UI code generator. Generate a JavaScript function that renders an interactive HTML interface.

# Context

Main Goal: ${mainGoal}
Sub-Goal: ${subGoal}
Step Type: ${stepType}
${metadataText ? `\nMetadata:\n${metadataText}` : ""}

# Data Structures

The function will receive data with these types:
${dataStructuresText}

# Available Actions

The user can take these actions:
${actionsText}

# Requirements

Generate a JavaScript function with this exact signature:

\`\`\`javascript
function render(data, onAction) {
  // Your implementation here, these could include transforms, loops, etc.
  return \`<html string>\`;
}
\`\`\`

**Technical Requirements:**
- Return a single HTML string
- Use Tailwind CSS classes for styling
- Make the UI responsive (mobile-friendly)
- Use semantic HTML5 elements
- Ensure accessibility (ARIA labels, keyboard navigation)
- Handle empty and null data gracefully
- Do not import anything, use pure and native javascript objects and syntax.
- Do not access any global objects like window in the function logic. You can of course include global objects in generated output e.g. \`<button onclick="window.alert('foo-bar');" />\`
- Use SVG for Charts.
- For user downloads e.g. "Find orders from last month and convert to CSV or JSON for my download": Use Blob Data URL and offer the user a download link with an appropriate name.
  - Data Transformation logic can be generated and executed in-code in the client-side.

**Event Handling:**
- Call \`onAction(actionId, payload)\` when user clicks action buttons
- Use inline onclick handlers or CustomEvent dispatch
- No external event listener registration

**Step Type Guidelines:**

- **preview**: Show data in table/list/grid format with action buttons at bottom
  - Display all relevant fields from data structures
  - Include links to individual items (target="_blank")
  - Show count/summary at top
  - Action buttons clearly visible

- **confirm**: Show confirmation dialog with summary
  - Highlight destructive actions in red/warning colors
  - Show what will be affected (count, items)
  - Primary action button stands out
  - Cancel/back button less prominent

- **progress**: Show loading state with progress indicator
  - Display operation in progress
  - Show count completed / total if available
  - Use spinner or progress bar
  - Disable actions during execution

- **result**: Show success or error summary
  - Clear success/failure indication (color, icon)
  - Show what was accomplished (count, items)
  - Include next steps if applicable
  - Close/done button

- **error**: Show error message with details
  - Clear error indication
  - Show error message and details
  - Suggest corrective actions
  - Retry/cancel buttons if applicable

**Styling Guidelines:**
- Use Tailwind utility classes (bg-*, text-*, p-*, m-*, etc.)
- Destructive actions: red colors (bg-red-600, text-red-700)
- Success: green colors (bg-green-600, text-green-700)
- Primary: blue colors (bg-blue-600, text-blue-700)
- Secondary: gray colors (bg-gray-300, text-gray-700)
- Use shadows and rounded corners for depth
- Ensure adequate contrast for readability

# Output

Return ONLY the JavaScript function code. Do not include markdown formatting, explanations, or any text outside the function.

Example:
\`\`\`javascript
function render(data, onAction) {
  function helperFunctionA() {} // Reusable logic
  function helperFunctionB() {} // Reusable logic
  const {items} = data;
  // Your implementation here, these could include transforms, loops, etc.
  return \`<div class="p-4">...</div>\`;
}
\`\`\``;
}

/**
 * Extract JavaScript function from LLM response
 */
function extractJavaScriptFunction(response: string): string {
  // Remove markdown code blocks if present
  let code = response.trim();

  // Remove ```javascript or ``` markers
  code = code.replace(/^```(?:javascript|js)?\s*/m, "");
  code = code.replace(/\s*```$/m, "");

  // Trim whitespace
  code = code.trim();

  return code;
}

/**
 * Validate render function for security
 */
function validateRenderFunction(code: string): void {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /eval\(/,
    /Function\(/,
    /new\s+Function/,
    /<script/i,
    /document\.write/,
    /innerHTML\s*=/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(`Generated render function contains unsafe pattern: ${pattern}`);
    }
  }

  // Ensure function signature is correct
  if (!code.includes("function render(data, onAction)") && !code.includes("const render = (data, onAction)")) {
    throw new Error("Generated function does not match required signature");
  }
}

/**
 * Execute render tool - generates UI render function via secondary LLM call
 */
export async function executeRenderTool(
  params: RenderToolParams,
  geminiClient: RenderGeminiClient
): Promise<string> {
  const prompt = buildRenderPrompt(params);

  const response = await geminiClient.generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    false // saveConversation=false
  );

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("No response from Gemini");
  }

  const text = candidate.content?.parts
    ?.map((part) => ("text" in part ? part.text : ""))
    .join("") || "";

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  // Extract function from response
  const functionCode = extractJavaScriptFunction(text);

  // Security: Validate generated code
  validateRenderFunction(functionCode);

  return functionCode;
}

