/**
 * Todo Routes
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { CreateTodoRequestSchema } from "../../models/api-model.js";
import { validateBody } from "../middleware/validator.js";
import type { TodoService } from "../../business/todo-service.js";
import type { CreateTodoRequest } from "../../models/api-model.js";
import type { TodoResponse } from "../../models/api-model.js";

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

  return router;
}

