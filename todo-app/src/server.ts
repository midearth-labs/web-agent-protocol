/**
 * Application Entry Point
 * Sets up Express server and initializes services
 */

import express from "express";
import { CacheService } from "./data/cache.js";
import { TodoService } from "./business/todo-service.js";
import { createTodoRoutes } from "./api/routes/todos.js";
import { errorHandler } from "./api/middleware/error-handler.js";
import { DEFAULT_FILE_PATH } from "./models/db-model.js";

const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3000;
const FILE_PATH = process.env['TODOS_FILE_PATH'] || DEFAULT_FILE_PATH;

async function main() {
  // Initialize cache service
  const cache = new CacheService({
    filePath: FILE_PATH,
    prettyPrint: true,
  });

  // Initialize cache from file
  console.log(`Initializing cache from file: ${FILE_PATH}`);
  try {
    await cache.initialize();
    console.log(`Cache initialized with ${cache.getSize()} todos`);
  } catch (error) {
    console.error("Failed to initialize cache:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Initialize business logic service
  const todoService = new TodoService(cache);

  // Create Express app
  const app = express();

  // Middleware
  app.use(express.json());

  // Routes
  app.use("/api/v1/todos", createTodoRoutes(todoService));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Error handling (must be last)
  app.use(errorHandler);

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/v1`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

