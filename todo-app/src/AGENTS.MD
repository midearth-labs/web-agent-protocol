# Agent Decision Log

This file tracks all architectural and implementation decisions made during the development of the Todo Management Application.

## Project Structure

**Date**: 2025-11-10  
**Decision**: Organize codebase into layered architecture with clear separation of concerns.

**Structure**:
```
todo-app/src
  ├── models/          # Type definitions and Zod schemas (from design docs)
  ├── data/            # Data access layer (file storage, cache, locking)
  ├── business/        # Business logic layer (status calculation, filtering, validation)
  ├── api/             # API layer (routes, handlers, middleware)
  └── server.ts        # Application entry point
```

**Rationale**: 
- Follows the HLD's component architecture (API → Business Logic → Data Access)
- Enables clear separation of concerns
- Makes testing and maintenance easier
- Aligns with the layered architecture described in section 2.2 of HLD

---

## Dependencies

**Date**: 2025-11-10  
**Decision**: Use Express.js for HTTP server, uuid for ID generation, and existing Zod for validation.

**Dependencies**:
- `express` - HTTP server framework (as recommended in HLD section 8.1)
- `uuid` - UUID v4 generation (as specified in HLD)
- `zod` - Already in root project, will be used for validation
- `@types/express` - TypeScript types for Express
- `@types/uuid` - TypeScript types for uuid

**Rationale**: 
- Express.js is the recommended framework in HLD section 8.1
- UUID library is standard for ID generation
- Zod is already available and matches the API models

---

## Model Files Location

**Date**: 2025-11-10  
**Decision**: Copy model files from `docs/design/` to `src/models/` for use in implementation.

**Files**:
- `api-model.ts` → `src/models/api-model.ts`
- `db-model.ts` → `src/models/db-model.ts`

**Rationale**: 
- Models are referenced in HLD Appendix A
- Need to be accessible to all layers
- Keeps design docs separate from implementation

---

## Implementation Order

**Date**: 2025-11-10  
**Decision**: Implement in bottom-up order: Data Layer → Business Logic → API Layer.

**Order**:
1. Data Access Layer (file storage, cache, locking)
2. Business Logic Layer (status calculation, filtering)
3. API Layer (routes, handlers, middleware)
4. Integration (server setup, startup sequence)

**Rationale**: 
- Each layer depends on the previous one
- Enables incremental testing
- Matches dependency flow in architecture

---

## Package Installation

**Date**: 2025-11-10  
**Decision**: Install dependencies in todo-app directory with separate package.json.

**Installed Dependencies**:
- `express@^5.1.0` - HTTP server framework
- `uuid@^13.0.0` - UUID v4 generation
- `zod@^4.1.12` - Runtime validation (inherited from root)
- `@types/express@^5.0.5` - TypeScript types
- `@types/node@^24.10.0` - TypeScript types for Node.js
- `@types/uuid@^11.0.0` - TypeScript types
- `tsx@^4.20.6` - TypeScript execution for development
- `typescript@^5.9.3` - TypeScript compiler

**Rationale**: 
- Separate package.json allows independent dependency management
- All dependencies installed successfully with no vulnerabilities
- TypeScript types included for type safety
- Updated to latest versions as of 2024

---

## TypeScript Configuration

**Date**: 2025-11-10  
**Decision**: Extend root tsconfig.json with todo-app specific settings.

**Configuration**:
- Extends `../tsconfig.json` for consistency
- `outDir`: `./dist`
- `rootDir`: `./src`
- Includes all files in `src/**/*`

**Rationale**: 
- Maintains consistency with root project TypeScript settings
- Clear separation of source and build output
- Follows standard TypeScript project structure

---

## Data Access Layer Implementation

**Date**: 2025-11-10  
**Decision**: Implemented file storage and cache service with locking mechanism.

**Components**:
- `file-storage.ts` - Handles JSON file read/write operations
- `cache.ts` - In-memory cache with locking and copy-on-write pattern
- `index.ts` - Exports all data layer components

