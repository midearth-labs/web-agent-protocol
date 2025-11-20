/**
 * WAP (Web Agent Protocol) Tools Type Definitions
 * 
 * This file contains TypeScript type definitions for all tools defined in the WAP manifest.
 * Types are designed to be reusable and include OpenAPI schema details in comments.
 * 
 * @see wap.json for the source manifest
 */

// ============================================================================
// Shared Types
// ============================================================================

/**
 * Todo Priority Level
 * @format enum
 * @enum ["low", "medium", "high", "urgent"]
 */
export type TodoPriority = "low" | "medium" | "high" | "urgent";

/**
 * Todo Status
 * @format enum
 * @enum ["initial", "complete", "due"]
 * @description Status can be marked as "due" if the due date is in the past while not completed.
 *              The "due" status is calculated automatically and cannot be set directly.
 */
export type TodoStatus = "initial" | "complete" | "due";

/**
 * UUID v4 string format
 * @format uuid
 */
export type UUID = string;

/**
 * Date string in YYYY-MM-DD format
 * @format date
 */
export type DateString = string;

/**
 * ISO 8601 date-time string
 * @format date-time
 */
export type DateTimeString = string;

/**
 * Todo Entity
 * 
 * Shared type used across multiple tool responses.
 * 
 * @tags Used in: createTodo, listTodos, getTodoById, updateTodo, bulkUpdateStatus responses
 */
export type Todo = {
  /** Unique identifier (UUID v4) */
  id: UUID;
  /** Todo title - minLength: 1, maxLength: 100 */
  title: string;
  /** Detailed description of the todo - maxLength: 1000, nullable */
  description: string | null;
  /** Todo status - calculated on-demand, can be "due" for overdue todos */
  status: TodoStatus;
  /** Due date for the todo - format: YYYY-MM-DD, nullable */
  dueDate: DateString | null;
  /** Priority level */
  priority: TodoPriority;
  /** Creation timestamp (ISO 8601) */
  createdAt: DateTimeString;
  /** Last modification timestamp (ISO 8601) */
  modifiedAt: DateTimeString;
};

// ============================================================================
// Tool Input Types
// ============================================================================

export type CreateTodoInput = {
  /** The todo title - required, minLength: 1, maxLength: 100 */
  title: string;
  /** Detailed description of the todo - optional, maxLength: 1000 */
  description?: string;
  /** Due date for the todo, cannot be in the past - optional, format: YYYY-MM-DD */
  dueDate?: DateString;
  /** Todo priority level - optional, default: "medium" */
  priority?: TodoPriority;
};

export type ListTodosInput = {
  /** Filter todos by status, using equals or notEquals comparator - optional */
  status?: "equals:initial" | "equals:complete" | "equals:due" | "notEquals:initial" | "notEquals:complete" | "notEquals:due";
  /** Filter todos by priority level, using equals or notEquals comparator - optional */
  priority?: "equals:low" | "equals:medium" | "equals:high" | "equals:urgent" | "notEquals:low" | "notEquals:medium" | "notEquals:high" | "notEquals:urgent";
  /** Filter todos by due date before this date, exclusive - optional, format: YYYY-MM-DD */
  dueDateBefore?: DateString;
  /** Filter todos by due date after this date, exclusive - optional, format: YYYY-MM-DD */
  dueDateAfter?: DateString;
  /** Case-insensitive title matching - optional, use "contains:{text}" or "notContains:{text}" */
  title?: string;
  /** Case-insensitive description matching - optional, use "contains:{text}" or "notContains:{text}" */
  description?: string;
};

export type GetTodoByIdInput = {
  /** The unique identifier of the todo - required, format: uuid */
  id: UUID;
};

export type UpdateTodoInput = {
  /** The unique identifier of the todo to update - required, format: uuid */
  id: UUID;
  /** New title for the todo - optional, minLength: 1, maxLength: 100 */
  title?: string;
  /** New description for the todo, specify null to clear - optional, maxLength: 1000 */
  description?: string | null;
  /** New due date for the todo, cannot be in the past, specify null to clear - optional, format: YYYY-MM-DD */
  dueDate?: DateString | null;
  /** New status for the todo - optional, enum: ["initial", "complete"] */
  status?: "initial" | "complete";
  /** New priority level for the todo - optional */
  priority?: TodoPriority;
};

export type DeleteTodoInput = {
  /** The unique identifier of the todo to delete - required, format: uuid */
  id: UUID;
};

export type BulkUpdateStatusInput = {
  /** Array of todo IDs - required, minItems: 1, maxItems: 100, format: uuid[] */
  ids: UUID[];
  /** New status for all todos in the batch - required, enum: ["initial", "complete"] */
  status: "initial" | "complete";
};

export type BulkDeleteInput = {
  /** Array of todo IDs - required, minItems: 1, maxItems: 100, format: uuid[] */
  ids: UUID[];
};

/**
 * Render Step Type
 * @format enum
 * @enum ["preview", "confirm", "progress", "result", "error"]
 */
