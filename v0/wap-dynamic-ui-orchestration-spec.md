# WAP Dynamic UI Orchestration - Technical Specification

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** November 10, 2025  
**Owner:** MidEarth Labs

---

## Executive Summary

This specification defines how WAP (Web Agent Protocol) orchestrates multi-step workflows with dynamic UI generation in Orchestrator Mode. The system uses Large Language Models with function calling capabilities to:

1. Decompose natural language requests into multi-step execution plans
2. Auto-discover operation dependencies using semantic tags
3. Generate context-aware UIs for previews, confirmations, and results
4. Execute workflows entirely in the browser without server-side orchestration

### Key Innovation

Rather than hardcoding UI templates or orchestration logic, the system uses **LLM-generated render functions** that dynamically create appropriate interfaces based on:
- Available data structures
- User's goal context
- Current substep requirements
- Operation semantics (tags)

This enables sites to expose functionality via manifests while the LLM handles the complexity of creating safe, intuitive multi-step workflows.

---

## Problem Statement

### Current Limitations

WAP manifests expose API operations as tools, but critical questions remain:

1. **Preview-Execute Linkage**: How does the agent know to preview data before destructive operations?
2. **Confirmation UIs**: How to generate appropriate confirmation interfaces without hardcoded templates?
3. **Dynamic Rendering**: How to render substep results that match the user's intent and context?
4. **Safety**: How to prevent accidental bulk deletions or updates?
5. **Flexibility**: How to support diverse UI needs without requiring sites to build custom render endpoints?

### Design Goals

- **Zero Configuration**: Sites define operations, system auto-discovers workflows
- **Safety by Default**: Destructive operations automatically get previews and confirmations
- **Context-Aware UIs**: Generated interfaces match the specific user goal
- **Browser-Native**: All execution happens client-side using Gemini function calling
- **Progressive Enhancement**: Works with any LLM that supports function calling

---

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Browser Context                    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐      ┌─────────────────────┐     │
│  │  User Input  │─────>│  WAP Orchestrator   │     │
│  └──────────────┘      └─────────────────────┘     │
│                                │                     │
│                                v                     │
│                    ┌───────────────────────┐        │
│                    │  Gemini Function Call │        │
│                    │  (Thinking + Tools)   │        │
│                    └───────────────────────┘        │
│                                │                     │
│                    ┌───────────┴────────────┐       │
│                    │                        │       │
│                    v                        v       │
│         ┌──────────────────┐    ┌─────────────┐   │
│         │  Site API Tools  │    │ Render Tool │   │
│         │  (from manifest) │    │ (LLM-based) │   │
│         └──────────────────┘    └─────────────┘   │
│                    │                        │       │
│                    v                        v       │
│         ┌──────────────────┐    ┌─────────────┐   │
│         │  fetch() calls   │    │  Generated  │   │
│         │  (same-origin)   │    │  HTML/JS    │   │
│         └──────────────────┘    └─────────────┘   │
│                    │                        │       │
│                    v                        v       │
│                ┌──────────────────────────────┐    │
│                │      Dynamic UI Layer        │    │
│                │  (renders substeps + results)│    │
│                └──────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Execution Flow

1. **User Input** → Natural language request
2. **Orchestrator** → Sends to Gemini with manifest tools + render tool
3. **Gemini Planning** → Uses thinking to analyze request and plan steps
4. **Tool Calls** → Executes API operations and render calls in parallel where possible
5. **UI Generation** → Render tool produces JavaScript functions
6. **Display** → Execute render functions with real data
7. **User Actions** → Confirmations trigger continuation or cancellation
8. **Result** → Final render shows success/failure summary

---

## Tag-Based Operation Discovery

### Tag Vocabulary

Operations are annotated with semantic tags that enable auto-discovery of workflows:

#### Mutation Tags
- `mutating` - Modifies server state
- `readonly` - Safe, no side effects
- `idempotent` - Safe to retry

