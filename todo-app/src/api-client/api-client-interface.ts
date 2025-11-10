/**
 * API Client Interface for Todo Management Application
 * 
 * This is an interface-only definition with flattened input/output types.
 * All types are defined inline (no dependencies).
 * 
 * Input parameters are flattened: params, query, and body are combined into a single object.
 * Output types are flattened: response wrappers are unwrapped (e.g., Todo instead of { data: Todo }).
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Priority levels in ascending order of importance
 * @example "low" | "medium" | "high" | "urgent"
 */
type Priority = "low" | "medium" | "high" | "urgent";

/**
 * Status values as stored in the database
 * Note: "due" is never stored, only calculated on-demand
 * @example "initial" | "complete"
 */
type StoredStatus = "initial" | "complete";

/**
 * Status values as returned to clients (includes calculated "due")
 * @example "initial" | "complete" | "due"
 */
type CalculatedStatus = "initial" | "complete" | "due";

// ============================================================================
// Core Todo Model
// ============================================================================

/**
 * Todo object as returned by the API
 * 
 * @property id - Unique identifier (UUID v4)
 * @property title - Todo title (1-100 characters)
 * @property description - Optional detailed description (max 1000 characters, nullable)
 * @property status - Calculated status (can be "due" if overdue)
 * @property dueDate - Optional due date in YYYY-MM-DD format (nullable)
 * @property priority - Priority level
 * @property createdAt - Creation timestamp in ISO 8601 format (e.g., "2025-11-10T10:00:00.000Z")
 * @property modifiedAt - Last modification timestamp in ISO 8601 format
 */
type Todo = {
  id: string; // UUID v4
  title: string; // min: 1, max: 100 characters
  description: string | null; // max: 1000 characters, nullable
  status: CalculatedStatus; // "initial" | "complete" | "due"
  dueDate: string | null; // YYYY-MM-DD format, nullable
  priority: Priority; // "low" | "medium" | "high" | "urgent"
  createdAt: string; // ISO 8601 timestamp with millisecond precision
  modifiedAt: string; // ISO 8601 timestamp with millisecond precision
};

// ============================================================================
// Request Types (Flattened)
// ============================================================================

/**
 * Create Todo Request (flattened)
 * 
 * @property title - Required, 1-100 characters, non-whitespace
 * @property description - Optional, max 1000 characters
 * @property dueDate - Optional, YYYY-MM-DD format, cannot be in the past
 * @property priority - Optional, defaults to "medium"
 * 
 * @example
 * {
 *   title: "Complete project documentation",
 *   description: "Write comprehensive API documentation",
 *   dueDate: "2025-12-31",
 *   priority: "high"
 * }
 */
type CreateTodoRequest = {
  title: string; // min: 1, max: 100 characters
  description?: string | undefined; // max: 1000 characters
  dueDate?: string | undefined; // YYYY-MM-DD format, cannot be past
  priority?: Priority | undefined; // defaults to "medium"
};

/**
 * Update Todo Request (flattened with id)
 * 
 * All fields are optional except id (partial update).
 * At least one field must be provided for update.
 * 
 * @property id - Required, UUID v4
 * @property title - Optional, 1-100 characters
 * @property description - Optional, max 1000 characters, or null to clear
 * @property dueDate - Optional, YYYY-MM-DD format, or null to clear, cannot be in the past
 * @property status - Optional, "initial" or "complete" (cannot be "due")
 * @property priority - Optional
 * 
 * @example
 * {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   title: "Updated title",
 *   status: "complete",
 *   priority: "urgent"
 * }
 */
type UpdateTodoRequest = {
  id: string; // UUID v4, required
  title?: string | undefined; // min: 1, max: 100 characters
  description?: string | null | undefined; // max: 1000 characters, nullable
  dueDate?: string | null | undefined; // YYYY-MM-DD format, nullable, cannot be past
  status?: StoredStatus | undefined; // "initial" | "complete" (cannot be "due")
  priority?: Priority | undefined;
};

