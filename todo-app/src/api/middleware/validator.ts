/**
 * Request Validation Middleware
 */

import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Creates a middleware that validates request body against a Zod schema
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      // Pass ZodError to error handler
      next(result.error);
      return;
    }

    // Replace body with validated data
    req.body = result.data;
    next();
  };
}