#### Operation Type Tags
- `create` - Creates new resources
- `read` - Retrieves data
- `update` - Modifies existing resources
- `delete` - Removes resources
- `list` - Returns collections
- `search` - Finds resources by criteria
- `patch` - Partial update

#### Batch Tags
- `batch` - Operates on multiple items
- `filterable` - Accepts filter parameters
- `sortable` - Supports sorting
- `paginated` - Returns paged results

#### Behavior Tags
- `rate-limited` - Subject to rate limits
- `not-rate-limited` - No rate limiting
- `cached` - Results can be cached
- `async` - Long-running operation
- `compensating` - Has undo/rollback

#### Confirmation Tags
- `confirmation-required` - Always needs user approval
- `preview-recommended` - Should show preview

### Discovery Rules

The LLM uses tags to infer execution patterns:

```typescript
// Pseudocode for LLM reasoning

if (operation.tags.includes("mutating") && operation.tags.includes("batch")) {
  // Need preview before bulk mutation
  const previewOp = findOperation({
    tags: ["readonly", "filterable"],
    entity: operation.entity
  });
  
  plan = [
    { step: "preview", tool: previewOp },
    { step: "confirm", type: "user_input" },
    { step: "execute", tool: operation }
  ];
}

if (operation.tags.includes("delete")) {
  // Always confirm deletions
  requireConfirmation = true;
}

if (operation.tags.includes("rate-limited") && batchSize > maxBatch) {
  // Split into chunks
  plan = chunkedExecution(operation, batchSize);
}
```

### Manifest Tag Section

```json
{
  "functions": [
    {
      "name": "listItems",
      "tags": ["readonly", "filterable", "list", "search", "cached"],
      "entity": "items",
      "...": "..."
    },
    {
      "name": "bulkDelete",
      "tags": ["mutating", "batch", "delete", "rate-limited"],
      "entity": "items",
      "requires_preview": "listItems",
      "max_batch_size": 100,
      "...": "..."
    }
  ],
  "tag_relationships": {
    "preview_for": {
      "bulkDelete": "listItems",
      "bulkUpdate": "listItems"
    },
    "entity_groups": {
      "items": ["listItems", "getItem", "createItem", "updateItem", "deleteItem", "bulkDelete"]
    }
  }
}
```

---

## Render Tool Specification

### Purpose

The `render` tool is a special meta-tool that generates JavaScript render functions. Unlike regular API tools that call server endpoints, `render` is implemented by a secondary LLM call that produces UI code.

### Tool Definition

```json
{
  "name": "render",
  "description": "Generate dynamic UI render function for displaying substep results. Returns JavaScript function that creates HTML given data structures. Use for previews, confirmations, progress, and results.",
  "parameters": {
    "type": "object",
    "properties": {
      "dataStructures": {
        "type": "object",
        "description": "Named TypeScript type definitions as strings. Keys are variable names, values are type definitions.",
        "additionalProperties": {
          "type": "string"
        },
        "example": {
          "items": "Array<{id: string, name: string, status: string}>",
          "summary": "{count: number, operation: string}"
        }
      },
      "mainGoal": {
        "type": "string",
        "description": "The user's original natural language request",
        "example": "Delete all items that match criteria X"
      },
      "subGoal": {
        "type": "string",
        "description": "What this specific substep is trying to achieve",
        "example": "Show user which items will be deleted and get confirmation"
      },
      "stepType": {
        "type": "string",
        "enum": ["preview", "confirm", "progress", "result", "error"],
        "description": "Type of UI to generate: preview (show data), confirm (yes/no decision), progress (ongoing operation), result (completion summary), error (failure state)"
      },
      "actions": {
        "type": "array",
        "description": "Available user actions for this substep",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "description": "Unique action identifier"
            },
            "label": {
              "type": "string",
              "description": "Button text shown to user"
            },
            "variant": {
              "type": "string",
              "enum": ["primary", "danger", "secondary", "success"],
              "description": "Visual style hint"
            },
            "continues": {
              "type": "boolean",
              "description": "If true, clicking continues orchestration. If false, cancels."
            }
          },
          "required": ["id", "label", "continues"]
        }
      },
      "metadata": {
        "type": "object",
        "description": "Optional additional context",
        "properties": {
          "affectedCount": {
            "type": "number",
            "description": "Number of items affected by operation"
          },
          "operationType": {
            "type": "string",
            "description": "Type of operation (delete, update, create)"
          },
          "isDestructive": {
            "type": "boolean",
            "description": "Whether operation is destructive"
          }
        }
      }
    },
    "required": ["dataStructures", "mainGoal", "subGoal", "stepType", "actions"]
  }
}
```

