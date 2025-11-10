/**
 * Todo Business Logic Service
 * Handles business rules, validation, and entity creation
 */

import { randomUUID } from "node:crypto";
import type {
  TodoEntity,
  CreateTodoInput,
} from "../models/db-model.js";
import { DEFAULT_VALUES } from "../models/db-model.js";
import type { CacheService } from "../data/cache.js";
import { calculateStatus, getCurrentDateUTC } from "./status-calculator.js";
import type { TodoDTO } from "../models/db-model.js";

/**
 * Todo Service
 * Handles business logic for todo operations
 */
export class TodoService {
  constructor(private readonly cache: CacheService) {}

  /**
   * Creates a new todo
   * 
   * @param input - Create todo input
   * @returns The created todo entity
   */
  async createTodo(input: CreateTodoInput): Promise<TodoDTO> {
    // Generate UUID
    const id = randomUUID();

    // Get current timestamp (ISO 8601 string)
    const now = new Date().toISOString();

    // Create entity with defaults
    const entity: TodoEntity = {
      id,
      title: input.title,
      description: input.description ?? DEFAULT_VALUES.description,
      status: DEFAULT_VALUES.status,
      dueDate: input.dueDate ?? DEFAULT_VALUES.dueDate,
      priority: input.priority ?? DEFAULT_VALUES.priority,
      createdAt: now,
      modifiedAt: now,
    };

    // Save to cache
    const result = await this.cache.create(entity);
    if (result && !result.success) {
      throw new Error(`Failed to create todo: ${result.error.message}`);
    }

    return this.entityToDTO(entity);
  }

  /**
   * Gets a todo by ID
   * 
   * @param id - Todo ID (UUID)
   * @returns The todo DTO with calculated status
   * @throws Error if todo not found
   */
  async getTodoById(id: string): Promise<TodoDTO> {
    const entity = await this.cache.getById(id);
    if (!entity) {
      throw new Error(`Todo with id ${id} not found`);
    }

    return this.entityToDTO(entity);
  }

  /**
   * Lists todos with optional filtering
   * 
   * @param filters - Optional filter criteria
   * @returns Array of todo DTOs with calculated status
   */
  async listTodos(filters?: {
    status?: { equals?: string; notEquals?: string };
    priority?: { equals?: string; notEquals?: string };
    dueDate?: { before?: string; after?: string; notBefore?: string; notAfter?: string };
    title?: { contains?: string; notContains?: string };
    description?: { contains?: string; notContains?: string };
  }): Promise<TodoDTO[]> {
    // Get all todos from cache (lock-free read)
    const entities = await this.cache.getAll();

    // Convert to DTOs with calculated status
    const currentDate = getCurrentDateUTC();
    let todos = entities.map((entity) => {
      const calculatedStatus = calculateStatus(entity, currentDate);
      return {
        id: entity.id,
        title: entity.title,
        description: entity.description,
        status: calculatedStatus,
        dueDate: entity.dueDate,
        priority: entity.priority,
        createdAt: entity.createdAt,
        modifiedAt: entity.modifiedAt,
      } as TodoDTO;
    });

    // Apply filters if provided
    if (filters) {
      todos = this.applyFilters(todos, filters);
    }

    return todos;
  }

  /**
   * Applies filters to todo list (AND logic - all filters must match)
   * 
   * @param todos - Array of todos to filter
   * @param filters - Filter criteria
   * @returns Filtered array of todos
   */
  private applyFilters(
    todos: TodoDTO[],
    filters: {
      status?: { equals?: string; notEquals?: string };
      priority?: { equals?: string; notEquals?: string };
      dueDate?: { before?: string; after?: string; notBefore?: string; notAfter?: string };
      title?: { contains?: string; notContains?: string };
      description?: { contains?: string; notContains?: string };
    }
  ): TodoDTO[] {
    return todos.filter((todo) => {
      // Status filter (operates on calculated status)
      if (filters.status) {
        if (filters.status.equals !== undefined && todo.status !== filters.status.equals) {
          return false;
        }
        if (filters.status.notEquals !== undefined && todo.status === filters.status.notEquals) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority) {
        if (filters.priority.equals !== undefined && todo.priority !== filters.priority.equals) {
          return false;
        }
        if (filters.priority.notEquals !== undefined && todo.priority === filters.priority.notEquals) {
          return false;
        }
      }

      // Due date filter
      if (filters.dueDate) {
        if (todo.dueDate === null) {
          // If todo has no due date, it doesn't match any date filter
          if (filters.dueDate.before || filters.dueDate.after || filters.dueDate.notBefore || filters.dueDate.notAfter) {
            return false;
          }
        } else {
          if (filters.dueDate.before !== undefined && todo.dueDate >= filters.dueDate.before) {
            return false;
          }
          if (filters.dueDate.after !== undefined && todo.dueDate <= filters.dueDate.after) {
            return false;
          }
          if (filters.dueDate.notBefore !== undefined && todo.dueDate < filters.dueDate.notBefore) {
            return false;
          }
          if (filters.dueDate.notAfter !== undefined && todo.dueDate > filters.dueDate.notAfter) {
            return false;
          }
        }
      }

      // Title filter (case-insensitive)
      if (filters.title) {
        const titleLower = todo.title.toLowerCase();
        if (filters.title.contains !== undefined && !titleLower.includes(filters.title.contains.toLowerCase())) {
          return false;
        }
        if (filters.title.notContains !== undefined && titleLower.includes(filters.title.notContains.toLowerCase())) {
          return false;
        }
      }

      // Description filter (case-insensitive)
      if (filters.description) {
        const descLower = todo.description?.toLowerCase() ?? "";
        if (filters.description.contains !== undefined && !descLower.includes(filters.description.contains.toLowerCase())) {
          return false;
        }
        if (filters.description.notContains !== undefined && descLower.includes(filters.description.notContains.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Converts TodoEntity to TodoDTO with calculated status
   * 
   * @param entity - The todo entity
   * @returns The todo DTO with calculated status
   */
  entityToDTO(entity: TodoEntity): TodoDTO {
    const currentDate = getCurrentDateUTC();
    const calculatedStatus = calculateStatus(entity, currentDate);

    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: calculatedStatus,
      dueDate: entity.dueDate,
      priority: entity.priority,
      createdAt: entity.createdAt,
      modifiedAt: entity.modifiedAt,
    };
  }
}

