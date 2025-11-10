/**
 * Todo Business Logic Service
 * Handles business rules, validation, and entity creation
 */

import { randomUUID } from "node:crypto";
import type {
  TodoEntity,
  CreateTodoInput,
  UpdateTodoInput,
  BulkUpdateStatusInput,
  StoredStatus,
  TodosCache,
} from "../models/db-model.js";
import { DEFAULT_VALUES } from "../models/db-model.js";
import type { CacheService } from "../data/cache.js";
import { calculateStatus, getCurrentDateUTC } from "./status-calculator.js";
import type { TodoDTO } from "../models/db-model.js";
import {
  ResourceNotFoundError,
  ValidationError,
  InvalidStatusTransitionError,
  BulkOperationFailedError,
} from "../errors/index.js";

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

    // Save to cache (errors bubble up naturally)
    await this.cache.create(entity);

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
      throw new ResourceNotFoundError("Todo", id);
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
   * Updates a todo
   * 
   * @param input - Update todo input
   * @returns The updated todo DTO with calculated status
   * @throws Error if todo not found or invalid status transition
   */
  async updateTodo(input: UpdateTodoInput): Promise<TodoDTO> {
    // Prepare updates
    const updates: Partial<TodoEntity> = {
      modifiedAt: new Date().toISOString(),
    };

    if (input.title !== undefined && input.title !== null) {
      updates.title = input.title;
    }
    if (input.description !== undefined) {
      updates.description = input.description ?? null;
    }
    if (input.dueDate !== undefined) {
      updates.dueDate = input.dueDate ?? null;
    }
    if (input.status !== undefined) {
      updates.status = input.status;
    }
    if (input.priority !== undefined) {
      updates.priority = input.priority;
    }

    // Pre-condition check: validate within lock before making changes
    const preConditionCheck = (cache: TodosCache): void => {
      const existingEntity = cache[input.id];
      if (!existingEntity) {
        throw new ResourceNotFoundError("Todo", input.id);
      }

      // Validate status transition if status is being updated
      if (input.status !== undefined && input.status !== existingEntity.status) {
        this.validateStatusTransition(existingEntity, input.status);
      }

      // Validate dueDate if being updated (cannot be in the past)
      if (input.dueDate !== undefined && input.dueDate !== null) {
        const currentDate = getCurrentDateUTC();
        if (input.dueDate < currentDate) {
          throw new ValidationError("Due date cannot be in the past");
        }
      }
    };

    // Update in cache with pre-condition check (errors bubble up naturally)
    await this.cache.update(input.id, updates, preConditionCheck);

    // Get updated entity
    const updatedEntity = await this.cache.getById(input.id);
    if (!updatedEntity) {
      throw new ResourceNotFoundError("Todo", input.id);
    }

    return this.entityToDTO(updatedEntity);
  }

  /**
   * Deletes a todo
   * 
   * @param id - Todo ID (UUID)
   * @throws Error if todo not found
   */
  async deleteTodo(id: string): Promise<void> {
    // Pre-condition check: verify entity exists within lock
    const preConditionCheck = (cache: TodosCache): void => {
      if (!cache[id]) {
        throw new ResourceNotFoundError("Todo", id);
      }
    };

    // Delete from cache with pre-condition check (errors bubble up naturally)
    await this.cache.delete(id, preConditionCheck);
  }

  /**
   * Bulk updates status for multiple todos
   * Uses validation-first approach: validates all before applying any changes
   * All reads and writes happen within a single lock
   * 
   * @param input - Bulk update status input
   * @returns Array of updated todo DTOs with calculated status
   * @throws Error if any validation fails (atomic rollback)
   */
  async bulkUpdateStatus(input: BulkUpdateStatusInput): Promise<TodoDTO[]> {
    // Pre-condition check: validate all entities within lock before making any changes
    const preConditionCheck = (cache: TodosCache): void => {
      const errors: string[] = [];

      for (const id of input.ids) {
        const entity = cache[id];
        if (!entity) {
          errors.push(`Todo with id ${id} not found`);
          continue;
        }

        // Validate status transition if status is actually changing
        if (entity.status !== input.status) {
          try {
            this.validateStatusTransition(entity, input.status);
          } catch (error) {
            if (error instanceof InvalidStatusTransitionError) {
              errors.push(`Todo ${id}: ${error.message}`);
            } else {
              errors.push(`Todo ${id}: ${error instanceof Error ? error.message : "Invalid status transition"}`);
            }
          }
        }
      }

      // If any validation failed, throw error with all errors (atomic rollback)
      if (errors.length > 0) {
        throw new BulkOperationFailedError(`Bulk update failed: ${errors.join("; ")}`);
      }
    };

    // Bulk update status with pre-condition check (all updates happen atomically within lock)
    // Errors bubble up naturally - preConditionCheck errors become BulkOperationFailedError,
    // ResourceNotFoundError stays as is, file errors become FileWriteError, etc.
    await this.cache.bulkUpdateStatus(input.ids, input.status, preConditionCheck);

    // Get all updated entities and convert to DTOs
    const currentDate = getCurrentDateUTC();
    const updatedDTOs: TodoDTO[] = [];

    for (const id of input.ids) {
      const updatedEntity = await this.cache.getById(id);
      if (!updatedEntity) {
        throw new ResourceNotFoundError("Todo", id);
      }

      const calculatedStatus = calculateStatus(updatedEntity, currentDate);
      updatedDTOs.push({
        id: updatedEntity.id,
        title: updatedEntity.title,
        description: updatedEntity.description,
        status: calculatedStatus,
        dueDate: updatedEntity.dueDate,
        priority: updatedEntity.priority,
        createdAt: updatedEntity.createdAt,
        modifiedAt: updatedEntity.modifiedAt,
      });
    }

    return updatedDTOs;
  }

  /**
   * Validates status transition according to business rules
   * 
   * @param entity - Current todo entity
   * @param newStatus - New status to transition to
   * @throws Error if transition is invalid
   */
  private validateStatusTransition(entity: TodoEntity, newStatus: StoredStatus): void {
    const currentDate = getCurrentDateUTC();
    const calculatedStatus = calculateStatus(entity, currentDate);

    // Cannot transition from calculated "due" to "initial" if due date is in past
    if (calculatedStatus === "due" && newStatus === "initial") {
      if (entity.dueDate !== null && entity.dueDate < currentDate) {
        throw new InvalidStatusTransitionError("Cannot transition from 'due' to 'initial' when due date is in the past");
      }
    }

    // All other transitions are allowed:
    // - initial -> complete ✓
    // - complete -> initial ✓
    // - due -> complete ✓ (calculated "due" can transition to "complete")
    // - initial -> initial ✓ (no change)
    // - complete -> complete ✓ (no change)
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