### Render Function Contract

The generated JavaScript function must conform to this interface:

```typescript
/**
 * Generated render function signature
 * 
 * @param data - Object with keys matching dataStructures parameter names
 * @param onAction - Callback invoked when user clicks action button
 * @returns HTML string with inline event handlers
 */
type RenderFunction = (
  data: Record<string, any>,
  onAction: (actionId: string, payload?: Record<string, any>) => void
) => string;
```

### LLM Prompt for Render Generation

When the orchestrator LLM calls the `render` tool, a secondary LLM call uses this prompt:

```markdown
You are a UI code generator. Generate a JavaScript function that renders an interactive HTML interface.

# Context

Main Goal: {mainGoal}
Sub-Goal: {subGoal}
Step Type: {stepType}

# Data Structures

The function will receive data with these types:
{dataStructures}

# Available Actions

The user can take these actions:
{actions}

# Requirements

Generate a JavaScript function with this exact signature:

```javascript
function render(data, onAction) {
  // Your implementation here, these could include transforms, loops, etc.
  return `<html string>`;
}
```

**Technical Requirements:**
- Return a single HTML string
- Use Tailwind CSS classes for styling
- Make the UI responsive (mobile-friendly)
- Use semantic HTML5 elements
- Ensure accessibility (ARIA labels, keyboard navigation)
- Handle empty and null data gracefully
- Do not import anything, use pure and native javascript objects and syntax.
- Do not access any global objects like window in the function logic. You can of course include global objects in generated output e.g. `<button onclick="window.alert('foo-bar');" />`
- Use SVG for Charts.
- For user downloads e.g. "Find orders from last month and convert to CSV or JSON for my download": Use Blob Data URL and offer the user a download link with an appropriate name.
  - Data Transformation logic can be generated and executed in-code in the client-side.

**Event Handling:**
- Call `onAction(actionId, payload)` when user clicks action buttons
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
```javascript
function render(data, onAction) {
  function helperFunctionA() {} // Reusable logic
  function helperFunctionB() {} // Reusable logic
  const {items} = data;
  // Your implementation here, these could include transforms, loops, etc.
  return `<div class="p-4">...</div>`;
}
```
```

### Render Tool Implementation

```typescript
async function executeRenderTool(params: RenderToolParams): Promise<string> {
  // Secondary LLM call to generate render function
  const prompt = buildRenderPrompt(params);
  
  const response = await gemini.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3, // Lower temperature for consistent code generation
      maxOutputTokens: 2048
    }
  });
  
  const generatedCode = response.text();
  
  // Extract function from response (remove markdown if present)
  const functionCode = extractJavaScriptFunction(generatedCode);
  
  // Security: Validate generated code
  validateRenderFunction(functionCode);
  
  return functionCode;
}

function validateRenderFunction(code: string): void {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /eval\(/,
    /Function\(/,
    /new\s+Function/,
    /<script/i,
    /document\.write/,
    /innerHTML\s*=/
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(`Generated render function contains unsafe pattern: ${pattern}`);
    }
  }
  
  // Ensure function signature is correct
  if (!code.includes('function render(data, onAction)')) {
    throw new Error('Generated function does not match required signature');
  }
}
```

---

## Gemini Function Calling Integration

### Configuration

