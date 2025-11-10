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
- Uses `INVALID_FORMAT` error code for "not found" cases (since FileErrorCode doesn't have NOT_FOUND)
- Read operations are lock-free (optimized for performance in single-user MVP)
- Write operations use lock with exponential backoff retry
- File must exist before startup (manual initialization required)
- In-memory write (no temp file) per HLD clarification

**Rationale**: 
- Lock-free reads optimize performance for single-user MVP (no concurrent write conflicts during reads)
- Write operations remain atomic with copy-on-write pattern
- Type-safe error handling with proper TypeScript types
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

