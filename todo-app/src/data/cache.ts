/**
 * Cache Service with Locking
 * Manages in-memory cache with file persistence and simple locking mechanism
 */

import type {
  TodoEntity,
  TodosCache,
  CacheConfig,
} from "../models/db-model.js";
import { FileStorageService } from "./file-storage.js";
import {
  FileLockTimeoutError,
  ResourceNotFoundError,
} from "../errors/index.js";

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
   * @throws FileNotFoundError if file doesn't exist
   * @throws FileReadError if file cannot be read
   * @throws FileParseError if JSON parsing fails
   * @throws InvalidFileFormatError if file structure is invalid
   */
  async initialize(): Promise<void> {
    this.cache = await this.fileStorage.readFile();
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
   * @throws FileLockTimeoutError if lock cannot be acquired after retries
   */
  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new FileLockTimeoutError();
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
   * @throws FileWriteError if file cannot be written
   */
  private async commitCache(cacheCopy: TodosCache): Promise<void> {
    // Sync to file (throws on error)
    await this.fileStorage.writeFile(cacheCopy);

    // Commit to main cache
    this.cache = cacheCopy;
  }

  /**
   * Creates a new todo in the cache
   * @throws FileLockTimeoutError if lock cannot be acquired
   * @throws FileWriteError if file cannot be written
   */
  async create(entity: TodoEntity): Promise<void> {
    await this.withLock(async () => {
      // Create copy of cache
      const cacheCopy = this.createCacheCopy();

      // Add new entity
      cacheCopy[entity.id] = entity;

      // Commit and sync
      await this.commitCache(cacheCopy);
    });
  }

  /**
   * Updates an existing todo in the cache
   * @param id - Todo ID
   * @param updates - Partial updates to apply
   * @param preConditionCheck - Optional callback that validates the cache state before update (runs within lock)
   * @throws ResourceNotFoundError if todo not found
   * @throws FileLockTimeoutError if lock cannot be acquired
   * @throws FileWriteError if file cannot be written
   * @throws Any error thrown by preConditionCheck
   */
  async update(
    id: string,
    updates: Partial<TodoEntity>,
    preConditionCheck?: (cache: TodosCache) => void
  ): Promise<void> {
    await this.withLock(async () => {
      // Check if todo exists
      if (!this.cache[id]) {
        throw new ResourceNotFoundError("Todo", id);
      }

      // Run pre-condition check if provided (within lock, before any changes)
      // If it throws, the error bubbles up and no changes are made
      if (preConditionCheck) {
        preConditionCheck(this.cache);
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
      await this.commitCache(cacheCopy);
    });
  }

  /**
   * Deletes a todo from the cache
   * @param id - Todo ID
   * @param preConditionCheck - Optional callback that validates the cache state before delete (runs within lock)
   * @throws ResourceNotFoundError if todo not found
   * @throws FileLockTimeoutError if lock cannot be acquired
   * @throws FileWriteError if file cannot be written
   * @throws Any error thrown by preConditionCheck
   */
  async delete(id: string, preConditionCheck?: (cache: TodosCache) => void): Promise<void> {
    await this.withLock(async () => {
      // Check if todo exists
      if (!this.cache[id]) {
        throw new ResourceNotFoundError("Todo", id);
      }

      // Run pre-condition check if provided (within lock, before any changes)
      // If it throws, the error bubbles up and no changes are made
      if (preConditionCheck) {
        preConditionCheck(this.cache);
      }

      // Create copy of cache
      const cacheCopy = this.createCacheCopy();

      // Delete entity
      delete cacheCopy[id];

      // Commit and sync
      await this.commitCache(cacheCopy);
    });
  }

  /**
   * Bulk updates status for multiple todos
   * All updates happen atomically within a single lock
   * @param ids - Array of todo IDs to update
   * @param status - New status to set
   * @param preConditionCheck - Optional callback that validates the cache state before update (runs within lock)
   * @throws ResourceNotFoundError if any todo not found
   * @throws FileLockTimeoutError if lock cannot be acquired
   * @throws FileWriteError if file cannot be written
   * @throws Any error thrown by preConditionCheck
   */
  async bulkUpdateStatus(
    ids: string[],
    status: TodoEntity["status"],
    preConditionCheck?: (cache: TodosCache) => void
  ): Promise<void> {
    await this.withLock(async () => {
      // Run pre-condition check if provided (within lock, before any changes)
      // If it throws, the error bubbles up and no changes are made
      if (preConditionCheck) {
        preConditionCheck(this.cache);
      }

      // Create copy of cache
      const cacheCopy = this.createCacheCopy();
      const now = new Date().toISOString();

      // Update all entities
      for (const id of ids) {
        if (!cacheCopy[id]) {
          throw new ResourceNotFoundError("Todo", id);
        }

        cacheCopy[id] = {
          ...cacheCopy[id]!,
          status,
          modifiedAt: now,
        };
      }

      // Commit and sync
      await this.commitCache(cacheCopy);
    });
  }

  /**
   * Bulk deletes multiple todos
   * All deletions happen atomically within a single lock
   * @param ids - Array of todo IDs to delete
   * @param preConditionCheck - Optional callback that validates the cache state before delete (runs within lock)
   * @throws ResourceNotFoundError if any todo not found
   * @throws FileLockTimeoutError if lock cannot be acquired
   * @throws FileWriteError if file cannot be written
   * @throws Any error thrown by preConditionCheck
   */
  async bulkDelete(
    ids: string[],
    preConditionCheck?: (cache: TodosCache) => void
  ): Promise<void> {
    await this.withLock(async () => {
      // Run pre-condition check if provided (within lock, before any changes)
      // If it throws, the error bubbles up and no changes are made
      if (preConditionCheck) {
        preConditionCheck(this.cache);
      }

      // Create copy of cache
      const cacheCopy = this.createCacheCopy();

      // Delete all entities
      for (const id of ids) {
        if (!cacheCopy[id]) {
          throw new ResourceNotFoundError("Todo", id);
        }

        delete cacheCopy[id];
      }

      // Commit and sync
      await this.commitCache(cacheCopy);
    });
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