**Key Features**:
- String timestamps: `createdAt` and `modifiedAt` stored as ISO 8601 strings (no Date conversion overhead)
- Lock mechanism: Simple boolean flag with exponential backoff retry (50ms, 100ms, 200ms, 400ms, 800ms)
- Copy-on-write: All mutations work on cache copy, committed atomically
- File operations: UTF-8 encoding, configurable pretty print, automatic directory creation
- Error handling: Comprehensive error types for file operations

**Design Decisions**:
- **Direct Error Throwing**: All methods throw typed errors directly (no result objects)
- Read operations are lock-free (optimized for performance in single-user MVP)
- Write operations use lock with exponential backoff retry
- File must exist before startup (manual initialization required)
- In-memory write (no temp file) per HLD clarification
- **PreConditionCheck Pattern**: Validation callbacks run within write locks for atomicity

**Error Handling**:
- File operations throw: `FileNotFoundError`, `FileReadError`, `FileWriteError`, `FileParseError`, `InvalidFileFormatError`
- Cache operations throw: `ResourceNotFoundError`, `FileLockTimeoutError`, `FileWriteError`
- All errors preserve original types and messages (no masking)

**Rationale**: 
- Lock-free reads optimize performance for single-user MVP (no concurrent write conflicts during reads)
- Write operations remain atomic with copy-on-write pattern
- Type-safe error handling with typed error classes
- No error masking - errors bubble up with original types
- Follows updated HLD section 4.5 specifications

---

## Timestamp Storage Optimization

**Date**: 2025-11-10  
**Decision**: Store `createdAt` and `modifiedAt` as ISO 8601 strings instead of Date objects.

**Changes**:
- Updated `TodoEntity` type: `createdAt` and `modifiedAt` are now `string` (ISO 8601 format)
- Removed Date conversion logic from `file-storage.ts` (no longer needed)
- Simplified `createCacheCopy()` in `cache.ts` (no Date object creation)
- File format and cache format are now identical (no conversion overhead)

**Benefits**:
- **Performance**: Eliminates Date object creation/parsing on every read/write
- **Simplicity**: No conversion functions needed, direct JSON serialization
- **Consistency**: Same format in memory and file (ISO 8601 strings)
- **Reduced overhead**: Simpler cache copying (just object spread)

**Rationale**: 
- ISO 8601 strings are already the standard format for JSON APIs
- Date objects add unnecessary overhead for a single-user MVP
- Strings are immutable and easier to work with in JSON
- Performance improvement with no functional impact

---

## Zod v4 Migration

**Date**: 2025-11-10  
**Decision**: Updated all Zod schemas to use Zod v4 semantics and avoid deprecated approaches.

**Changes**:
- Replaced `message` parameter with `error` parameter in validation methods
- Updated `.min()`, `.max()`, `.uuid()` to use `{ error: "message" }` syntax
- Updated `.refine()` to use `{ error: "message" }` instead of `{ message: "message" }`
- Fixed ZodError handling: use `error.issues` instead of `error.errors` (v4 API)
- Removed unused type imports

**Updated Patterns**:
- **Before (v3)**: `.min(1, "Title is required")`
- **After (v4)**: `.min(1, { error: "Title is required" })`
- **Before (v3)**: `.refine(..., { message: "error" })`
- **After (v4)**: `.refine(..., { error: "error" })`
- **Before (v3)**: `error.errors` (ZodError)
- **After (v4)**: `error.issues` (ZodError)

**Files Updated**:
- `api-model.ts` - All validation schemas updated to v4 syntax
- `error-handler.ts` - Updated to use `error.issues` instead of `error.errors`
- `status-calculator.ts` - Removed unused imports
- `todo-service.ts` - Removed unused imports

**Rationale**: 
- Zod v4 deprecates `message` parameter in favor of `error` for consistency
- `error.issues` is the correct property name in Zod v4
- Ensures compatibility with Zod v4.1.12 and future versions
- Follows official Zod v4 migration guide

---

## Implementation Patterns & Conventions

**Date**: 2025-11-10  
**Decision**: Documented implementation patterns and styles based on createTodo API implementation.

### Business Logic Layer Patterns

**Return Types**:
- Business logic methods **always return DTOs**, not entities
- Use `entityToDTO()` to convert entities before returning
- Example: `async createTodo(input: CreateTodoInput): Promise<TodoDTO>`