```typescript
const geminiConfig = {
  model: "gemini-2.0-flash-thinking-exp-01-21", // Model with thinking capability
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8192,
    thinkingConfig: {
      mode: "explicit" // Enable thinking tokens for reasoning
    }
  },
  tools: [
    {
      functionDeclarations: [
        ...manifestTools, // Site API operations from wap.json
        renderToolDefinition // The render meta-tool
      ]
    }
  ],
  toolConfig: {
    functionCallingConfig: {
      mode: "AUTO", // Let model decide when to call functions
      allowedFunctionNames: undefined // Allow all declared functions
    }
  }
};
```

### System Instruction

```markdown
You are a WAP (Web Agent Protocol) orchestrator running in a browser. Your job is to 
execute natural language requests by calling available tools.

# Available Tools

You have access to:
1. Site API operations (defined in manifest) - for data operations
2. render tool - for generating dynamic UIs

# Operation Discovery

Site operations have semantic tags that indicate their purpose:
- readonly, mutating: whether operation modifies state
- batch, filterable, list: operation capabilities
- create, read, update, delete: CRUD classification
- rate-limited, cached: performance characteristics

Use tags to discover operation relationships. For example:
- Operations tagged [mutating, batch, delete] should be preceded by [readonly, filterable] 
  operations for preview
- Operations tagged [delete] always require user confirmation
- Operations tagged [rate-limited] with batch size > max need chunking

# Execution Patterns

For destructive or batch operations, follow this pattern:
1. PREVIEW: Call readonly operation to show what will be affected
2. RENDER: Generate UI to display preview and get confirmation
3. CONFIRM: Wait for user action
4. EXECUTE: If confirmed, perform the mutating operation
5. RENDER: Generate UI to show results

# Thinking Process

Use explicit thinking to:
- Analyze user request and identify required operations
- Check operation tags to determine if preview/confirmation needed
- Plan multi-step execution sequence
- Calculate dates/times if needed
- Determine appropriate UI for each substep

# Parallel Execution

When possible, call multiple tools in parallel:
- Multiple readonly operations can run simultaneously
- Render calls can happen in parallel with data fetching
- But: never parallelize operations that depend on each other's results

# Error Handling

If an operation fails:
1. Use render tool to generate error UI
2. Explain what went wrong
3. Suggest corrective actions
4. Don't retry without user confirmation

# Important

- Always use render tool for UI generation (don't return raw HTML)
- Check operation tags before planning execution
- Respect max_batch_size limits
- Get confirmation before destructive operations
- Use thinking to show your reasoning
```

### Execution Loop

