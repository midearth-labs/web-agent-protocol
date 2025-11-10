/**
 * Typed Error Classes
 * Custom error classes for better error handling and type safety
 */

import { ErrorCodes, type ErrorCode } from "../models/api-model.js";

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Array<{ field: string; message: string }> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Resource not found error (404)
 */
export class ResourceNotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id ${identifier} not found`
      : `${resource} not found`;
    super(ErrorCodes.NOT_FOUND, message, 404);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Array<{ field: string; message: string }>) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
  }
}

/**
 * Invalid status transition error (400)
 */
export class InvalidStatusTransitionError extends ValidationError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Bulk operation failed error (400)
 */
export class BulkOperationFailedError extends AppError {
  constructor(message: string, details?: Array<{ field: string; message: string }>) {
    super(ErrorCodes.BULK_OPERATION_FAILED, message, 400, details);
  }
}

/**
 * Conflict error (409)
 * Used for concurrent modification or file lock timeout
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.CONFLICT, message, 409);
  }
}

/**
 * File lock timeout error (409)
 */
export class FileLockTimeoutError extends ConflictError {
  constructor(message: string = "Failed to acquire lock after retries. Please try again.") {
    super(message);
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(ErrorCodes.INTERNAL_ERROR, message, 500);
  }
}

/**
 * File operation error (500)
 * Base class for file-related errors
 */
export class FileOperationError extends InternalServerError {
  constructor(message: string, public readonly filePath?: string) {
    super(message);
  }
}

/**
 * File not found error (500)
 * Used when the JSON file doesn't exist (should be created manually)
 */
export class FileNotFoundError extends FileOperationError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}. File must be created manually before first run.`, filePath);
  }
}

/**
 * File read error (500)
 */
export class FileReadError extends FileOperationError {
  constructor(message: string, filePath?: string) {
    super(`Failed to read file: ${message}`, filePath);
  }
}

/**
 * File write error (500)
 */
export class FileWriteError extends FileOperationError {
  constructor(message: string, filePath?: string) {
    super(`Failed to write file: ${message}`, filePath);
  }
}

/**
 * File parse error (500)
 * Used when JSON parsing fails
 */
export class FileParseError extends FileOperationError {
  constructor(message: string, filePath?: string) {
    super(`Failed to parse JSON file: ${message}`, filePath);
  }
}

/**
 * Invalid file format error (500)
 * Used when file structure is invalid
 */
export class InvalidFileFormatError extends FileOperationError {
  constructor(message: string, filePath?: string) {
    super(`Invalid file format: ${message}`, filePath);
  }
}

