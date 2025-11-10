/**
 * Todo Routes
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { CreateTodoRequestSchema, ListTodosQuerySchema, TodoIdParamSchema, parseFilterParam } from "../../models/api-model.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validator.js";
import type { TodoService } from "../../business/todo-service.js";
import type { CreateTodoRequest, ListTodosQuery, TodoIdParam, TodoResponse, TodoListResponse } from "../../models/api-model.js";

/**
 * Parses filter query parameters into filter criteria format
 */
function parseFilters(query: ListTodosQuery): {
  status?: { equals?: string; notEquals?: string };
  priority?: { equals?: string; notEquals?: string };
  dueDate?: { before?: string; after?: string; notBefore?: string; notAfter?: string };
  title?: { contains?: string; notContains?: string };
  description?: { contains?: string; notContains?: string };
} | undefined {
  const filters: {
    status?: { equals?: string; notEquals?: string };
    priority?: { equals?: string; notEquals?: string };
    dueDate?: { before?: string; after?: string; notBefore?: string; notAfter?: string };
    title?: { contains?: string; notContains?: string };
    description?: { contains?: string; notContains?: string };
  } = {};

  // Parse status filter
  if (query.status) {
    const { comparator, value } = parseFilterParam(query.status);
    if (comparator === "equals") {
      filters.status = { equals: value };
    } else if (comparator === "notEquals") {
      filters.status = { notEquals: value };
    }
  }

  // Parse priority filter
  if (query.priority) {
    const { comparator, value } = parseFilterParam(query.priority);
    if (comparator === "equals") {
      filters.priority = { equals: value };
    } else if (comparator === "notEquals") {
      filters.priority = { notEquals: value };
    }
  }

  // Parse dueDate filter
  if (query.dueDate) {
    const { comparator, value } = parseFilterParam(query.dueDate);
    if (comparator === "before") {
      filters.dueDate = { before: value };
    } else if (comparator === "after") {
      filters.dueDate = { after: value };
    } else if (comparator === "notBefore") {
      filters.dueDate = { notBefore: value };
    } else if (comparator === "notAfter") {
      filters.dueDate = { notAfter: value };
    }
  }

  // Parse title filter
  if (query.title) {
    const { comparator, value } = parseFilterParam(query.title);
    if (comparator === "contains") {
      filters.title = { contains: value };
    } else if (comparator === "notContains") {
      filters.title = { notContains: value };
    }
  }

  // Parse description filter
  if (query.description) {
    const { comparator, value } = parseFilterParam(query.description);
    if (comparator === "contains") {
      filters.description = { contains: value };
    } else if (comparator === "notContains") {
      filters.description = { notContains: value };
    }
  }

  // Return undefined if no filters were provided
  if (Object.keys(filters).length === 0) {
    return undefined;
  }

  return filters;
}

/**
 * Creates todo routes
 */
export function createTodoRoutes(todoService: TodoService): Router {
  const router = Router();

  /**
   * POST /api/v1/todos
   * Create a new todo
   */
  router.post(
    "/",
    validateBody(CreateTodoRequestSchema),
    async (req: Request<unknown, TodoResponse, CreateTodoRequest>, res: Response<TodoResponse>) => {
      const input = req.body;

      // Convert API request to business input
      const createInput = {
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        priority: input.priority,
      };

      // Create todo
      const dto = await todoService.createTodo(createInput);

      // Return response
      res.status(201).json({ data: dto });
    }
  );

  /**
   * GET /api/v1/todos
   * List todos with optional filtering
   * Note: This route must come before GET /:id to avoid route conflicts
   */
  router.get(
    "/",
    validateQuery(ListTodosQuerySchema),
    async (req: Request<unknown, TodoListResponse, unknown, ListTodosQuery>, res: Response<TodoListResponse>) => {
      const query = req.query;

      // Parse filters from query parameters
      const filters = parseFilters(query);

      // List todos with filters
      const dtos = await todoService.listTodos(filters);

      // Return response
      res.status(200).json({ data: dtos });
    }
  );

  /**
   * GET /api/v1/todos/:id
   * Get a todo by ID
   */
  router.get(
    "/:id",
    validateParams(TodoIdParamSchema),
    async (req: Request<TodoIdParam, TodoResponse>, res: Response<TodoResponse>) => {
      const { id } = req.params;

      // Get todo by ID
      const dto = await todoService.getTodoById(id);

      // Return response
      res.status(200).json({ data: dto });
    }
  );

  return router;
}