**Entity Creation**:
- Generate UUIDs using `randomUUID()` from `node:crypto` (not uuid library)
- Use `new Date().toISOString()` for timestamps (ISO 8601 strings)
- Apply defaults using `DEFAULT_VALUES` from `db-model.ts`
- Use nullish coalescing (`??`) for optional fields

**Code Style**:
```typescript
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

// Always convert to DTO before returning
return this.entityToDTO(entity);
```

**Error Handling**:
- Check cache operation results: `if (result && !result.success)`
- Throw descriptive errors: `throw new Error(\`Failed to create todo: ${result.error.message}\`)`

### API Layer Patterns

**Route Handler Structure**:
1. Use `validateBody()` middleware for request validation
2. Convert API request types to business input types
3. Call business logic service method
4. Business layer returns DTO directly (already converted)
5. Wrap in response format: `{ data: dto }`
6. Use appropriate HTTP status codes (201 for create, 200 for updates, 204 for delete)

**Code Style**:
```typescript
router.post(
  "/",
  validateBody(CreateTodoRequestSchema),
  async (req: Request<unknown, TodoResponse, CreateTodoRequest>, res: Response<TodoResponse>) => {
    const input = req.body;

    // Convert API request to business input
    const createInput = {
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      priority: input.priority,
    };

    // Business layer returns DTO directly
    const dto = await todoService.createTodo(createInput);

    // Return response
    res.status(201).json({ data: dto });
  }
);
```

**Type Usage**:
- Request types: Import from `api-model.ts` (e.g., `CreateTodoRequest`)
- Business input types: Import from `db-model.ts` (e.g., `CreateTodoInput`)
- Response types: Import from `api-model.ts` (e.g., `TodoResponse`)
- DTOs: Import from `db-model.ts` (e.g., `TodoDTO`)

### Zod v4 Patterns

**UUID Validation**:
- **Use**: `z.uuid({ error: "message" })`
- **NOT**: `z.string().uuid({ error: "message" })`
- Direct `z.uuid()` is the correct Zod v4 syntax

**Error Messages**:
- Always use `{ error: "message" }` syntax
- Never use deprecated `message` parameter
- Apply to: `.min()`, `.max()`, `.refine()`, `.uuid()`, etc.

**Examples**:
```typescript
// Correct
z.uuid({ error: "Invalid UUID format" })
z.string().min(1, { error: "Title is required" })
z.refine(..., { error: "Due date cannot be in the past" })

// Incorrect (deprecated)
z.string().uuid({ error: "Invalid UUID format" })
z.string().min(1, "Title is required")
z.refine(..., { message: "Due date cannot be in the past" })
```

### Type Conversion Flow

**API Request → Business Input → Entity → DTO → API Response**:
1. **API Layer**: Receives `CreateTodoRequest` (from `api-model.ts`)
2. **API Layer**: Converts to `CreateTodoInput` (from `db-model.ts`)
3. **Business Layer**: Creates `TodoEntity` (from `db-model.ts`)
4. **Business Layer**: Converts to `TodoDTO` using `entityToDTO()` (includes calculated status)
5. **API Layer**: Wraps DTO in `{ data: dto }` response format

**Key Points**:
- Business layer never exposes entities directly
- Always use `entityToDTO()` to include calculated status
- API layer handles request/response formatting only
- Business layer handles all business logic and data transformation

### File Organization

**Business Logic** (`src/business/`):
- `todo-service.ts` - Main service class with business methods
- `status-calculator.ts` - Status calculation utilities
- `index.ts` - Exports

**API Layer** (`src/api/`):
- `routes/todos.ts` - Route handlers (one file per resource)
- `middleware/validator.ts` - Request validation middleware
- `middleware/error-handler.ts` - Error handling middleware
- `index.ts` - Exports

**Naming Conventions**:
- Service methods: `createTodo()`, `updateTodo()`, `deleteTodo()`, etc.
- Route functions: `createTodoRoutes()` (returns Router)
- Middleware: `validateBody()`, `errorHandler()`
- Utility functions: `calculateStatus()`, `getCurrentDateUTC()`