/**
 * List Todos Query Parameters (flattened)
 * 
 * Filter format: fieldname=comparator:value (for status, priority, title, description)
 *                or direct value (for dueDateBefore, dueDateAfter)
 * Only one filter per field is allowed (except dueDateBefore and dueDateAfter can be used together).
 * Multiple different fields can be combined with AND logic.
 * 
 * @property status - Optional, format: "equals:initial" | "equals:complete" | "equals:due" | "notEquals:initial" | "notEquals:complete" | "notEquals:due"
 * @property priority - Optional, format: "equals:low" | "equals:medium" | "equals:high" | "equals:urgent" | "notEquals:low" | "notEquals:medium" | "notEquals:high" | "notEquals:urgent"
 * @property dueDateBefore - Optional, format: "YYYY-MM-DD" (filters todos with due date before this date)
 * @property dueDateAfter - Optional, format: "YYYY-MM-DD" (filters todos with due date after this date)
 * @property title - Optional, format: "contains:text" | "notContains:text" (case-insensitive)
 * @property description - Optional, format: "contains:text" | "notContains:text" (case-insensitive)
 * 
 * @example
 * {
 *   status: "equals:initial",
 *   priority: "notEquals:low",
 *   title: "contains:meeting"
 * }
 * 
 * @example
 * {
 *   dueDateBefore: "2025-12-31",
 *   dueDateAfter: "2025-01-01",
 *   status: "notEquals:complete"
 * }
 */
type ListTodosQuery = {
  status?: string | undefined; // "equals:initial" | "equals:complete" | "equals:due" | "notEquals:initial" | "notEquals:complete" | "notEquals:due"
  priority?: string | undefined; // "equals:low" | "equals:medium" | "equals:high" | "equals:urgent" | "notEquals:low" | "notEquals:medium" | "notEquals:high" | "notEquals:urgent"
  dueDateBefore?: string | undefined; // "YYYY-MM-DD" format
  dueDateAfter?: string | undefined; // "YYYY-MM-DD" format
  title?: string | undefined; // "contains:text" | "notContains:text" (case-insensitive)
  description?: string | undefined; // "contains:text" | "notContains:text" (case-insensitive)
};

/**
 * Get Todo by ID Request (flattened)
 * 
 * @property id - Required, UUID v4
 * 
 * @example
 * {
 *   id: "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
type GetTodoByIdRequest = {
  id: string; // UUID v4, required
};

/**
 * Delete Todo Request (flattened)
 * 
 * @property id - Required, UUID v4
 * 
 * @example
 * {
 *   id: "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
type DeleteTodoRequest = {
  id: string; // UUID v4, required
};

/**
 * Bulk Update Status Request (flattened)
 * 
 * @property ids - Required, array of UUIDs, min: 1, max: 100 items
 * @property status - Required, "initial" or "complete"
 * 
 * @example
 * {
 *   ids: ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"],
 *   status: "complete"
 * }
 */
type BulkUpdateStatusRequest = {
  ids: string[]; // min: 1, max: 100 UUIDs
  status: StoredStatus; // "initial" | "complete"
};

/**
 * Bulk Delete Request (flattened)
 * 
 * @property ids - Required, array of UUIDs, min: 1, max: 100 items
 * 
 * @example
 * {
 *   ids: ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"]
 * }
 */
type BulkDeleteRequest = {
  ids: string[]; // min: 1, max: 100 UUIDs
};

// ============================================================================
// API Client Interface
// ============================================================================

/**
 * API Client Interface for Todo Management
 * 
 * All methods use flattened input/output types:
 * - Input: params, query, and body are combined into a single flat object
 * - Output: response wrappers are unwrapped (e.g., Todo instead of { data: Todo })
 */
