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
  const { dataStructure, mainGoal, subGoal, stepType, actions, metadata, taskCompleted } = params;

  const actionsText = JSON.stringify(actions);
  const dataStructureText = extractTypeScriptFunction(dataStructure);

  const metadataText = JSON.stringify(metadata);

  const taskCompletedText = taskCompleted === true ? "\nTask Completed: true (This is the final completion UI - make it clear the task is done)" : "";

  return `You are a UI code generator. Generate a JavaScript function that renders an interactive HTML interface.

# Context

Main Goal: ${mainGoal}
Sub-Goal: ${subGoal}
Step Type: ${stepType}${taskCompletedText}
${metadataText ? `\nMetadata:\n\`\`\`json${metadataText}\n\`\`\`` : ""}

# Data Structures

The function will receive data with these typescript types:
\`\`\`typescript
${dataStructureText}
\`\`\`

# Available Actions

The user can take these actions:
\`\`\`json
${actionsText}
\`\`\`

# Requirements

Generate a JavaScript function with this exact signature, use the RenderFunction typescript example to understand its structure better:

\`\`\`javascript
function render(data, onAction) {
  // Your implementation here, these could include transforms, loops, and using the available actions to generate buttons that will call the onAction callback when clicked, etc.
  return \`<html string>\`;
}
\`\`\`

\`\`\`typescript
/**
 * Generated render function signature
 * 
 * @param data - Object with keys matching dataStructures parameter names
 * @param onAction - Callback invoked when user clicks action button
 * @returns HTML string with inline event handlers
 */
type RenderFunction = (
  data: Record<string, any>,
  onAction: (action: { actionId: string; payload?: Record<string, any> }) => void
) => string;
\`\`\`

**IMPORTANT: THE TYPESCRIPT IS JUST TO UNDERSTAND THE SIGNATURE. DO NOT GENERATE TYPESCRIPT CODE, ONLY SAFE JAVASCRIPT CODE OF THE "render" function THAT WILL BE RUN IN THE BROWSER**

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
- Call \`onAction(action)\` when user clicks action buttons, where \`action\` is an object with \`{ actionId: string, payload?: Record<string, unknown> }\` derived from the actions JSON defined.
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
  - If taskCompleted parameter is true, this is the final completion UI - make it clear the task is done

- **error**: Show error message with details
  - Clear error indication
  - Show error message and details
  - Suggest corrective actions
  - Retry/cancel buttons if applicable
  - If taskCompleted parameter is true, this is the final error state - make it clear the task has ended

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

Examples:

## Example 1: Confirm Step - Bulk Delete Operation
\`\`\`json
{
  "dataStructure": "interface DeleteConfirm { items: Array<{ id: string; title: string; status: string; }>; count: number; }",
  "data": {
    "items": [
      { "id": "1", "title": "Complete project documentation", "status": "done" },
      { "id": "2", "title": "Review code changes", "status": "done" },
      { "id": "3", "title": "Update dependencies", "status": "done" },
      { "id": "4", "title": "Fix bug in login flow", "status": "done" },
      { "id": "5", "title": "Write unit tests", "status": "done" }
    ],
    "count": 5
  },
  "mainGoal": "Clean up completed todos",
  "subGoal": "Delete 5 completed todos permanently",
  "stepType": "confirm",
  "actions": [
    { "id": "confirm-delete", "label": "Yes, Delete Permanently", "variant": "danger", "continues": true },
    { "id": "cancel", "label": "Cancel", "variant": "secondary", "continues": false }
  ],
  "metadata": {
    "affectedCount": 5,
    "operationType": "bulk-delete",
    "isDestructive": true
  }
}
\`\`\`

**Example Output:**
\`\`\`javascript
function render(data, onAction) {
  const { items, count } = data;
  const itemList = items.map(item => \`<li class="py-2 border-b">\${item.title} <span class="text-gray-500">(\${item.status})</span></li>\`).join('');
  return \`
    <div class="p-6 max-w-2xl mx-auto">
      <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <h2 class="text-xl font-bold text-red-800 mb-2">⚠️ Confirm Permanent Deletion</h2>
        <p class="text-red-700">You are about to permanently delete <strong>\${count}</strong> completed todos. This action cannot be undone.</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <h3 class="font-semibold mb-3">Items to be deleted:</h3>
        <ul class="list-none">\${itemList}</ul>
      </div>
      <div class="flex gap-3 justify-end">
        <button onclick="onAction({ actionId: 'cancel' });" class="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
        <button onclick="onAction({ actionId: 'confirm-delete' });" class="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold">Yes, Delete Permanently</button>
      </div>
    </div>
  \`;
}
\`\`\`

## Example 2: Result Step - Task Completion
\`\`\`json
{
  "dataStructure": "interface TaskResult { success: boolean; message: string; summary: { created: number; updated: number; deleted: number; }; items: Array<{ id: string; title: string; }>; }",
  "data": {
    "success": true,
    "message": "Successfully updated 12 todos with new priorities and statuses",
    "summary": {
      "created": 2,
      "updated": 8,
      "deleted": 2
    },
    "items": [
      { "id": "1", "title": "Review API documentation" },
      { "id": "2", "title": "Update user authentication" },
      { "id": "3", "title": "Fix validation errors" },
      { "id": "4", "title": "Optimize database queries" },
      { "id": "5", "title": "Add error handling" },
      { "id": "6", "title": "Refactor component structure" },
      { "id": "7", "title": "Update test coverage" },
      { "id": "8", "title": "Deploy to staging" }
    ]
  },
  "mainGoal": "Organize my workspace todos",
  "subGoal": "Bulk update todo priorities and statuses",
  "stepType": "result",
  "actions": [
    { "id": "view-details", "label": "View Details", "variant": "secondary", "continues": true },
    { "id": "done", "label": "Done", "variant": "primary", "continues": false }
  ],
  "taskCompleted": true,
  "metadata": {
    "affectedCount": 12,
    "operationType": "bulk-update"
  }
}
\`\`\`

**Example Output:**
\`\`\`javascript
function render(data, onAction) {
  const { success, message, summary, items } = data;
  const total = summary.created + summary.updated + summary.deleted;
  const itemList = items.slice(0, 5).map(item => \`<li class="py-1 text-sm">✓ \${item.title}</li>\`).join('');
  const moreCount = items.length > 5 ? items.length - 5 : 0;
  return \`
    <div class="p-6 max-w-2xl mx-auto">
      <div class="bg-green-50 border-l-4 border-green-500 p-6 mb-6 rounded">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-3xl">✓</span>
          <h2 class="text-2xl font-bold text-green-800">Task Completed Successfully!</h2>
        </div>
        <p class="text-green-700 text-lg">\${message}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h3 class="font-semibold mb-4">Summary:</h3>
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center p-3 bg-blue-50 rounded"><div class="text-2xl font-bold text-blue-600">\${summary.created}</div><div class="text-sm text-gray-600">Created</div></div>
          <div class="text-center p-3 bg-yellow-50 rounded"><div class="text-2xl font-bold text-yellow-600">\${summary.updated}</div><div class="text-sm text-gray-600">Updated</div></div>
          <div class="text-center p-3 bg-red-50 rounded"><div class="text-2xl font-bold text-red-600">\${summary.deleted}</div><div class="text-sm text-gray-600">Deleted</div></div>
        </div>
        <div class="border-t pt-4">
          <h4 class="font-medium mb-2">Updated Items:</h4>
          <ul class="list-none">\${itemList}</ul>
          \${moreCount > 0 ? \`<p class="text-sm text-gray-500 mt-2">...and \${moreCount} more</p>\` : ''}
        </div>
      </div>
      <div class="flex gap-3 justify-end">
        <button onclick="onAction({ actionId: 'view-details' });" class="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">View Details</button>
        <button onclick="onAction({ actionId: 'done' });" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Done</button>
      </div>
    </div>
  \`;
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
 * Extract TypeScript function from LLM response
 */
function extractTypeScriptFunction(response: string): string {
    // Remove markdown code blocks if present
    let code = response.trim();
  
    // Remove ```typescript or ``` markers
    code = code.replace(/^```(?:typescript|ts)?\s*/m, "");
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
    ?.map((part) => (part.text && !part.thought ? part.text : ""))
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

