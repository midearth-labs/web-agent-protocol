/**
 * File Storage Service
 * Handles reading and writing JSON file for todo persistence
 */

import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type { TodosFileContent } from "../models/db-model.js";
import {
  FileNotFoundError,
  FileReadError,
  FileWriteError,
  FileParseError,
  InvalidFileFormatError,
} from "../errors/index.js";

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
   * @throws FileNotFoundError if file doesn't exist
   * @throws FileReadError if file cannot be read
   * @throws FileParseError if JSON parsing fails
   * @throws InvalidFileFormatError if file structure is invalid
   */
  async readFile(): Promise<TodosFileContent> {
    // Check if file exists
    try {
      await fs.access(this.filePath);
    } catch (error) {
      throw new FileNotFoundError(this.filePath);
    }

    // Read file content
    let fileContent: string;
    try {
      fileContent = await fs.readFile(this.filePath, "utf-8");
    } catch (error) {
      throw new FileReadError(
        error instanceof Error ? error.message : "Unknown error",
        this.filePath
      );
    }

    // Parse JSON
    let parsed: TodosFileContent;
    try {
      parsed = JSON.parse(fileContent) as TodosFileContent;
    } catch (error) {
      throw new FileParseError(
        error instanceof Error ? error.message : "Unknown error",
        this.filePath
      );
    }

    // Validate structure (must be an object)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new InvalidFileFormatError(
        "File must contain a JSON object (key-value store)",
        this.filePath
      );
    }

    return parsed;
  }

  /**
   * Writes the cache content to the JSON file
   * Creates directory if it doesn't exist
   * Uses in-memory write (no temp file per HLD clarification)
   * @throws FileWriteError if file cannot be written
   */
  async writeFile(cache: TodosFileContent): Promise<void> {
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
    try {
      await fs.writeFile(this.filePath, jsonString, "utf-8");
    } catch (error) {
      throw new FileWriteError(
        error instanceof Error ? error.message : "Unknown error",
        this.filePath
      );
    }
  }
}

