# Additional HLD Clarifications - JSON Storage

**Version:** 1.0  
**Date:** November 10, 2025  
**Status:** Pending Answers

---

## Overview

These are additional clarifications that emerged after the decision to use JSON file storage instead of a relational database.

---

## Clarification 16: File Initialization

**Context:**  
When the application starts, the JSON file may not exist yet.

**Question:**  
Should the application automatically create an empty JSON file on startup if it doesn't exist, or should it require manual initialization?

**Options:**
- A) Auto-create empty file `{}` on startup
- B) Auto-create with metadata `{ "_metadata": { "version": "1.0", "created": "..." }, "todos": {} }`
- C) Require manual file creation (fail on missing file)
- D) Create on first write operation

**Recommendation:** Option A - Auto-create empty file (simplest, most user-friendly)

**Answer:** Option C

---

## Clarification 17: File Locking Strategy

**Context:**  
Multiple operations might need to access the file simultaneously.

**Question:**  
Should read operations also acquire locks, or only write operations?

**Options:**
- A) Lock on all operations (reads and writes) for consistency
- B) Lock only on write operations, allow concurrent reads
- C) Read-write locks (multiple readers, exclusive writer)

**Recommendation:** Option A - Lock on all operations (simpler, safer for single-user)

**Answer:** Option B. Load file at startup into memory, read memory version, mutate on copy of memory version, commit file and memory after mutation. Lock on all operations.

---

## Clarification 18: Lock Timeout Behavior

**Context:**  
If a file lock cannot be acquired within the timeout period, the operation fails.

**Question:**  
What should happen when a lock timeout occurs?

**Options:**
- A) Return 409 Conflict immediately
- B) Retry with exponential backoff
- C) Queue the request and process when lock is available
- D) Return 503 Service Unavailable

**Recommendation:** Option B - Retry with exponential backoff (more resilient)

**Answer:** Option B

---

## Clarification 19: Backup Strategy

**Context:**  
JSON file storage needs backup to prevent data loss.

**Question:**  
Should the application handle backups, or is it an operational concern?

**Options:**
- A) Application creates backup before each write
- B) Application creates periodic backups (time-based)
- C) External backup tool (out of application scope)
- D) Copy-on-write versioning

**Recommendation:** Option C - External backup (separation of concerns)

**Answer:** NOT_APPLICABLE

---

## Clarification 20: File Corruption Handling

**Context:**  
The JSON file could become corrupted (incomplete write, invalid JSON).

**Question:**  
How should the application handle a corrupted JSON file?

**Options:**
- A) Fail to start, require manual intervention
- B) Attempt to recover from backup automatically
- C) Start with empty state, log error
- D) Attempt to repair/fix the JSON

**Recommendation:** Option A - Fail to start (safest, prevents data loss)

**Answer:** Option A

---

## Clarification 21: File Size Limits

**Context:**  
The JSON file will grow as more todos are added.

**Question:**  
Should there be a maximum number of todos or file size limit?

**Options:**
- A) No limit (rely on filesystem limits)
- B) Hard limit (e.g., 10,000 todos or 10MB)
- C) Soft limit with warning (e.g., log warning at 5,000 todos)
- D) Automatic cleanup (delete old completed todos)

**Recommendation:** Option C - Soft limit with warning (graceful degradation)

**Answer:** Option A

---

## Clarification 22: Date Storage Format in JSON

**Context:**  
Dates can be stored as ISO 8601 strings or epoch timestamps in JSON.

**Question:**  
What format should be used for storing timestamps in the JSON file?

**Options:**
- A) ISO 8601 strings (e.g., "2025-11-10T10:00:00.000Z")
- B) Epoch milliseconds (e.g., 1699617600000)
- C) Separate date objects `{ date: "2025-11-10", time: "10:00:00" }`

**Recommendation:** Option A - ISO 8601 strings (human-readable, standard)

**Answer:** Option A

---

## Clarification 23: Atomic Write Implementation

**Context:**  
To prevent corruption, writes should be atomic (write to temp file, then rename).

**Question:**  
Where should the temporary file be created?

**Options:**
- A) Same directory as the main file (e.g., `todos.json.tmp`)
- B) System temp directory (e.g., `/tmp/todos-xxx.json`)
- C) Dedicated temp directory in application folder
- D) In-memory write, then flush to disk

**Recommendation:** Option A - Same directory (ensures atomic rename works)

**Answer:** Option D (In-memory temp write)

---

## Clarification 24: File Permissions

**Context:**  
The JSON file should have appropriate permissions for security.

**Question:**  
What file permissions should be set on the JSON file?

**Options:**
- A) 600 (read/write owner only)
- B) 644 (read/write owner, read others)
- C) 666 (read/write all)
- D) Use system defaults

**Recommendation:** Option A - 600 (most secure for single-user data)

**Answer:** Option D

---

## Clarification 25: Modified Timestamp Precision in File

**Context:**  
We decided on millisecond precision, but need to ensure consistency.

**Question:**  
Should the application round/truncate timestamps to ensure consistent precision?

**Options:**
- A) Always store with millisecond precision (3 decimal places)
- B) Store full precision from system clock
- C) Store second precision only
- D) Truncate to milliseconds on read

**Recommendation:** Option A - Always millisecond precision (consistent with API)

**Answer:** Option A

---

## Clarification 26: Filter Performance

**Context:**  
All filtering happens in-memory by loading the entire file.

**Question:**  
Should there be any optimizations for large datasets?

**Options:**
- A) No optimization, filter all todos every time
- B) Implement in-memory caching layer
- C) Add limit/pagination to filter results
- D) Warn when filtering takes too long

**Recommendation:** Option A - No optimization initially (YAGNI principle)

**Answer:** Option A

---

## Clarification 27: Concurrent Request Handling

**Context:**  
With file locking, only one request can execute at a time.

**Question:**  
How should queued requests be handled?

**Options:**
- A) Reject with 409 immediately if lock is held
- B) Queue requests with timeout
- C) Retry automatically with exponential backoff
- D) Return 503 Service Unavailable

**Recommendation:** Option C - Retry with backoff (better UX)

**Answer:** Option C

---

## Clarification 28: File Encoding

**Context:**  
JSON files should be UTF-8 encoded.

**Question:**  
Should the application validate file encoding on read?

**Options:**
- A) Yes, validate and reject non-UTF-8
- B) No, assume UTF-8 always
- C) Attempt to detect and convert
- D) Use BOM (Byte Order Mark) for detection

**Recommendation:** Option B - Assume UTF-8 (simpler, standard)

**Answer:** Option B

---

## Clarification 29: Empty vs. Missing Description/DueDate in JSON

**Context:**  
Optional fields can be null or omitted from JSON.

**Question:**  
How should optional null fields be stored in the JSON file?

**Options:**
- A) Store as `"description": null`
- B) Omit the field entirely from JSON
- C) Store as empty string `"description": ""`
- D) Either A or B is acceptable

**Recommendation:** Option A - Store as explicit null (clearer intent)

**Answer:** Option A

---

## Clarification 30: File Read Optimization

**Context:**  
List operations need to read the entire file every time.

**Question:**  
Should we implement any read optimization strategies?

**Options:**
- A) No optimization, read file every time
- B) Cache file content with TTL
- C) Watch file for changes and update cache
- D) Load file into memory on startup

**Recommendation:** Option A - No optimization initially (simpler)

**Answer:** Option D

---

## Summary

**Total New Clarifications:** 15 (16-30)  
**Category:** JSON File Storage Implementation  
**Status:** All pending answers  

**Next Steps:**  
Review these storage-specific clarifications and update the HLD with decisions.

