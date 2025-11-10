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
    { message: "Due date cannot be in the past" }
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
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).nullable(),
  status: CalculatedStatusSchema,
  dueDate: DateStringSchema.nullable(),
  priority: PrioritySchema,
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
});

export type Todo = z.infer<typeof TodoSchema>;

// ============================================================================
// Request Models
// ============================================================================

/**
 * Create Todo Request
 */
export const CreateTodoRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must not exceed 100 characters"),
  description: z
    .string()
    .max(1000, "Description must not exceed 1000 characters")
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
    title: z.string().min(1, "Title is required").max(100, "Title must not exceed 100 characters").optional(),
    description: z
      .string()
      .max(1000, "Description must not exceed 1000 characters")
      .nullable()
      .optional(),
    dueDate: FutureDateSchema.nullable().optional(),
    status: StoredStatusSchema.optional(),
    priority: PrioritySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateTodoRequest = z.infer<typeof UpdateTodoRequestSchema>;

/**
 * Bulk Update Status Request
 */
export const BulkUpdateStatusRequestSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid UUID format"))
    .min(1, "At least one ID is required")
    .max(100, "Maximum 100 todos can be updated at once"),
  status: StoredStatusSchema,
});

export type BulkUpdateStatusRequest = z.infer<typeof BulkUpdateStatusRequestSchema>;

/**
 * Bulk Delete Request
 */
export const BulkDeleteRequestSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid UUID format"))
    .min(1, "At least one ID is required")
    .max(100, "Maximum 100 todos can be deleted at once"),
});

export type BulkDeleteRequest = z.infer<typeof BulkDeleteRequestSchema>;

// ============================================================================
// Filter Models
// ============================================================================

/**
 * Status Filter
 */
export const StatusFilterSchema = z.object({
  equals: CalculatedStatusSchema.optional(),
  notEquals: CalculatedStatusSchema.optional(),
});

export type StatusFilter = z.infer<typeof StatusFilterSchema>;

/**
 * Priority Filter
 */
export const PriorityFilterSchema = z.object({
  equals: PrioritySchema.optional(),
  notEquals: PrioritySchema.optional(),
});

export type PriorityFilter = z.infer<typeof PriorityFilterSchema>;

/**
 * Due Date Filter
 */
export const DueDateFilterSchema = z.object({
  before: DateStringSchema.optional(),
  after: DateStringSchema.optional(),
  notBefore: DateStringSchema.optional(),
  notAfter: DateStringSchema.optional(),
});

export type DueDateFilter = z.infer<typeof DueDateFilterSchema>;

/**
 * Title Filter
 */
export const TitleFilterSchema = z.object({
  contains: z.string().optional(),
  notContains: z.string().optional(),
});

export type TitleFilter = z.infer<typeof TitleFilterSchema>;

/**
 * Description Filter
 */
export const DescriptionFilterSchema = z.object({
  contains: z.string().optional(),
  notContains: z.string().optional(),
});

export type DescriptionFilter = z.infer<typeof DescriptionFilterSchema>;

/**
 * Complete Filter Model for List Todos
 */
export const TodoFiltersSchema = z.object({
  status: StatusFilterSchema.optional(),
  priority: PriorityFilterSchema.optional(),
  dueDate: DueDateFilterSchema.optional(),
  title: TitleFilterSchema.optional(),
  description: DescriptionFilterSchema.optional(),
});

export type TodoFilters = z.infer<typeof TodoFiltersSchema>;

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
 * Note: In actual REST implementation, these would be flattened in query string
 * Example: ?status.equals=initial&priority.notEquals=low
 */
export const ListTodosQuerySchema = z.object({
  "status.equals": CalculatedStatusSchema.optional(),
  "status.notEquals": CalculatedStatusSchema.optional(),
  "priority.equals": PrioritySchema.optional(),
  "priority.notEquals": PrioritySchema.optional(),
  "dueDate.before": DateStringSchema.optional(),
  "dueDate.after": DateStringSchema.optional(),
  "dueDate.notBefore": DateStringSchema.optional(),
  "dueDate.notAfter": DateStringSchema.optional(),
  "title.contains": z.string().optional(),
  "title.notContains": z.string().optional(),
  "description.contains": z.string().optional(),
  "description.notContains": z.string().optional(),
});

export type ListTodosQuery = z.infer<typeof ListTodosQuerySchema>;

// ============================================================================
// Path Parameter Models
// ============================================================================

export const TodoIdParamSchema = z.object({
  id: z.string().uuid("Invalid todo ID format"),
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
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

