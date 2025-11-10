# HLD Changes Summary

**Version:** 1.1  
**Date:** November 10, 2025  
**Status:** Updated based on clarifications

---

## Overview

This document summarizes the major changes made to the High-Level Design based on the answers provided to clarifications and suggestions.

---

## Major Architecture Changes

### 1. Storage Layer: Database → JSON File Storage

**Original:** Relational database (PostgreSQL/MySQL/SQLite)  
**Updated:** JSON file storage with key-value structure

**Impact:**
- Complete redesign of data access layer
- File locking instead of database transactions
- In-memory filtering instead of SQL queries
- Atomic file operations using temp file + rename
- Single process deployment constraint

**Rationale:** Simplified deployment and management for single-user system

---

### 2. API Filter Format Change

**Original:** Nested query parameters  
Example: `?status.equals=initial&priority.notEquals=low`

**Updated:** Colon-separated comparator format  
Example: `?status=equals:initial&priority=notEquals:low`

**Impact:**
- Simpler query parameter parsing
- One filter value per field (prevents logical contradictions)
- Updated API models and validation schemas

**Rationale:** Clearer syntax, prevents impossible filter combinations

---

### 3. Concurrency Model Enhancement

**Original:** Last-write-wins with database handling conflicts

**Updated:** File locking with conflict detection
- Bulk operations fail with 409 Conflict if lock cannot be acquired
- Retry mechanism with exponential backoff
- Lock timeout: 5 seconds

**Impact:**
- Added 409 Conflict status code
- Updated bulk operation transaction flow
- New error codes: CONFLICT, FILE_LOCK_TIMEOUT

**Rationale:** Better error handling and conflict awareness for file-based storage

---

## Specific Design Decisions Applied

### Clarification Answers Implemented

1. **Modified At Behavior** → Only update on actual changes
2. **Timezone** → UTC for all date calculations
3. **Filter Format** → `fieldname=comparator:value` (single filter per field)
4. **Bulk Validation** → Validate all items first, report all errors
5. **Empty Update Body** → Return 400 validation error
6. **Clear Optional Fields** → Use `null` to clear description and dueDate
7. **Status Updates** → Single PATCH endpoint (no separate status endpoint)
8. **Case Sensitivity** → Database default (implementation detail)
9. **Concurrent Bulk Ops** → Fail with conflict error (Option B)
10. **Title Validation** → Require at least one non-whitespace character
11. **Storage Choice** → JSON filesystem storage
12. **Error Format** → Same format for bulk and single operations
13. **API Versioning** → URL versioning (/api/v1, /api/v2)
14. **Timestamp Precision** → Millisecond precision (ISO 8601)

---

## Accepted Suggestions

### Implemented in HLD:

1. **Structured Logging** ✅
   - JSON format with correlation IDs
   - Essential for production

2. **Request ID Tracking** ✅
   - X-Request-ID header
   - End-to-end tracing

3. **OpenAPI Documentation** ✅
   - Generate from Zod schemas
   - Interactive API docs

4. **Input Sanitization** ✅
   - Trim whitespace
   - Remove control characters

5. **Validation Middleware** ✅
   - Reusable Zod validation
   - Consistent error responses

6. **Integration Tests** ✅
   - Test all endpoints
   - Critical for quality

7. **Repository Pattern** ✅
   - Abstract file operations
   - Easier testing

8. **Batch Query Optimization** ✅
   - Efficient bulk operations
   - Reduced file I/O

### Deferred to Future:

- Request/response compression
- ETag support
- Health check endpoints
- Rate limiting
- Database transactions (N/A for file storage)
- Soft delete support
- Environment-based configuration
- CORS configuration
- Metrics and monitoring
- Graceful shutdown

### Not Applicable:

- Prepared statements (no SQL)
- Connection pooling (no database)
- Index strategy (no database)
- Database migrations (file-based)

---

## Updated HLD Sections

### Section 2: Architecture
- Changed from database to JSON file storage
- Updated component diagrams
- Added file locking and concurrency control
- UTC timezone specification

### Section 3: API Design
- Updated filter format in all endpoints
- Added 409 Conflict status code
- Changed query parameter examples
- Updated filter validation rules

### Section 4: Data Design
- Replaced database schema with JSON file structure
- Added file operations specifications
- Defined atomic write strategy
- Added concurrency control details

### Section 5: Business Logic
- Updated bulk operation flow with file locking
- Added validation-first approach
- Updated transaction flow diagrams

### Section 6: Data Flow
- Changed database calls to file operations
- Added lock acquisition/release steps
- Updated sequence diagrams

### Section 8: Technology Considerations
- Replaced database comparison with file storage considerations
- Added file locking library recommendations
- Updated technology stack

### Section 9: Deployment
- Added persistent volume requirements
- Single instance constraint due to file locking
- Updated deployment diagram

---

## New Files Created

