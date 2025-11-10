# HLD Clarifications - Todo Management Application

**Version:** 1.0  
**Date:** November 10, 2025  
**Status:** Pending Answers

---

## Overview

This document contains questions that arose during the technical design phase that require product or business decisions. Each clarification includes context, the specific question, and a space for the answer.

---

## Clarification 1: Modified At Update Behavior

**Context:**  
The PRD states that `modifiedAt` should only update on "successful operations with actual changes." This leaves ambiguity about what constitutes an "actual change."

**Question:**  
If a user updates a todo with the exact same values (e.g., PATCH with `title: "Same Title"` when the title is already "Same Title"), should the `modifiedAt` timestamp be updated?

**Options:**
- A) Yes, update `modifiedAt` on any update request, even if values don't change
- B) No, only update `modifiedAt` if at least one field value actually changes
- C) Update `modifiedAt` only for certain fields (e.g., update for title/description but not for status)

**Recommendation:** Option B - Only update if actual changes occur (more intuitive and accurate)

**Answer:** Option B

---

## Clarification 2: Due Date Time Zone Handling

**Context:**  
The PRD specifies date-only format (YYYY-MM-DD) without time zones. For the "overdue" calculation, we need to determine "today's date."

**Question:**  
What timezone should be used for determining "today" when calculating overdue status?

**Options:**
- A) Server's local timezone
- B) UTC
- C) User-configurable (requires extending data model)
- D) Defer to implementation (use server timezone, document the behavior)

**Recommendation:** Option B - UTC (consistent, unambiguous, standard for backend systems)

**Answer:** Option B

---

## Clarification 3: Filter Validation vs. Empty Results

**Context:**  
When filtering, some combinations might be logically impossible (e.g., `status.equals=complete` AND `status.equals=initial`).

**Question:**  
Should the API return an empty result set or return a validation error for logically impossible filter combinations?

**Options:**
- A) Return empty results (treat as valid query that matches nothing)
- B) Return 400 validation error for impossible combinations
- C) Return empty results but include a warning in response metadata

**Recommendation:** Option A - Return empty results (simpler, more flexible for clients)

**Answer:** Should only be able to set one filter value for a field. So, like {fieldname}={comparator}:{value} where comparator is one of the valid comparators for the field.

---

## Clarification 4: Bulk Operation Partial Success Reporting

**Context:**  
Bulk operations are atomic (all-or-nothing). When a bulk operation fails, we need to determine how much detail to provide.

**Question:**  
When a bulk operation fails, should the error response indicate which specific item(s) caused the failure, or just that the operation failed as a whole?

**Options:**
- A) Report only that the operation failed with general error message
- B) Report the first item that caused failure
- C) Validate all items first and report all validation errors before executing
- D) Execute until first failure, then report that specific failure

**Recommendation:** Option C - Validate all items first and report all errors (most helpful for clients)

**Answer:** Option C 

---

## Clarification 5: Update with No Fields Provided

**Context:**  
The PRD states partial updates are supported. The API model currently requires at least one field.

**Question:**  
If a PATCH request is sent with an empty body `{}` or only whitespace, what should the behavior be?

**Options:**
- A) Return 400 error: "At least one field must be provided"
- B) Return 200 with unchanged todo (no-op)
- C) Update `modifiedAt` timestamp and return 200

**Recommendation:** Option A - Return validation error (more explicit, prevents confusion)

**Answer:** Option A

---

## Clarification 6: Nullable Description Clearing

**Context:**  
Description is optional. The PRD says it can be updated or "cleared."

**Question:**  
How should a client clear the description field in an update request?

**Options:**
- A) Send `description: null` in the JSON body
- B) Send `description: ""` (empty string)
- C) Both null and empty string clear the description
- D) Omit the field (but this means "don't update")

**Recommendation:** Option A - Use `null` to explicitly clear (aligns with data model)

**Answer:** Option A

---

## Clarification 7: Due Date Clearing

**Context:**  
Due date is optional. Similar to description, we need to clarify how to clear it.

**Question:**  
How should a client clear the due date field in an update request?

**Options:**
- A) Send `dueDate: null` in the JSON body
- B) Send `dueDate: ""` (empty string)
- C) Both null and empty string clear the due date
- D) Separate endpoint or flag to clear due date

**Recommendation:** Option A - Use `null` to explicitly clear (consistent with description)

**Answer:** Option A

---

## Clarification 8: Status Change vs. General Update