### Error Handling

**Business Layer**:
- Throw typed error classes (e.g., `ResourceNotFoundError`, `ValidationError`)
- **Never check result objects** - errors throw directly from cache layer
- Let errors bubble up to API layer naturally
- Use `preConditionCheck` callbacks for validation within locks

**API Layer**:
- Use `errorHandler` middleware (must be last)
- Zod validation errors automatically handled (400 status)
- Typed errors (`AppError` subclasses) automatically mapped to correct HTTP status
- Generic errors return 500 status with `INTERNAL_ERROR` code

**Rationale**: 
- Establishes consistent patterns for implementing new endpoints
- Ensures DTOs are always returned (with calculated status)
- Maintains clear separation between layers
- Follows Zod v4 best practices
- Makes follow-up implementations smoother and more predictable

---

## Typed Error Classes

**Date**: 2025-11-10  
**Decision**: Use typed error classes instead of string-based error message parsing.

**Error Class Hierarchy**:
```
AppError (base class)
├── ResourceNotFoundError (404)
├── ValidationError (400)
│   └── InvalidStatusTransitionError (400)
├── BulkOperationFailedError (400)
├── ConflictError (409)
│   └── FileLockTimeoutError (409)
└── InternalServerError (500)
    └── FileOperationError (500)
        ├── FileNotFoundError (500)
        ├── FileReadError (500)
        ├── FileWriteError (500)
        ├── FileParseError (500)
        └── InvalidFileFormatError (500)
```

**Location**: `src/errors/index.ts`

**Key Features**:
- All errors extend `AppError` base class
- Each error has: `code` (ErrorCode), `statusCode` (HTTP status), `message`, optional `details`
- Errors preserve original stack traces
- Type-safe error handling with `instanceof` checks

**Usage Pattern**:
```typescript
// Business layer throws typed errors
throw new ResourceNotFoundError("Todo", id);
throw new ValidationError("Due date cannot be in the past");
throw new InvalidStatusTransitionError("Cannot transition from 'due' to 'initial'");

// Error handler uses instanceof checks
if (err instanceof AppError) {
  res.status(err.statusCode).json({
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
    },
  });
}
```

**Rationale**: 
- Type safety: Compile-time checks instead of string matching
- Maintainability: No fragile string parsing in error handler
- Extensibility: Easy to add new error types
- Consistency: Standardized error structure across application
- Better debugging: Proper stack traces preserved

---

## Direct Error Throwing Pattern

**Date**: 2025-11-10  
**Decision**: All data layer methods throw errors directly instead of returning result objects.

**Previous Pattern (Deprecated)**:
```typescript
// ❌ DON'T USE: Result object pattern
async create(entity: TodoEntity): Promise<{ success: false; error: FileOperationError } | void> {
  const result = await this.fileStorage.writeFile(...);
  if (result && !result.success) {
    return result; // Error masking
  }
}
```

**Current Pattern (Use This)**:
```typescript
// ✅ USE: Direct error throwing
async create(entity: TodoEntity): Promise<void> {
  await this.fileStorage.writeFile(this.cache); // Throws on error
}

// Business layer - no result checking needed
async createTodo(input: CreateTodoInput): Promise<TodoDTO> {
  await this.cache.create(entity); // Errors bubble up naturally
  return this.entityToDTO(entity);
}
```

**Key Principles**:
1. **No Result Objects**: Methods return `void` or data directly, never `{ success: boolean, error?: ... }`
2. **Throw on Error**: All error conditions throw typed errors immediately
3. **No Error Masking**: Errors propagate with original types and messages
4. **No Result Checking**: Business layer doesn't check `if (result && !result.success)`
5. **Natural Error Bubbling**: Errors flow up the call stack without conversion

**File Storage Pattern**:
```typescript
// ✅ Throws typed errors directly
async readFile(): Promise<TodosFileContent> {
  try {
    await fs.access(this.filePath);
  } catch (error) {
    throw new FileNotFoundError(this.filePath);
  }
  // ... rest of implementation
}

// ✅ Throws on write failure
async writeFile(cache: TodosFileContent): Promise<void> {
  try {
    await fs.writeFile(this.filePath, jsonString, "utf-8");
  } catch (error) {
    throw new FileWriteError(
      error instanceof Error ? error.message : "Unknown error",
      this.filePath
    );
  }
}
```

