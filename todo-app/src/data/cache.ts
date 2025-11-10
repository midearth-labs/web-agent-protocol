/**
 * Cache Service with Locking
 * Manages in-memory cache with file persistence and simple locking mechanism
 */

import type {
  TodoEntity,
  TodosCache,
  CacheConfig,
  FileOperationError,
} from "../models/db-model.js";
import { FileStorageService } from "./file-storage.js";

/**
 * Default retry backoff intervals in milliseconds
 */
const DEFAULT_RETRY_BACKOFF = [50, 100, 200, 400, 800] as const;

/**
 * Default number of lock retries
 */
const DEFAULT_LOCK_RETRIES = 5;

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cache Service with Locking
 */
export class CacheService {
  private cache: TodosCache = {};
  private lock: boolean = false;
  private readonly fileStorage: FileStorageService;
  private readonly lockRetries: number;
  private readonly retryBackoff: readonly number[];

  constructor(config: CacheConfig) {
    this.fileStorage = new FileStorageService(config.filePath, config.prettyPrint ?? false);
    this.lockRetries = config.lockRetries ?? DEFAULT_LOCK_RETRIES;
    this.retryBackoff = config.retryBackoff ?? DEFAULT_RETRY_BACKOFF;
  }

  /**
   * Initializes the cache by loading data from file
   * Must be called before any other operations
   * Fails if file doesn't exist (manual initialization required)
   */
  async initialize(): Promise<{ success: true } | { success: false; error: FileOperationError }> {
    const result = await this.fileStorage.readFile();
    if (!result.success) {
      return result;
    }

    this.cache = result.data;
    return { success: true };
  }

  /**
   * Acquires the global lock with exponential backoff retry
   * Returns true if lock acquired, false if timeout after retries
   */
  private async acquireLock(): Promise<boolean> {
    for (let attempt = 0; attempt < this.lockRetries; attempt++) {
      if (!this.lock) {
        this.lock = true;
        return true;
      }

      // Wait before retry (exponential backoff)
      if (attempt < this.retryBackoff.length) {
        await sleep(this.retryBackoff[attempt]!);
      } else {
        // Use last backoff value for remaining attempts
        await sleep(this.retryBackoff[this.retryBackoff.length - 1]!);
      }
    }

    return false;
  }

  /**
   * Releases the global lock
   */
  private releaseLock(): void {
    this.lock = false;
  }

  /**
   * Executes an operation with lock acquisition and retry
   * Returns error if lock cannot be acquired after retries
   */
  private async withLock<T>(
    operation: () => Promise<T>
  ): Promise<T | { success: false; error: FileOperationError }> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return {
        success: false,
        error: {
          code: "FILE_LOCK_TIMEOUT",
          message: "Failed to acquire lock after retries. Please try again.",
        },
      } as const;
    }

    try {
      return await operation();
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Gets a todo by ID (read operation - no lock needed)
   */
  async getById(id: string): Promise<TodoEntity | null> {
    return this.cache[id] ?? null;
  }

  /**
   * Gets all todos (read operation - no lock needed)
   */
  async getAll(): Promise<TodoEntity[]> {
    return Object.values(this.cache);
  }

  /**
   * Creates a copy of the current cache (for copy-on-write pattern)
   */
  private createCacheCopy(): TodosCache {
    // Deep copy the cache (strings are already immutable, so simple spread is sufficient)
    const copy: TodosCache = {};
    for (const [id, entity] of Object.entries(this.cache)) {
      copy[id] = { ...entity };
    }
    return copy;
  }

  /**
   * Commits a cache copy to the main cache and syncs to file
   * This is the atomic commit step in copy-on-write pattern
   */
  private async commitCache(cacheCopy: TodosCache): Promise<{ success: false; error: FileOperationError } | void> {
    // Commit to main cache
    this.cache = cacheCopy;

    // Sync to file
    const writeResult = await this.fileStorage.writeFile(this.cache);
    if (!writeResult.success) {
      // Rollback: restore previous cache state
      // Note: In a real system, we might want to keep a backup, but for MVP simplicity,
      // we just log the error. The cache is already updated, so we return the error.
      return writeResult;
    }
  }

  /**
   * Creates a new todo in the cache
   */
  async create(entity: TodoEntity): Promise<{ success: false; error: FileOperationError } | void> {
    const result = await this.withLock(async () => {
      // Create copy of cache
      const cacheCopy = this.createCacheCopy();

      // Add new entity
      cacheCopy[entity.id] = entity;

      // Commit and sync
      return await this.commitCache(cacheCopy);
    });

    if (result && typeof result === "object" && "success" in result && !result.success) {
      return result;
    }
  }

  /**
   * Updates an existing todo in the cache
   */
  async update(id: string, updates: Partial<TodoEntity>): Promise<{ success: false; error: FileOperationError } | void> {
    const result = await this.withLock(async () => {
      // Check if todo exists
      if (!this.cache[id]) {
        return {
          success: false,
          error: {
            code: "INVALID_FORMAT" as const,
            message: `Todo with id ${id} not found`,
            details: { id },
          },
        } as const;
      }

      // Create copy of cache
      const cacheCopy = this.createCacheCopy();

      // Update entity
      cacheCopy[id] = {
        ...cacheCopy[id]!,
        ...updates,
        id, // Ensure ID cannot be changed
      };

      // Commit and sync
      return await this.commitCache(cacheCopy);
    });

    if (result && typeof result === "object" && "success" in result && !result.success) {
      return result;
    }
  }

  /**
   * Deletes a todo from the cache
   */
  async delete(id: string): Promise<{ success: false; error: FileOperationError } | void> {
    const result = await this.withLock(async () => {
      // Check if todo exists
      if (!this.cache[id]) {
        return {
          success: false,
          error: {
            code: "INVALID_FORMAT" as const,
            message: `Todo with id ${id} not found`,
            details: { id },
          },
        } as const;
      }

      // Create copy of cache
      const cacheCopy = this.createCacheCopy();

      // Delete entity
      delete cacheCopy[id];

      // Commit and sync
      return await this.commitCache(cacheCopy);
    });

    if (result && typeof result === "object" && "success" in result && !result.success) {
      return result;
    }
  }

  /**
   * Gets the current cache size
   */
  getSize(): number {
    return Object.keys(this.cache).length;
  }

  /**
   * Checks if cache is initialized
   */
  isInitialized(): boolean {
    return Object.keys(this.cache).length >= 0; // Always true after constructor, but useful for checking
  }
}