**Context:**  
The PRD has both "Update Todo" (Story 2) and "Change Status" (Story 3) as separate stories, but the Update endpoint can also change status.

**Question:**  
Is a separate "Change Status" endpoint needed, or is changing status via the general PATCH /todos/:id endpoint sufficient?

**Options:**
- A) Single endpoint: PATCH /todos/:id handles all updates including status
- B) Two endpoints: PATCH /todos/:id for general updates, PUT/PATCH /todos/:id/status for status changes
- C) Two endpoints with different validation rules

**Recommendation:** Option A - Single endpoint is simpler and sufficient (status is just another field)

**Answer:** Option A, would we need to update the PRD to match this new knowledge

---

## Clarification 9: Filter Case Sensitivity

**Context:**  
PRD states string filters (title, description) are case-insensitive. This is clear for English, but ambiguous for Unicode.

**Question:**  
Should case-insensitive filtering handle Unicode characters (e.g., Turkish İ/i) or only ASCII?

**Options:**
- A) ASCII only (simpler, faster)
- B) Full Unicode case folding (more correct, complex)
- C) Database default behavior (implementation-dependent)

**Recommendation:** Option C - Database default (typically locale-aware, implementation detail)

**Answer:** Option C

---

## Clarification 10: Concurrent Bulk Operations

**Context:**  
PRD specifies last-write-wins for concurrency. For bulk operations on overlapping sets of todos, behavior is undefined.

**Question:**  
If two bulk operations target the same todo simultaneously, what should happen?

**Options:**
- A) Last transaction to commit wins (database-level race)
- B) Second operation fails with conflict error
- C) Current behavior is acceptable (no change needed)

**Recommendation:** Option A - Database handles it naturally with last-write-wins

**Answer:** Option B

---

## Clarification 11: Empty String vs. Null in Required Fields

**Context:**  
Title is required. Need to clarify if empty string is acceptable or if it must have content.

**Question:**  
Is an empty string `""` acceptable for the title field, or must it contain at least one non-whitespace character?

**Options:**
- A) Allow empty string (length > 0 but can be "")
- B) Require at least one character after trimming whitespace
- C) Require at least one non-whitespace character

**Recommendation:** Option C - At least one non-whitespace character (most meaningful)

**Answer:** Option C

---

## Clarification 12: Database Choice

**Context:**  
The HLD recommends PostgreSQL but notes alternatives. This affects schema syntax and features.

**Question:**  
Is there a preference or requirement for a specific database system?

**Options:**
- A) PostgreSQL (recommended in HLD)
- B) SQLite (simpler for single-user)
- C) MySQL/MariaDB
- D) Implementation team decides

**Recommendation:** Option D - Let implementation team decide based on deployment environment

**Answer:** JSON filesystem storage, a json file with key (UUID), and value: Todo

---

## Clarification 13: Error Response Format for Bulk Operations

**Context:**  
Bulk operations can have multiple validation errors across multiple items.

**Question:**  
Should the error response format for bulk operations differ from single-item operations?

**Options:**
- A) Same format: `details` array contains all errors from all items
- B) Different format: Group errors by item ID
- C) Stop at first error and return only that one

**Recommendation:** Option A - Same format, `details` array is sufficient and consistent

**Answer:** Option A 

---

## Clarification 14: API Versioning Strategy

**Context:**  
The base path is `/api/v1`. Need to clarify versioning approach for future changes.

**Question:**  
What is the versioning strategy if breaking changes are needed in the future?

**Options:**
- A) URL versioning (/api/v2)
- B) Header versioning (Accept: application/vnd.todo.v2+json)
- C) Not defined yet (decide when needed)

**Recommendation:** Option A - URL versioning (simplest, most visible)

**Answer:** Option A

---

## Clarification 15: Timestamp Precision

**Context:**  
The PRD specifies timestamps for `createdAt` and `modifiedAt`, but not the precision.

**Question:**  
What precision should be used for timestamps?

**Options:**
- A) Millisecond precision (typical for APIs)
- B) Microsecond precision (database default)
- C) Second precision (sufficient for this use case)

**Recommendation:** Option A - Millisecond precision (ISO 8601 standard)

**Answer:** Option A

---

## Summary

**Total Clarifications:** 15  
**Status:** All pending answers  

**Next Steps:**  
Once answers are provided, update the HLD document with the decisions and remove ambiguities from the implementation plan.

