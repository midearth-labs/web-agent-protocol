# Interface to Manifest Conversion Plan

## Overview

This document describes the conversion process from the TypeScript API client interface (`api-client-interface.ts`) to the structured manifest format (`wap.json`).

## Conversion Strategy

### 1. Type System Mapping

#### Primitive Types
- `string` → `dataType: ["string"]`
- `number` → `dataType: ["number"]`
- `boolean` → `dataType: ["boolean"]`

#### Nullable Types
- `string | null` → `dataType: ["string"], nullable: true`
- **Important**: Do NOT include "null" in the `dataType` array. Use the `nullable` boolean flag instead.

#### Optional Types
- `string?` or `string | undefined` → `optional: true`
- Required fields → `optional: false`

#### Arrays of Primitives
- `string[]` → `dataType: ["array"], itemType: "string"`
- `number[]` → `dataType: ["array"], itemType: "number"`

#### Arrays of Objects
- `Todo[]` → Use `__root__` property with:
  ```typescript
  {
    __root__: {
      dataType: ["array"],
      nestedProperties: {
        // Todo structure here
      }
    }
  }
  ```

#### Nested Objects
- Object types like `Todo` → Use `nestedProperties` recursively:
  ```typescript
  {
    dataType: ["object"],
    nestedProperties: {
      // Object properties here
    }
  }
  ```

### 2. Tool Extraction Process

For each method in `IApiClient` interface:

1. **Extract Method Name**
   - Use the method name directly (e.g., `createTodo`, `listTodos`)

2. **Extract Description**
   - `short`: First sentence or summary from JSDoc
   - `full`: Complete JSDoc comment including:
     - HTTP method and endpoint
     - Parameter descriptions
     - Return value description
     - Error conditions
     - Important notes (batch limits, atomicity, etc.)

3. **Extract Input Type**
   - Map each request type property to `DataTypeDefinition`
   - Include all properties from the flattened request type
   - Extract descriptions from JSDoc `@property` comments
   - Extract examples from JSDoc `@example` blocks

4. **Extract Output Type**
   - For simple objects: map each property directly
   - For arrays: use `__root__` with `nestedProperties`
   - For void returns: use empty `outputType: {}`

5. **Extract Tags**
   - Parse from JSDoc `@tags` comment
   - Common tags: `["mutating", "readonly", "filterable", "batch", "create", "read", "list", "update", "delete", "patch", "search"]`

6. **Extract Examples**
   - `inputExamples`: All `@example` blocks from JSDoc
   - `outputExamples`: Constructed from example inputs + expected outputs

### 3. User Journey Extraction Process

For each user journey comment block:

1. **Extract Request**
   - From the journey title (e.g., "Journey 1: Mark all high-priority...")
   - Remove "Journey N:" prefix

2. **Extract Scenario**
   - From the `Scenario:` line in the comment

3. **Extract Approach**
   - From the `Approach:` section
   - Preserve numbered steps

4. **Extract Pseudo Code**
   - From the code block within `/* */` comments
   - Preserve comments and structure

5. **Extract Referenced Tools**
   - Parse method calls from pseudo code
   - Map to tool names (e.g., `listTodos`, `bulkUpdateStatus`)

### 4. Common Type Definitions

#### Todo Object Structure
The `Todo` type is reused across multiple tools. Define it once and reference in `nestedProperties`:

```typescript
const todoStructure = {
  id: {
    dataType: ["string"],
    optional: false,
    nullable: false,
    description: "Unique identifier (UUID v4)",
    examples: ["550e8400-e29b-41d4-a716-446655440000"]
  },
  title: {
    dataType: ["string"],
    optional: false,
    nullable: false,
    description: "Todo title (1-100 characters)",
    examples: ["Buy groceries"]
  },
  description: {
    dataType: ["string"],
    optional: false,
    nullable: true,
    description: "Optional detailed description (max 1000 characters, nullable)",
    examples: ["Write comprehensive API documentation", null]
  },
  status: {
    dataType: ["string"],
    optional: false,
    nullable: false,
    description: "Calculated status (can be \"due\" if overdue)",
    examples: ["initial", "complete", "due"]
  },
  dueDate: {
    dataType: ["string"],
    optional: false,
    nullable: true,
    description: "Optional due date in YYYY-MM-DD format (nullable)",
    examples: ["2025-12-31", null]
  },
  priority: {
    dataType: ["string"],
    optional: false,
    nullable: false,
    description: "Priority level",
    examples: ["low", "medium", "high", "urgent"]
  },
  createdAt: {
    dataType: ["string"],
    optional: false,
    nullable: false,
    description: "Creation timestamp in ISO 8601 format",
    examples: ["2025-11-10T10:00:00.000Z"]
  },
  modifiedAt: {
    dataType: ["string"],
    optional: false,
    nullable: false,
    description: "Last modification timestamp in ISO 8601 format",
    examples: ["2025-11-10T10:00:00.000Z"]
  }
};
```

### 5. Special Cases

#### Void Returns
For methods that return `void` (e.g., `deleteTodo`, `bulkDelete`):
```typescript
outputType: {}
```

#### Optional Request Parameters
For methods with optional request parameters (e.g., `listTodos(request?: ListTodosQuery)`):
- All properties in `inputType` should have `optional: true`
- Include empty object `{}` in `inputExamples`

#### Array Outputs
For methods returning arrays (e.g., `listTodos`, `bulkUpdateStatus`):
- Use `__root__` property with `dataType: ["array"]`
- Define array item structure in `nestedProperties`

### 6. Validation Rules

1. **No "null" in dataType**: Always use `nullable: true` instead
2. **Consistent Todo structure**: Reuse the same Todo definition across all tools
3. **Complete examples**: Each tool should have at least 2-3 input examples and corresponding output examples
4. **Tag consistency**: Use standard tags from the interface comment
5. **Description completeness**: Full descriptions should include all important details from JSDoc

### 7. File Structure

```
api-client/
├── api-client-interface.ts    # Source TypeScript interface
├── manifest.type.ts           # TypeScript type definitions
├── INTERFACE_TO_MANIFEST.MD   # This conversion plan
└── wap.json                   # Generated manifest JSON
```

### 8. Tools to Convert

1. `createTodo` - Creates a new todo
2. `listTodos` - Lists todos with optional filtering
3. `getTodoById` - Gets a todo by ID
4. `updateTodo` - Updates a todo (partial update)
5. `deleteTodo` - Deletes a todo
6. `bulkUpdateStatus` - Bulk update status for multiple todos
7. `bulkDelete` - Bulk delete multiple todos

### 9. User Journeys to Convert

1. Mark all high-priority incomplete todos from this month as complete
2. Delete all completed todos from last quarter
3. Upgrade priority of all low-priority incomplete todos to medium
4. Create a task reminder next week
5. Create product launch checklist todos
6. Find and review high-priority incomplete todos
7. Delete completed todos from last month
8. Update a specific todo's status and priority
9. Find todos due today or overdue
10. Bulk mark project-related todos as complete

## Conversion Checklist

- [x] Define TypeScript types (`manifest.type.ts`)
- [x] Create conversion plan document
- [ ] Generate complete manifest JSON (`wap.json`)
- [ ] Validate JSON against TypeScript types
- [ ] Verify all tools are included
- [ ] Verify all user journeys are included
- [ ] Check for consistency in Todo structure
- [ ] Validate examples are complete and accurate