### 1. hld.clarification.new.md
**15 Additional Clarifications** for JSON storage:
- File initialization strategy
- File locking strategy
- Lock timeout behavior
- Backup strategy
- File corruption handling
- File size limits
- Date storage format
- Atomic write implementation
- File permissions
- And 6 more...

### 2. hld.suggestions.new.md
**25 Additional Suggestions** for JSON storage:
- File integrity checks
- Write-ahead logging
- File versioning
- In-memory cache
- File compression
- Structured file format
- File validation on startup
- Smart retry logic
- And 17 more...

---

## Updated Model Files

### api-model.ts Changes:
1. Updated filter schemas to use comparator:value format
2. Added regex validation for new filter format
3. Added helper function `parseFilterParam`
4. Added new error codes: CONFLICT, FILE_LOCK_TIMEOUT
5. Updated query parameter models

### db-model.ts Changes:
1. Replaced database types with file storage types
2. Added `TodosFileContent` type for JSON structure
3. Added `FileOperationResult` and `FileOperationError` types
4. Replaced database config with `FileStorageConfig`
5. Added file error codes
6. Added default file paths constants
7. Removed database-specific types (rows, columns, indexes)

---

## Breaking Changes

### For Implementation Teams:
1. ❌ No database setup required
2. ❌ No SQL queries or ORM
3. ✅ Must implement file locking mechanism
4. ✅ Must handle atomic file writes
5. ✅ Filter parsing logic needs updating
6. ✅ Concurrency handling changes

### For API Consumers:
1. Filter format change (backward incompatible)
   - Old: `?status.equals=initial`
   - New: `?status=equals:initial`
2. New 409 Conflict status code for concurrent operations
3. Single filter per field constraint

---

## Pending Clarifications

### Still Need Answers For:
- 15 new clarifications about JSON storage implementation
- 25 new suggestions to prioritize

**Files:**
- `hld.clarification.new.md` - Questions 16-30
- `hld.suggestions.new.md` - Suggestions 26-50

---

## Next Steps

1. **Review New Clarifications** (hld.clarification.new.md)
   - File initialization
   - Locking strategy
   - Backup approach
   - And 12 more questions

2. **Prioritize New Suggestions** (hld.suggestions.new.md)
   - File integrity checks
   - File versioning
   - In-memory cache
   - And 22 more suggestions

3. **Update PRD** (if needed)
   - Clarification #8 asks if PRD needs updating for single endpoint approach
   - Consider documenting storage choice in PRD assumptions

4. **Begin Implementation**
   - Focus on accepted suggestions
   - Use updated models (api-model.ts, db-model.ts)
   - Follow architectural patterns in HLD

---

## Risk Assessment

### Low Risk:
- ✅ Filter format change (validated in models)
- ✅ Timestamp precision (clearly specified)
- ✅ Conflict handling (well-defined)

### Medium Risk:
- ⚠️ File locking implementation (platform-specific)
- ⚠️ Atomic writes (must be robust)
- ⚠️ Concurrent access handling (complex)

### High Risk:
- 🔴 File corruption scenarios (need backup strategy)
- 🔴 Performance with large datasets (need testing)
- 🔴 Single instance constraint (deployment limitation)

### Mitigation Strategies:
1. Use battle-tested file locking libraries
2. Implement robust error handling and logging
3. Add file validation on startup
4. Document performance limits clearly
5. Plan migration path to database if needed

---

## Compatibility Notes

### Backward Compatibility:
- ❌ Filter format is breaking change
- ❌ Storage format incompatible with previous design
- ✅ API endpoints remain the same
- ✅ Response format unchanged
- ✅ Status codes mostly unchanged (added 409)

### Forward Compatibility:
- ✅ JSON format is extensible
- ✅ Version field can be added for migrations
- ✅ Can migrate to database later
- ✅ API versioning strategy in place

---

## Documentation Updates Needed

1. Update API documentation with new filter format
2. Document file storage requirements
3. Add deployment guide for persistent volumes
4. Document backup and recovery procedures
5. Add troubleshooting guide for file locking issues
6. Create migration guide from v1 to v2 (if applicable)

---

## Summary Statistics

- **Total Clarifications Answered:** 15
- **Total Suggestions Reviewed:** 25
- **Accepted Suggestions:** 8
- **Deferred Suggestions:** 12
- **Not Applicable:** 5
- **New Clarifications Added:** 15
- **New Suggestions Added:** 25
- **Files Updated:** 3 (hld.md, api-model.ts, db-model.ts)
- **Files Created:** 3 (CHANGES.md, hld.clarification.new.md, hld.suggestions.new.md)
- **Breaking Changes:** 2 (filter format, storage layer)

---

**Document Status:** ✅ Complete  
**HLD Status:** 🔄 Updated - Pending additional clarifications  
**Ready for Implementation:** ⚠️ After reviewing new clarifications

