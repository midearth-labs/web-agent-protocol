# PRD Suggestions

## Accepted Suggestions (Incorporated in PRD v2.0)

The following suggestions have been accepted and added to the main PRD:

1. ✅ **Filtering and Sorting Capabilities**: Comprehensive filtering added (sorting excluded per feedback)
2. ✅ **Search Functionality**: Search by title and description keywords
3. ✅ **Bulk Operations**: Bulk status update and bulk delete
4. ✅ **Priority Levels**: Priority field added to todos
5. ✅ **Due Date Optional**: Due dates are now optional
6. ✅ **Status Transition Rules**: Clear rules defined
7. ✅ **Creation/Modification Timestamps**: Auto-tracked created at and modified at
8. ✅ **Partial Updates**: PATCH-style partial updates supported

---

## Rejected Suggestions

The following suggestions have been rejected and moved to Future Considerations:

1. ❌ **Pagination**: Rejected - moved to future considerations
2. ❌ **Archive Functionality**: Rejected - moved to future considerations
3. ❌ **Soft Delete**: Rejected - permanent deletion confirmed
4. ❌ **Tags and Categories**: Rejected - moved to future considerations

---

## New Suggestions for Consideration

### 1. Default Filter/View for Active Todos
**Suggestion**: Provide a convenient way to get "active" todos (status is initial or due, excluding complete)  
**Rationale**: Users frequently want to see only tasks they still need to work on. While filters can achieve this, a dedicated "active" view or convenient filter shorthand would improve usability.

**Potential implementation**:
- Built-in filter preset: `activeOnly=true`
- Or users simply use: `status.notEquals=complete`

**Answer**: REJECT
---

### 2. Todo Count Summary
**Suggestion**: Provide count statistics across status types  
**Rationale**: Users often want to know at a glance how many todos are in each status without retrieving the full list. This is valuable for dashboard displays and quick overview.

**Potential user story**:
- Get count of todos by status (e.g., 15 initial, 3 due, 47 complete)
- Get count by priority
- Get count by tag

**Answer**: REJECT
---

### 3. Sort by Created/Modified Timestamp
**Suggestion**: While sorting was excluded, consider allowing sort by timestamp fields  
**Rationale**: Sorting was generally rejected, but sorting by creation date (newest/oldest first) is extremely common and valuable for seeing recent activity. Modified timestamp sorting helps identify recently worked-on todos.

**Potential user story**:
- List todos ordered by created date (newest first)
- List todos ordered by modified date (most recently updated first)

**Answer**: REJECT
---

### 4. Batch Create
**Suggestion**: Allow creating multiple todos in a single operation  
**Rationale**: Users sometimes want to capture multiple tasks quickly (e.g., breaking down a project into tasks). Batch create reduces API round-trips and improves performance.

**Potential user story**:
- Create multiple todos in one request
- Receive confirmation with all created todo IDs
- Partial success handling similar to bulk operations

**Answer**: REJECT
---

### 5. Field-Specific Validation Messages
**Suggestion**: Return validation errors structured by field  
**Rationale**: When multiple validation errors occur (e.g., title too long AND due date in past), returning structured field-specific errors helps clients display appropriate error messages next to each form field.

**Example response structure**:
```
{
  "errors": {
    "title": "Title exceeds maximum length of 100 characters",
    "dueDate": "Due date cannot be in the past"
  }
}
```

**Answer**: ACCEPT, this also applies to Batch APIs
---

### 6. Clear All Completed Todos
**Suggestion**: Provide a convenient operation to delete all completed todos  
**Rationale**: Users often want to "clean up" their todo list by removing old completed items. While bulk delete can do this, it requires listing and selecting all completed todo IDs.

**Potential user story**:
- Delete all todos with status=complete in one operation
- Optionally with date range (e.g., completed before a certain date)

**Answer**: REJECT
---

### 7. Smart Dates
**Suggestion**: Support relative date filtering (e.g., today, tomorrow, this week, next week)  
**Rationale**: Users think in relative terms ("what's due today?"). While absolute dates work, relative date shortcuts improve usability.

**Potential enhancements**:
- Filter by: `dueDate=today`, `dueDate=tomorrow`, `dueDate=thisWeek`
- Calculate based on current date when query is executed

**Answer**: REJECT
---

### 8. Status History Flag
**Suggestion**: Track whether a todo was ever overdue  
**Rationale**: Even if a todo is later completed, knowing it was once overdue provides valuable insights about task management and planning accuracy. This is simpler than full history tracking.

**Potential implementation**:
- Boolean field: `wasOverdue`
- Set to true once a todo's status calculates to `due`
- Persists even after completion

**Answer**: REJECT
---

### 9. Required vs Optional Fields Clarity
**Suggestion**: Add explicit markers in all documentation for required vs optional fields  
**Rationale**: While validation rules specify this, having clear indication everywhere (data model, user stories, etc.) prevents confusion.

**Enhancement**: Update PRD to mark every field explicitly as (required) or (optional)

**Answer**: ACCEPT
---

### 10. Bulk Get by IDs
**Suggestion**: Allow retrieving multiple specific todos by their IDs in one request  
**Rationale**: When a client needs to refresh several specific todos (not all todos), fetching them individually is inefficient. Bulk get improves performance.

**Potential user story**:
- Retrieve multiple todos by providing a list of UUIDs
- Returns todos that exist, with clear indication of any IDs not found

**Answer**: REJECT
---

### 11. Due Date Warnings
**Suggestion**: Add a "dueSoon" calculated status or filter for approaching deadlines  
**Rationale**: Users want to know about tasks due soon (e.g., within next 3 days), not just overdue tasks. This is more actionable than only showing already-overdue items.

**Potential implementation**:
- New calculated status: `dueSoon` (e.g., due within 3 days)
- Or filter: `dueDate.within=3days`
- Configurable threshold?

**Note**: Adds complexity to status model, might conflict with current simple three-status design.

**Answer**: REJECT
---

### 12. Filter Validation and Error Messages
**Suggestion**: Validate filter parameters and provide clear error messages for invalid filters  
**Rationale**: Users might make mistakes in filter syntax, use invalid values, or combine incompatible filters. Clear validation helps them correct mistakes.

**Examples**:
- Invalid date format in dueDate filter
- Unknown field name in filter
- Invalid priority value
- Incompatible filter combinations

**Answer**: ACCEPT
---

### 13. Todo Templates
**Suggestion**: Allow saving todo configurations as templates for quick creation  
**Rationale**: Recurring similar tasks (e.g., weekly meeting prep, monthly reports) benefit from templates to avoid retyping same information.

**Potential user stories**:
- Save a todo as a template
- Create a new todo from a template
- List available templates

**Note**: This is relatively complex and might fit better in future considerations.

**Answer**: REJECT
---

### 14. Import/Export
**Suggestion**: Provide ability to export all todos (e.g., JSON format) and import them back  
**Rationale**: Users might want to backup their todos, migrate to another system, or share their todo list. Export/import facilitates this.

**Potential formats**:
- JSON (native format)
- CSV (for spreadsheet compatibility)

**Note**: Better suited for future considerations due to scope.

**Answer**: REJECT