**Cache Layer Pattern**:
```typescript
// ✅ Throws errors directly
async update(id: string, updates: Partial<TodoEntity>, preConditionCheck?: ...): Promise<void> {
  await this.withLock(async () => {
    if (!this.cache[id]) {
      throw new ResourceNotFoundError("Todo", id); // Direct throw
    }
    if (preConditionCheck) {
      preConditionCheck(this.cache); // Throws bubble up naturally
    }
    await this.commitCache(cacheCopy); // Throws on file write error
  });
}
```

**Business Layer Pattern**:
```typescript
// ✅ No result checking - errors bubble up
async updateTodo(input: UpdateTodoInput): Promise<TodoDTO> {
  await this.cache.update(input.id, updates, preConditionCheck); // Throws on error
  const updatedEntity = await this.cache.getById(input.id);
  return this.entityToDTO(updatedEntity);
}
```

**Rationale**: 
- **No Error Masking**: Original error types and messages preserved
- **Simpler Code**: No boilerplate result checking
- **Type Safety**: Typed errors instead of string matching
- **Better Debugging**: Original stack traces preserved
- **Consistent Pattern**: All layers use same error throwing approach

---

## PreConditionCheck Callback Pattern

**Date**: 2025-11-10  
**Decision**: Use `preConditionCheck` callbacks for validation within write locks.

**Purpose**: 
- Perform validation and reads within the write lock
- Ensure atomicity: validation and writes happen in single lock
- Allow business logic to validate cache state before mutations

**Signature**:
```typescript
preConditionCheck?: (cache: TodosCache) => void
```

**Usage in Cache Layer**:
```typescript
async update(
  id: string,
  updates: Partial<TodoEntity>,
  preConditionCheck?: (cache: TodosCache) => void
): Promise<void> {
  await this.withLock(async () => {
    // Check existence
    if (!this.cache[id]) {
      throw new ResourceNotFoundError("Todo", id);
    }

    // Run pre-condition check within lock (before any changes)
    if (preConditionCheck) {
      preConditionCheck(this.cache); // Throws on validation failure
    }

    // Apply changes
    const cacheCopy = this.createCacheCopy();
    cacheCopy[id] = { ...cacheCopy[id]!, ...updates, id };
    await this.commitCache(cacheCopy);
  });
}
```

**Usage in Business Layer**:
```typescript
async updateTodo(input: UpdateTodoInput): Promise<TodoDTO> {
  const preConditionCheck = (cache: TodosCache): void => {
    const existingEntity = cache[input.id];
    if (!existingEntity) {
      throw new ResourceNotFoundError("Todo", input.id);
    }

    // Validate status transition within lock
    if (input.status !== undefined && input.status !== existingEntity.status) {
      this.validateStatusTransition(existingEntity, input.status);
    }

    // Validate due date within lock
    if (input.dueDate !== undefined && input.dueDate !== null) {
      const currentDate = getCurrentDateUTC();
      if (input.dueDate < currentDate) {
        throw new ValidationError("Due date cannot be in the past");
      }
    }
  };

  await this.cache.update(input.id, updates, preConditionCheck);
  // ... rest of implementation
}
```

**Key Principles**:
1. **Within Lock**: Callback runs inside `withLock()`, ensuring atomicity
2. **Before Changes**: Validation happens before cache copy is created
3. **Throws on Failure**: Callback throws typed errors on validation failure
4. **No Masking**: Errors bubble up naturally without conversion
5. **Read from Cache**: Callback receives `TodosCache` to read current state

**Benefits**:
- **Atomicity**: All reads and writes happen within single lock
- **Consistency**: Validation uses current cache state (no race conditions)
- **Flexibility**: Business logic can implement complex validation
- **Error Propagation**: Validation errors bubble up with original types

**Rationale**: 
- Ensures validation and updates are atomic
- Prevents race conditions by validating within lock
- Allows business logic to validate cache state before mutations
- Maintains error type safety throughout the stack

---

