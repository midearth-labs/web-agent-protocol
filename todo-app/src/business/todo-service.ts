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

