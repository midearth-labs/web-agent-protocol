/**
 * API Models for Todo Management Application
 * Using Zod v4 for runtime validation and type inference
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const PrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const StoredStatusSchema = z.enum(["initial", "complete"]);
export type StoredStatus = z.infer<typeof StoredStatusSchema>;

export const CalculatedStatusSchema = z.enum(["initial", "complete", "due"]);
export type CalculatedStatus = z.infer<typeof CalculatedStatusSchema>;

// ============================================================================
// Date Validation
// ============================================================================

/**
 * Validates YYYY-MM-DD format and ensures date is not in the past
 */
const FutureDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (dateStr) => {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { error: "Due date cannot be in the past" }
  );

/**
 * Validates YYYY-MM-DD format for filtering (can be any date)
 */
const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// ============================================================================
// Core Todo Model
// ============================================================================

export const TodoSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).nullable(),
  status: CalculatedStatusSchema,
  dueDate: DateStringSchema.nullable(),
  priority: PrioritySchema,
  createdAt: z.iso.datetime(),
  modifiedAt: z.iso.datetime(),
});

export type Todo = z.infer<typeof TodoSchema>;

// ============================================================================
// Request Models
// ============================================================================

/**
 * Create Todo Request
 */
export const CreateTodoRequestSchema = z.object({
  title: z.string().min(1, { error: "Title is required" }).max(100, { error: "Title must not exceed 100 characters" }),
  description: z
    .string()
    .max(1000, { error: "Description must not exceed 1000 characters" })
    .optional(),
  dueDate: FutureDateSchema.optional(),
  priority: PrioritySchema.optional(),
});

export type CreateTodoRequest = z.infer<typeof CreateTodoRequestSchema>;

/**
 * Update Todo Request (partial update)
 */
export const UpdateTodoRequestSchema = z
  .object({
    title: z.string().min(1, { error: "Title is required" }).max(100, { error: "Title must not exceed 100 characters" }).optional(),
    description: z
      .string()
      .max(1000, { error: "Description must not exceed 1000 characters" })
      .nullable()
      .optional(),
    dueDate: FutureDateSchema.nullable().optional(),
    status: StoredStatusSchema.optional(),
    priority: PrioritySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided for update",
  });

export type UpdateTodoRequest = z.infer<typeof UpdateTodoRequestSchema>;

/**
 * Bulk Update Status Request
 */
export const BulkUpdateStatusRequestSchema = z.object({
  ids: z
    .array(z.uuid({ error: "Invalid UUID format" }))
    .min(1, { error: "At least one ID is required" })
    .max(100, { error: "Maximum 100 todos can be updated at once" }),
  status: StoredStatusSchema,
});

export type BulkUpdateStatusRequest = z.infer<typeof BulkUpdateStatusRequestSchema>;

/**
 * Bulk Delete Request
 */
export const BulkDeleteRequestSchema = z.object({
  ids: z
    .array(z.uuid({ error: "Invalid UUID format" }))
    .min(1, { error: "At least one ID is required" })
    .max(100, { error: "Maximum 100 todos can be deleted at once" }),
});

export type BulkDeleteRequest = z.infer<typeof BulkDeleteRequestSchema>;

// ============================================================================
// Filter Models
// ============================================================================

/**
 * Filter format: fieldname=comparator:value
 * Only one filter per field is allowed
 */

/**
 * Status Filter Comparators
 */
export const StatusFilterComparator = z.enum(["equals", "notEquals"]);
export type StatusFilterComparator = z.infer<typeof StatusFilterComparator>;

/**
 * Priority Filter Comparators
 */
export const PriorityFilterComparator = z.enum(["equals", "notEquals"]);
export type PriorityFilterComparator = z.infer<typeof PriorityFilterComparator>;

/**
 * Due Date Filter Comparators (for internal use only)
 */
export const DueDateFilterComparator = z.enum(["before", "after"]);
export type DueDateFilterComparator = z.infer<typeof DueDateFilterComparator>;

/**
 * String Filter Comparators (for title and description)
 */
export const StringFilterComparator = z.enum(["contains", "notContains"]);
export type StringFilterComparator = z.infer<typeof StringFilterComparator>;

/**
 * Parsed Filter (internal representation)
 */
export type ParsedFilter =
  | { field: "status"; comparator: StatusFilterComparator; value: CalculatedStatus }
  | { field: "priority"; comparator: PriorityFilterComparator; value: Priority }
  | { field: "title"; comparator: StringFilterComparator; value: string }
  | { field: "description"; comparator: StringFilterComparator; value: string };

// ============================================================================
// Response Models
// ============================================================================

/**
 * Success Response Wrapper
 */
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  });

export type SuccessResponse<T> = {
  data: T;
};

/**
 * Error Detail
 */
export const ErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

/**
 * Error Response
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Single Todo Response
 */
export const TodoResponseSchema = SuccessResponseSchema(TodoSchema);
export type TodoResponse = SuccessResponse<Todo>;

/**
 * Todo List Response
 */
export const TodoListResponseSchema = SuccessResponseSchema(z.array(TodoSchema));
export type TodoListResponse = SuccessResponse<Todo[]>;

// ============================================================================
// Query Parameter Models (for GET requests)
// ============================================================================

/**
 * List Todos Query Parameters
 * Format: fieldname=comparator:value (for status, priority, title, description)
 *         or direct value (for dueDateBefore, dueDateAfter)
 * Example: ?status=equals:initial&priority=notEquals:low&title=contains:meeting
 * Example with date range: ?dueDateBefore=2025-12-31&dueDateAfter=2025-01-01
 * 
 * Note: Only one filter per field is allowed (except dueDateBefore and dueDateAfter can be used together)
 */
export const ListTodosQuerySchema = z.object({
  status: z.string().regex(/^(equals|notEquals):(initial|complete|due)$/).optional(),
  priority: z.string().regex(/^(equals|notEquals):(low|medium|high|urgent)$/).optional(),
  dueDateBefore: DateStringSchema.optional(),
  dueDateAfter: DateStringSchema.optional(),
  title: z.string().regex(/^(contains|notContains):.+$/).optional(),
  description: z.string().regex(/^(contains|notContains):.+$/).optional(),
});

export type ListTodosQuery = z.infer<typeof ListTodosQuerySchema>;

/**
 * Helper function to parse filter query parameter
 */
export const parseFilterParam = (param: string): { comparator: string; value: string } => {
  const colonIndex = param.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid filter format. Expected 'comparator:value'");
  }
  return {
    comparator: param.substring(0, colonIndex),
    value: param.substring(colonIndex + 1),
  };
};

// ============================================================================
// Path Parameter Models
// ============================================================================

export const TodoIdParamSchema = z.object({
  id: z.uuid({ error: "Invalid todo ID format" }),
});

export type TodoIdParam = z.infer<typeof TodoIdParamSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  BULK_OPERATION_FAILED: "BULK_OPERATION_FAILED",
  CONFLICT: "CONFLICT",
  FILE_LOCK_TIMEOUT: "FILE_LOCK_TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