```typescript
async function orchestrate(userInput: string, manifest: WAPManifest) {
  const tools = buildToolsFromManifest(manifest);
  const conversation: GeminiMessage[] = [];
  
  // Initial user message
  conversation.push({
    role: "user",
    parts: [{ text: userInput }]
  });
  
  let continueLoop = true;
  
  while (continueLoop) {
    const response = await gemini.generateContent({
      contents: conversation,
      tools: [{ functionDeclarations: tools }],
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: geminiConfig.generationConfig
    });
    
    const candidate = response.candidates[0];
    
    // Extract thinking (if present)
    const thinking = extractThinking(candidate);
    if (thinking) {
      displayThinking(thinking);
    }
    
    // Check for function calls
    const functionCalls = candidate.content.parts.filter(
      p => p.functionCall
    );
    
    if (functionCalls.length === 0) {
      // No more function calls, show final response
      const text = candidate.content.parts.find(p => p.text)?.text;
      displayFinalResponse(text);
      continueLoop = false;
      break;
    }
    
    // Execute function calls (in parallel where possible)
    const functionResponses = await executeToolCalls(functionCalls, manifest);
    
    // Check for render tool calls
    for (const fc of functionCalls) {
      if (fc.functionCall.name === "render") {
        const renderCode = functionResponses.find(
          r => r.name === fc.functionCall.name
        ).response;
        
        // Execute render function with real data
        const renderFn = new Function('data', 'onAction', 
          renderCode + '; return render(data, onAction);'
        );
        
        // Get data from previous tool call results
        const renderData = extractRenderData(fc.functionCall.args, functionResponses);
        
        // Display UI
        const html = renderFn(renderData, (actionId) => {
          handleUserAction(actionId, conversation);
        });
        
        displayUI(html);
        
        // If action requires user input, wait for it
        if (requiresUserAction(fc.functionCall.args)) {
          await waitForUserAction();
        }
      }
    }
    
    // Add function responses to conversation
    conversation.push({
      role: "model",
      parts: candidate.content.parts
    });
    
    conversation.push({
      role: "user",
      parts: functionResponses.map(fr => ({
        functionResponse: {
          name: fr.name,
          response: fr.response
        }
      }))
    });
  }
}

async function executeToolCalls(
  functionCalls: FunctionCall[], 
  manifest: WAPManifest
): Promise<FunctionResponse[]> {
  // Separate render calls from API calls
  const renderCalls = functionCalls.filter(fc => fc.functionCall.name === "render");
  const apiCalls = functionCalls.filter(fc => fc.functionCall.name !== "render");
  
  // Execute in parallel where possible
  const results = await Promise.all([
    ...apiCalls.map(fc => executeSiteAPI(fc, manifest)),
    ...renderCalls.map(fc => executeRenderTool(fc.functionCall.args))
  ]);
  
  return results;
}

async function executeSiteAPI(
  fc: FunctionCall, 
  manifest: WAPManifest
): Promise<FunctionResponse> {
  const functionDef = manifest.functions.find(f => f.name === fc.functionCall.name);
  
  if (!functionDef) {
    throw new Error(`Function ${fc.functionCall.name} not found in manifest`);
  }
  
  // Build fetch request from function definition
  const url = buildURL(functionDef.endpoint, fc.functionCall.args);
  const options = buildFetchOptions(functionDef, fc.functionCall.args);
  
  // Execute same-origin fetch
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    name: fc.functionCall.name,
    response: data
  };
}
```

### Parallel Tool Calling Strategy

Gemini supports parallel function calls. The orchestrator should maximize parallelism:

**Parallelizable:**
- Multiple readonly operations
- Render calls that don't depend on API results
- Independent API calls on different resources

**Must be Sequential:**
- Preview → Confirm → Execute chains
- Operations where one depends on another's output
- Render calls that need API data

```typescript
// Example parallel execution
const responses = await gemini.generateContent({
  contents: conversation,
  tools: tools
});

// Gemini may return multiple function calls in one turn:
// [
//   { functionCall: { name: "listItems", args: {...} } },
//   { functionCall: { name: "getSummary", args: {...} } }
// ]

// Execute both in parallel
await Promise.all([
  executeSiteAPI(functionCalls[0]),
  executeSiteAPI(functionCalls[1])
]);
```

---

## Multi-Step Workflow Examples

### Example 1: Simple Query (No Preview Needed)

**User:** "Show me all high priority items"

**Execution:**

```
Turn 1: Model thinks and calls listItems
  Thinking: "User wants to see items filtered by priority. This is a readonly 
             operation tagged [readonly, filterable, list]. No preview needed."
  
  Tool Call: listItems({priority: "equals:high"})
  
Turn 2: Model receives data and calls render
  Tool Call: render({
    dataStructures: {items: "Array<{id: string, title: string, priority: string}>"},
    mainGoal: "Show me all high priority items",
    subGoal: "Display high priority items in a readable format",
    stepType: "result",
    actions: [{id: "done", label: "Done", variant: "primary", continues: false}]
  })
  
Turn 3: Model responds with completion
  Text: "Found 12 high priority items"
```

### Example 2: Bulk Deletion (Preview + Confirm)

**User:** "Delete all completed items from last month"

**Execution:**

