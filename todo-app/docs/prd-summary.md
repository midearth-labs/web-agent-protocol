# PRD Summary - Todo Management Application

**Version:** 2.0  
**Status:** ✅ Complete - Ready for Technical Design  
**Date:** November 10, 2025

---

## Overview

This is a backend-focused, single-user Todo Management Application that enables users to create, update, filter, and manage their tasks with automatic overdue tracking and priority management.

---

## Key Features (10 User Stories)

### Core Operations
1. **Create Todo** - With title, description, priority (defaults to "medium"), and due date
2. **Update Todo** - Partial updates supported with field-specific validation
3. **Change Status** - Between initial and complete (due is auto-calculated)
4. **Delete Todo** - Permanent deletion, no recovery
5. **List and Filter Todos** - Comprehensive filtering with AND logic
6. **View Todo** - Get complete details of a specific todo

### Advanced Features
7. **Automatic Status Calculation** - Overdue todos automatically show as "due" status
8. **Bulk Update Status** - Atomic operation (all-or-nothing), max 100 todos
9. **Bulk Delete** - Atomic operation (all-or-nothing), max 100 todos
10. **Priority Management** - Four levels with default handling

---

## Data Model

Each todo consists of:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| ID | UUID | Yes | System-generated, immutable |
| Title | String (100) | Yes | User-provided |
| Description | String (1000) | No | User-provided, optional |
| Status | Enum | Yes | System-managed: initial, complete, due |
| Due Date | Date | No | YYYY-MM-DD format, cannot be past |
| Priority | Enum | Yes | low, medium (default), high, urgent |
| Created At | Timestamp | Yes | System-generated, immutable |
| Modified At | Timestamp | Yes | Auto-updated on actual changes |

---

## Key Business Rules

### Status Management
- **Initial**: Default status on creation, user can set
- **Complete**: User can set, indicates task finished
- **Due**: Auto-calculated (cannot be manually set), shown when due date passed and status is initial
- Stored status never changes to "due" automatically - calculated on-demand
- Filtering works on calculated status

### Priority Management
- Values: low, medium, high, urgent (in priority order)
- Default: "medium" if not specified on creation
- Required: Must always have a value, cannot be cleared
- Optional in API: User doesn't have to provide on creation

### Status Transitions
- Allowed: initial ↔ complete, due → complete
- Not Allowed: due → initial (when due date is in past)

### Validation Rules
- Title: Required, max 100 characters
- Description: Optional, max 1000 characters
- Due Date: Optional, YYYY-MM-DD format, cannot be past date
- Priority: Required in model, defaults to "medium", must be valid value
- Modified At: Only updated on successful operations with actual changes

---

## Filtering Capabilities

Users can filter by:
- **Status**: equals, notEquals
- **Priority**: equals, notEquals (values: low, medium, high, urgent)
- **Due Date**: dueDateBefore, dueDateAfter (format: YYYY-MM-DD, can be used independently or together for range filtering)
- **Title**: contains, notContains (case-insensitive)
- **Description**: contains, notContains (case-insensitive)

**Filter Logic**: All filters combined with AND (all must match). Due date filters can be used together to create a date range.

---

## Bulk Operations

### Characteristics
- **Atomic**: All or nothing - if any item fails, entire operation rolls back
- **Limit**: Maximum 100 todos per operation
- **Error Handling**: Field-specific error messages if any item fails
- **Operations**: Bulk Update Status, Bulk Delete

---

## Error Handling

- **Field-Specific**: Errors clearly indicate which field failed validation
- **Detailed**: Include explanation of what went wrong
- **Guidance**: Provide direction on how to fix the issue
- **Applies To**: All operations including bulk and filters

---

## Technical Specifications

### Date Format
- **Format**: YYYY-MM-DD (ISO 8601)
- **Type**: Date only, no time component
- **Timezone**: Not applicable (date only)

### Concurrency
- **Model**: Last-write-wins
- **No Locking**: No optimistic or pessimistic locking

### Identifiers
- **Format**: UUID (universally unique identifier)
- **Generation**: System-generated on creation

### Constraints
- **Uniqueness**: No uniqueness constraints on any field
- **Relationships**: Todos are independent, no relationships

---

## Out of Scope (Current Version)

The following are explicitly NOT included in v2.0:

### Architecture
- Frontend user interface
- User authentication and authorization
- Multi-user support
- Sharing or collaboration

### Features
- Tags and categories
- Pagination
- Sorting
- Search (covered by filtering)
- Soft delete / Archive
- Batch create
- Count summaries
- Relative dates ("today", "tomorrow")
- Status history
- Templates
- Import/Export
- Notifications

---

## Future Considerations

All rejected suggestions and out-of-scope items have been documented in Section 9 of the main PRD for potential future releases.

---

## Success Metrics

### User Engagement
- Number of todos created
- Frequency of status updates
- Ratio of completed to created todos
- Usage of filtering features
- Usage of bulk operations
- Distribution of priority usage

### System Performance
- Time to create a todo
- Time to retrieve filtered todo list
- Time to update a todo
- Time to execute bulk operations
- Filter validation response time

### User Value
- Percentage of todos marked as complete
- Average time between todo creation and completion
- Number of overdue todos
- Percentage of todos with priorities assigned

---

## Assumptions

1. Single-user system (all todos belong to one implicit user)
2. Backend-only (client application to be developed separately)
3. System maintains accurate date information
4. Todos are independent (no relationships)
5. Sufficient storage available
6. Dates in YYYY-MM-DD format
7. System clock is accurate for overdue calculation
8. Last-write-wins concurrency
9. Field-specific errors acceptable (no security concerns)
10. AND logic for filter combinations
11. Filter validation with clear guidance
12. Priority always has a value (defaults to "medium")
13. Atomic bulk operations (max 100 items)
14. No uniqueness constraints
15. Case-insensitive string filters
16. Stored status never auto-updates to "due"

---

## Document Status

### Completed
✅ Problem definition and user identification  
✅ Value proposition  
✅ Product scope definition  
✅ User stories with acceptance criteria (10 stories)  
✅ Data model specification  
✅ Business rules and validation  
✅ All clarifications resolved (12/12)  
✅ All suggestions reviewed (11 accepted, 15 rejected)  
✅ Success metrics defined  
✅ Assumptions documented  

### Next Steps
→ Technical design phase  
→ API specification  
→ Implementation planning  

---

## Notes

- Filter operator syntax is deferred to technical design (implementation detail)
- No new clarifications identified
- PRD is complete and stable for technical design to begin