interface IApiClient {
  /**
   * Creates a new todo
   * 
   * Corresponds to: POST /api/v1/todos
   * 
   * @param request - Create todo request (flattened)
   * @returns Todo object with generated id, createdAt, modifiedAt, and status set to "initial"
   * @throws Error with message if validation fails (400) or server error (500)
   * 
   * @example
   * const todo = await client.createTodo({
   *   title: "Complete project documentation",
   *   description: "Write comprehensive API documentation",
   *   dueDate: "2025-12-31",
   *   priority: "high"
   * });
   */
  createTodo(request: CreateTodoRequest): Promise<Todo>;

  /**
   * Lists todos with optional filtering
   * 
   * Corresponds to: GET /api/v1/todos
   * 
   * @param request - List todos query parameters (flattened, all optional)
   * @returns Array of todo objects with calculated status
   * @throws Error with message if filter validation fails (400) or server error (500)
   * 
   * @example
   * const todos = await client.listTodos({
   *   status: "equals:initial",
   *   priority: "notEquals:low",
   *   title: "contains:meeting"
   * });
   * 
   * @example
   * const allTodos = await client.listTodos({});
   */
  listTodos(request?: ListTodosQuery): Promise<Todo[]>;

  /**
   * Gets a todo by ID
   * 
   * Corresponds to: GET /api/v1/todos/:id
   * 
   * @param request - Get todo request with id (flattened)
   * @returns Todo object with calculated status
   * @throws Error with message if todo not found (404) or server error (500)
   * 
   * @example
   * const todo = await client.getTodoById({
   *   id: "550e8400-e29b-41d4-a716-446655440000"
   * });
   */
  getTodoById(request: GetTodoByIdRequest): Promise<Todo>;

  /**
   * Updates a todo (partial update)
   * 
   * Corresponds to: PATCH /api/v1/todos/:id
   * 
   * @param request - Update todo request with id and optional fields (flattened)
   * @returns Updated todo object with calculated status
   * @throws Error with message if validation fails (400), todo not found (404), invalid status transition (400), or server error (500)
   * 
   * @example
   * const updated = await client.updateTodo({
   *   id: "550e8400-e29b-41d4-a716-446655440000",
   *   title: "Updated title",
   *   status: "complete",
   *   priority: "urgent"
   * });
   */
  updateTodo(request: UpdateTodoRequest): Promise<Todo>;

  /**
   * Deletes a todo
   * 
   * Corresponds to: DELETE /api/v1/todos/:id
   * 
   * @param request - Delete todo request with id (flattened)
   * @returns void (204 No Content)
   * @throws Error with message if todo not found (404) or server error (500)
   * 
   * @example
   * await client.deleteTodo({
   *   id: "550e8400-e29b-41d4-a716-446655440000"
   * });
   */
  deleteTodo(request: DeleteTodoRequest): Promise<void>;

  /**
   * Bulk update status for multiple todos
   * 
   * Corresponds to: POST /api/v1/todos/bulk-update-status
   * 
   * @param request - Bulk update status request (flattened)
   * @returns Array of updated todo objects with calculated status
   * @throws Error with message if validation fails (400), any todo not found (404), invalid transition (400), exceeds max limit (400), or server error (500)
   * 
   * Note: Operation is atomic - all succeed or all fail (rollback on any error)
   * 
   * @example
   * const updated = await client.bulkUpdateStatus({
   *   ids: ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"],
   *   status: "complete"
   * });
   */
  bulkUpdateStatus(request: BulkUpdateStatusRequest): Promise<Todo[]>;

  /**
   * Bulk delete multiple todos
   * 
   * Corresponds to: POST /api/v1/todos/bulk-delete
   * 
   * @param request - Bulk delete request (flattened)
   * @returns void (204 No Content)
   * @throws Error with message if exceeds max limit (400), any todo not found (404), or server error (500)
   * 
   * Note: Operation is atomic - all succeed or all fail (rollback on any error)
   * 
   * @example
   * await client.bulkDelete({
   *   ids: ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"]
   * });
   */
  bulkDelete(request: BulkDeleteRequest): Promise<void>;
}