```
Turn 1: Model thinks and plans multi-step workflow
  Thinking: "User wants to delete items (destructive operation). 
             bulkDelete is tagged [mutating, batch, delete] so needs preview.
             listItems is tagged [readonly, filterable] and operates on same entity.
             Plan: preview → confirm → execute"
  
  Tool Call: listItems({
    status: "equals:complete",
    dueDateAfter: "2024-10-01",
    dueDateBefore: "2024-10-31"
  })
  
Turn 2: Model receives preview data and generates confirmation UI
  Tool Calls (parallel):
    - render({
        dataStructures: {items: "Array<{id: string, title: string}>"},
        mainGoal: "Delete all completed items from last month",
        subGoal: "Show user which items will be deleted and get confirmation",
        stepType: "preview",
        actions: [
          {id: "proceed", label: "Delete 23 items", variant: "danger", continues: true},
          {id: "cancel", label: "Cancel", variant: "secondary", continues: false}
        ],
        metadata: {affectedCount: 23, isDestructive: true}
      })
  
  [UI displays, user clicks "Delete 23 items"]
  
Turn 3: Model executes deletion
  Tool Call: bulkDelete({ids: ["id1", "id2", ..., "id23"]})
  
Turn 4: Model generates success UI
  Tool Call: render({
    dataStructures: {summary: "{deletedCount: number}"},
    mainGoal: "Delete all completed items from last month",
    subGoal: "Show deletion success summary",
    stepType: "result",
    actions: [{id: "done", label: "Done", variant: "success", continues: false}]
  })
  
Turn 5: Model responds with completion
  Text: "Successfully deleted 23 completed items from October 2024"
```

### Example 3: Batch Operation with Chunking

**User:** "Mark all incomplete items as complete"

**Execution:**

```
Turn 1: Model analyzes and discovers need for chunking
  Thinking: "User wants bulk status update. bulkUpdateStatus is tagged 
             [mutating, batch, rate-limited] with max_batch_size: 100.
             Need to: preview → confirm → chunk if needed → execute"
  
  Tool Call: listItems({status: "notEquals:complete"})
  
Turn 2: Model sees 247 items and plans chunking
  Thinking: "Found 247 items but max_batch_size is 100. 
             Need 3 batches: 100 + 100 + 47"
  
  Tool Call: render({
    dataStructures: {items: "Array<{id: string, title: string}>"},
    mainGoal: "Mark all incomplete items as complete",
    subGoal: "Preview items and confirm batch operation",
    stepType: "preview",
    actions: [
      {id: "proceed", label: "Update 247 items", variant: "primary", continues: true},
      {id: "cancel", label: "Cancel", variant: "secondary", continues: false}
    ],
    metadata: {affectedCount: 247, operationType: "update"}
  })
  
  [User confirms]
  
Turn 3: Model executes first batch
  Tool Calls (parallel):
    - bulkUpdateStatus({ids: [first 100 ids], status: "complete"})
    - render({
        dataStructures: {progress: "{completed: number, total: number}"},
        mainGoal: "Mark all incomplete items as complete",
        subGoal: "Show batch progress",
        stepType: "progress",
        actions: []
      })
  
Turn 4: Model executes second batch
  Tool Call: bulkUpdateStatus({ids: [next 100 ids], status: "complete"})
  
Turn 5: Model executes final batch
  Tool Call: bulkUpdateStatus({ids: [remaining 47 ids], status: "complete"})
  
Turn 6: Model generates completion UI
  Tool Call: render({
    dataStructures: {summary: "{totalUpdated: number, batches: number}"},
    mainGoal: "Mark all incomplete items as complete",
    subGoal: "Show final success summary",
    stepType: "result",
    actions: [{id: "done", label: "Done", variant: "success", continues: false}]
  })
  
Turn 7: Model responds
  Text: "Successfully updated 247 items in 3 batches"
```

---

## Security Considerations

### Code Generation Safety

**Render Function Validation:**
- Scan for dangerous patterns (eval, Function constructor, innerHTML)
- Enforce function signature contract
- Limit output size (max 50KB HTML)
- Sanitize any user-provided data used in templates

