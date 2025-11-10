/**
 * File Storage Service
 * Handles reading and writing JSON file for todo persistence
 */

import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type {
  TodosFileContent,
  FileOperationResult,
} from "../models/db-model.js";

/**
 * File Storage Service
 */
export class FileStorageService {
  private readonly filePath: string;
  private readonly prettyPrint: boolean;

  constructor(filePath: string, prettyPrint = false) {
    this.filePath = filePath;
    this.prettyPrint = prettyPrint;
  }

  /**
   * Reads the JSON file and returns the cache content
   * Fails if file doesn't exist (manual initialization required per HLD)
   */
  async readFile(): Promise<FileOperationResult<TodosFileContent>> {
    try {
      // Check if file exists
      try {
        await fs.access(this.filePath);
      } catch (error) {
        return {
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: `File not found: ${this.filePath}. File must be created manually before first run.`,
            details: { filePath: this.filePath },
          },
        };
      }

      // Read file content
      const fileContent = await fs.readFile(this.filePath, "utf-8");

      // Parse JSON
      let parsed: TodosFileContent;
      try {
        parsed = JSON.parse(fileContent) as TodosFileContent;
      } catch (error) {
        return {
          success: false,
          error: {
            code: "PARSE_ERROR",
            message: `Failed to parse JSON file: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: { filePath: this.filePath },
          },
        };
      }

      // Validate structure (must be an object)
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {
          success: false,
          error: {
            code: "INVALID_FORMAT",
            message: "File must contain a JSON object (key-value store)",
            details: { filePath: this.filePath },
          },
        };
      }

      return { success: true, data: parsed };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "FILE_READ_ERROR",
          message: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
          details: { filePath: this.filePath, error: String(error) },
        },
      };
    }
  }

  /**
   * Writes the cache content to the JSON file
   * Creates directory if it doesn't exist
   * Uses in-memory write (no temp file per HLD clarification)
   */
  async writeFile(cache: TodosFileContent): Promise<FileOperationResult<void>> {
    try {
      // Ensure directory exists
      const dir = dirname(this.filePath);
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore
      }

      // Serialize JSON (no conversion needed - cache already uses ISO strings)
      const jsonString = this.prettyPrint
        ? JSON.stringify(cache, null, 2)
        : JSON.stringify(cache);

      // Write file (in-memory write, no temp file per HLD)
      await fs.writeFile(this.filePath, jsonString, "utf-8");

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "FILE_WRITE_ERROR",
          message: `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`,
          details: { filePath: this.filePath, error: String(error) },
        },
      };
    }
  }
}

