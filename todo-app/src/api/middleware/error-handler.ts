/**
 * Error Handling Middleware
 */

import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ErrorResponse } from "../../models/api-model.js";
import { ErrorCodes } from "../../models/api-model.js";

/**
 * Formats Zod validation errors into API error response
 */
function formatZodError(error: ZodError): ErrorResponse {
  const details = error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
  }));

  return {
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: "Validation failed",
      details,
    },
  };
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse = formatZodError(err);
    res.status(400).json(errorResponse);
    return;
  }

  // Generic Error objects
  if (err instanceof Error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: err.message || "Internal server error",
      },
    };
    res.status(500).json(errorResponse);
    return;
  }

  // Unknown error type
  const errorResponse: ErrorResponse = {
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "An unexpected error occurred",
    },
  };
  res.status(500).json(errorResponse);
}