### Execution Sandbox

**Browser Context Isolation:**
- Render functions execute in same origin as site
- No access to sensitive APIs (localStorage writes from untrusted code)
- Event handlers use constrained callback interface
- No global scope pollution

### Confirmation Requirements

**Mandatory Confirmations:**
- All operations tagged `delete`
- Batch operations affecting > 10 items
- Operations tagged `confirmation-required`
- Any operation user marks as "always confirm"

### Rate Limiting

**Client-Side Enforcement:**
- Respect `rate-limited` tags
- Implement exponential backoff on failures
- Show progress for slow operations
- Allow user to cancel long-running workflows

---

## Performance Optimization

### Caching Strategy

**Manifest Caching:**
- Cache manifest for duration specified in Cache-Control headers
- Re-fetch on 304 Not Modified
- Invalidate on version change

**Render Function Caching:**
- Cache generated render functions by input hash
- Reuse for similar substeps
- Clear cache on manifest update

### Parallel Execution

**Maximize Concurrency:**
- Execute independent API calls in parallel
- Generate multiple render functions simultaneously
- Prefetch likely next steps

### Thinking Token Optimization

**Gemini Thinking Config:**
- Use explicit thinking mode for complex workflows
- Thinking tokens not counted against output quota
- Improves plan quality for multi-step operations

---

## Error Handling

### Operation Failures

```typescript
try {
  const result = await executeSiteAPI(functionCall);
} catch (error) {
  // Generate error UI
  await generateErrorUI({
    error: error.message,
    operation: functionCall.name,
    suggestedActions: ["retry", "cancel"]
  });
}
```

### Render Generation Failures

```typescript
try {
  const renderCode = await executeRenderTool(params);
  validateRenderFunction(renderCode);
} catch (error) {
  // Fallback to simple template
  return generateFallbackUI(params);
}
```

### User Cancellation

```typescript
function handleUserAction(actionId: string) {
  if (actionId === "cancel") {
    // Stop orchestration
    cancelOrchestration();
    displayMessage("Operation cancelled");
  } else {
    // Continue with next step
    resumeOrchestration(actionId);
  }
}
```

---

## Testing Strategy

### Unit Tests

**Tag Discovery:**
```typescript
describe('Tag-based discovery', () => {
  test('discovers preview requirement for batch delete', () => {
    const operation = {tags: ['mutating', 'batch', 'delete']};
    expect(requiresPreview(operation)).toBe(true);
  });
});
```

**Render Validation:**
```typescript
describe('Render function validation', () => {
  test('rejects functions with eval', () => {
    const code = 'function render() { eval("alert(1)"); }';
    expect(() => validateRenderFunction(code)).toThrow();
  });
});
```

### Integration Tests

**End-to-End Workflows:**
- Test complete preview → confirm → execute flows
- Verify render functions produce valid HTML
- Check parallel execution correctness
- Validate user action handling

### Security Tests

**Code Generation Safety:**
- Fuzz render tool with malicious inputs
- Attempt XSS through data injection
- Test sandbox escape attempts
- Verify CSP compliance

### Performance Tests

**Benchmarks:**
- Manifest load time < 100ms
- Render generation < 500ms
- Tool call execution < 2s
- UI render < 100ms

---

## Monitoring & Analytics

### Key Metrics

**Orchestration Performance:**
- Average turns per request
- Tool call parallelization rate
- Render cache hit rate
- End-to-end latency

**User Behavior:**
- Confirmation acceptance rate
- Cancellation frequency
- Most common workflows
- Error encounter rate

**Code Generation Quality:**
- Render function validation failures
- Fallback UI usage rate
- User-reported UI issues
- Accessibility violations

### Logging

**Structured Logs:**
```typescript
{
  timestamp: "2025-11-10T10:30:00Z",
  event: "orchestration_complete",
  user_input: "Delete all completed items",
  turns: 5,
  tool_calls: ["listItems", "render", "bulkDelete", "render"],
  duration_ms: 2341,
  items_affected: 23,
  user_action: "confirmed"
}
```