export type RenderStepType = "preview" | "confirm" | "progress" | "result" | "error";

/**
 * Render Action Variant
 * @format enum
 * @enum ["primary", "danger", "secondary", "success"]
 */
export type RenderActionVariant = "primary" | "danger" | "secondary" | "success";

export type RenderAction = {
  /** Action identifier - required */
  id: string;
  /** Action label text - required */
  label: string;
  /** Action button variant - optional */
  variant?: RenderActionVariant;
  /** Whether this action continues the conversation - required */
  continues: boolean;
};

export type RenderMetadata = {
  /** Number of items affected by the operation - optional */
  affectedCount?: number;
  /** Type of operation being performed - optional */
  operationType?: string;
  /** Whether the operation is destructive - optional */
  isDestructive?: boolean;
};

export type RenderInput = {
  /** TypeScript type definitions as a string - required. Includes inline descriptive comments for each property. */
  dataStructure: string;
  /** The JSON of the actual data to render - required. Structure must align with dataStructure. */
  data: Record<string, unknown>;
  /** Type of UI to generate - required, enum: ["preview", "confirm", "progress", "result", "error"] */
  stepType: RenderStepType;
  /** Array of actions available to the user - required. Each action defines a button that can be triggered. */
  actions: RenderAction[];
  /** If true, signals that the task is complete and the conversation should end - optional */
  taskCompleted?: boolean;
  /** Optional metadata about the render operation */
  metadata?: RenderMetadata;
};

export type RenderOutput = {
  /** Response type identifier - required, enum: ["userAction"] */
  type: "userAction";
  /** The ID of the action that the user triggered from the rendered UI - required */
  actionId: string;
  /** Optional payload data associated with the user action - optional */
  payload?: Record<string, unknown>;
};

// ============================================================================
// Tool Output Types
// ============================================================================

export type CreateTodoOutput = Todo;
export type ListTodosOutput = Todo[];
export type GetTodoByIdOutput = Todo;
export type UpdateTodoOutput = Todo;
export type DeleteTodoOutput = void;
export type BulkUpdateStatusOutput = Todo[];
export type BulkDeleteOutput = void;

// ============================================================================
// WAP Tools Interface
// ============================================================================

/**
 * WAP Tools
 * 
 * Type definition for all WAP tools. Each tool name maps to a function signature
 * that takes the corresponding input type and returns the corresponding output type.
 * 
 * This type can be used to type-check tool implementations and ensure consistency
 * with the WAP manifest.
 */
export type WAPTools = {
  /**
   * CreateTodo
   * 
   * @tags ["mutating", "create"]
   * @description Creates a new todo. Status defaults to "initial", priority defaults to "medium".
   */
  createTodo: (input: CreateTodoInput) => Promise<CreateTodoOutput>;
  
  /**
   * ListTodos
   * 
   * @tags ["readonly", "filterable", "list", "search"]
   * @description Lists todos with optional filtering.
   * 
   * Filter Combination: Multiple different fields can be combined with AND logic. All filters must match (AND logic).
   * 
   * Date Filtering: The dueDateBefore and dueDateAfter filters can be used together to create date range filtering.
   */
  listTodos: (input: ListTodosInput) => Promise<ListTodosOutput>;
  
  /**
   * GetTodoById
   * 
   * @tags ["readonly", "read"]
   * @description Gets a single todo by its ID.
   */
  getTodoById: (input: GetTodoByIdInput) => Promise<GetTodoByIdOutput>;
  
  /**
   * UpdateTodo
   * 
   * @tags ["mutating", "update", "patch"]
   * @description Partial update of a todo. Pass null for description or dueDate to clear those fields.
   * 
   * Status Transitions: Status transitions are validated (cannot transition from "complete" back to "initial").
   */
  updateTodo: (input: UpdateTodoInput) => Promise<UpdateTodoOutput>;
  
  /**
   * DeleteTodo
   * 
   * @tags ["mutating", "delete"]
   * @description Deletes a single todo by its ID.
   */
  deleteTodo: (input: DeleteTodoInput) => Promise<DeleteTodoOutput>;
  
  /**
   * BulkUpdateStatus
   * 
   * @tags ["mutating", "batch", "update", "patch"]
   * @description Bulk update status for multiple todos (max 100). Atomic operation - all succeed or all fail.
   */
  bulkUpdateStatus: (input: BulkUpdateStatusInput) => Promise<BulkUpdateStatusOutput>;
  
  /**
   * BulkDelete
   * 
   * @tags ["mutating", "batch", "delete"]
   * @description Bulk delete multiple todos (max 100). Atomic operation - all succeed or all fail.
   */
  bulkDelete: (input: BulkDeleteInput) => Promise<BulkDeleteOutput>;
  
  /**
   * Render
   * 
   * @description Meta-tool for generating dynamic UIs. Returns JavaScript code for render(data, onAction) function.
   */
  render: (input: RenderInput) => Promise<RenderOutput>;
};