---

## Open Questions

1. **Model Selection**: Should sites be able to specify preferred LLM providers in manifest?
2. **Render Caching**: What's optimal cache size and eviction strategy?
3. **Accessibility**: Should render tool explicitly generate ARIA attributes?
4. **Internationalization**: How to handle multi-language UI generation?
5. **Fallback UIs**: What's the minimal acceptable fallback for render failures?
6. **Rate Limits**: Should orchestrator implement global rate limiting across all sites?

---

## Success Metrics

### Phase 1 (MVP)
- Execute 10 different bulk operations with previews
- Generate valid UIs for all step types
- Zero security vulnerabilities
- 100% test coverage for core logic

### Phase 2 (Production)
- 95% render generation success rate
- < 500ms average render generation time
- < 2s average workflow completion
- 90% user satisfaction with generated UIs

### Phase 3 (Scale)
- Support 1000+ operations per site
- Handle workflows with 10+ steps
- 99.9% uptime for orchestration
- Sub-second response for simple queries

---

## Appendices

### A. Complete Render Tool JSON Schema

```json
{
  "name": "render",
  "description": "Generate dynamic UI render function for displaying substep results",
  "parameters": {
    "type": "object",
    "properties": {
      "dataStructures": {
        "type": "object",
        "description": "Named TypeScript types",
        "additionalProperties": {"type": "string"}
      },
      "mainGoal": {"type": "string"},
      "subGoal": {"type": "string"},
      "stepType": {
        "type": "string",
        "enum": ["preview", "confirm", "progress", "result", "error"]
      },
      "actions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {"type": "string"},
            "label": {"type": "string"},
            "variant": {
              "type": "string",
              "enum": ["primary", "danger", "secondary", "success"]
            },
            "continues": {"type": "boolean"}
          },
          "required": ["id", "label", "continues"]
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "affectedCount": {"type": "number"},
          "operationType": {"type": "string"},
          "isDestructive": {"type": "boolean"}
        }
      }
    },
    "required": ["dataStructures", "mainGoal", "subGoal", "stepType", "actions"]
  }
}
```

### B. Tag Reference Table

| Tag | Category | Meaning | Discovery Impact |
|-----|----------|---------|------------------|
| `mutating` | Mutation | Modifies state | Requires preview if batch |
| `readonly` | Mutation | No side effects | Can prefetch/parallelize |
| `batch` | Scope | Multiple items | Needs chunking if rate-limited |
| `delete` | Type | Removes resources | Always confirm |
| `filterable` | Capability | Accepts filters | Can be used for preview |
| `rate-limited` | Behavior | Has rate limits | Implement backoff |
| `confirmation-required` | Safety | Always confirm | Skip auto-confirmation |

### C. Gemini Configuration Reference

```typescript
const optimalConfig = {
  model: "gemini-2.0-flash-thinking-exp-01-21",
  generationConfig: {
    temperature: 0.7, // Balance creativity and consistency
    maxOutputTokens: 8192,
    thinkingConfig: {
      mode: "explicit" // Enable thinking for planning
    }
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE"
    }
  ],
  toolConfig: {
    functionCallingConfig: {
      mode: "AUTO"
    }
  }
};
```

---

## Contact & Resources

**Project Lead:** MidEarth Labs  
**Repository:** https://github.com/midearth-labs/wap-dynamic-orchestration  
**Documentation:** https://wap.dev/orchestration  
**Gemini Docs:** https://ai.google.dev/gemini-api/docs/function-calling  

---

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**Status:** Ready for implementation

---

## Next Steps

1. Review and approve specification
2. Set up Gemini API integration
3. Implement tag discovery logic
4. Build render tool with secondary LLM
5. Create reference implementation
6. Test with complex workflows
7. Gather user feedback
8. Iterate on render quality
