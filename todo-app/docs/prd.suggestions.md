# PRD Suggestions

## Enhancements for Consideration

### 1. Filtering and Sorting Capabilities
**Suggestion**: Add the ability to filter and sort the todo list  
**Rationale**: When users accumulate many todos, viewing all of them without organization becomes overwhelming. Filtering by status (showing only `initial`, `complete`, or `due` todos) would help users focus on what matters most. Sorting by due date would help prioritize urgent tasks.

**Potential user stories:**
- Filter todos by status
- Sort todos by due date (ascending/descending)
- Sort todos by creation date
- Filter todos by date range

**Response:** ACCEPT, specific filters have been added to "prd.clarification.md". Do not include sorting. 
---

### 2. Search Functionality
**Suggestion**: Enable searching todos by title or description keywords  
**Rationale**: As the todo list grows, users need a quick way to find specific tasks without scanning through the entire list. Search would dramatically improve usability for active users.

**Potential user story:**
- Search todos by keyword in title or description

**Response:** ACCEPT, specific filters have been added to "prd.clarification.md". 
---

### 3. Pagination
**Suggestion**: Implement pagination for the list todos operation  
**Rationale**: If a user creates hundreds or thousands of todos, returning all of them in a single response could cause performance issues. Pagination would improve response times and reduce data transfer.

**Potential user story:**
- Retrieve todos in pages of configurable size (e.g., 20, 50, 100 per page)

**Response:** REJECT 
---

### 4. Bulk Operations
**Suggestion**: Allow users to perform operations on multiple todos at once  
**Rationale**: Users often need to perform the same action on multiple items (e.g., marking several todos as complete, deleting multiple old todos). Bulk operations would save time and reduce API calls.

**Potential user stories:**
- Mark multiple todos as complete in one operation
- Delete multiple todos in one operation
- Update status for multiple todos

**Response:** ACCEPT
---

### 5. Priority Levels
**Suggestion**: Add a priority field to todos (e.g., low, medium, high, urgent)  
**Rationale**: Not all tasks are equally important. Priority levels would help users focus on high-impact work even when many tasks have similar due dates.

**Potential user story:**
- Assign priority level when creating or updating a todo
- Sort or filter todos by priority

**Response:** ACCEPT
---

### 6. Archive Functionality
**Suggestion**: Instead of deleting completed todos, allow users to archive them  
**Rationale**: Users may want to maintain a history of completed work for reference, reporting, or motivation. Archiving provides this benefit while keeping the active list clean. Archived todos wouldn't appear in the standard list view.

**Potential user stories:**
- Archive completed todos
- View archived todos separately
- Restore archived todos to active list

**Response:** REJECT
---

### 7. Todo Categories or Tags
**Suggestion**: Enable users to organize todos with categories or tags  
**Rationale**: Users often manage tasks across different areas of life (work, personal, health, etc.). Categories or tags would allow better organization and the ability to focus on specific contexts.

**Potential user stories:**
- Assign one or more tags/categories to a todo
- Filter todos by category or tag
- View all available categories/tags

**Response:** ACCEPT
---

### 8. Due Date Optional
**Suggestion**: Consider making due date optional rather than required  
**Rationale**: Not all todos have hard deadlines. Some tasks are ongoing, future possibilities, or general reminders without specific timeframes. Making due date optional would accommodate these use cases while maintaining the automatic `due` status functionality for todos that do have due dates.

**Impact on automatic status:**
- Todos without due dates would never automatically become `due`
- Only todos with due dates would have automatic status updates

**Response:** ACCEPT, specific behaviour has been defined in "prd.clarification.md". 
---

### 9. Status Transition Rules
**Suggestion**: Define clear rules about which status transitions are allowed  
**Rationale**: Some status changes might not make logical sense (e.g., going from `complete` back to `initial` might indicate data quality issues). Defining allowed transitions would maintain data integrity.

**Example rules:**
- `initial` can transition to `complete` or remain `initial`
- `due` can transition to `complete` or remain `due`
- `complete` can only remain `complete` (or perhaps transition back to `initial` with clear intent)

**Response:** ACCEPT, all transitions can happen except those disallowed as clarified in "prd.clarification.md"
---

### 10. Soft Delete
**Suggestion**: Implement soft delete instead of permanent deletion  
**Rationale**: Users sometimes delete todos accidentally. Soft delete (marking as deleted but retaining data) allows recovery while still removing items from normal views. A permanent deletion could be performed after a retention period.

**Potential user stories:**
- Deleted todos move to a "trash" state
- View deleted todos within a retention period
- Restore deleted todos
- Permanently delete after retention period expires

**Response:** REJECT 
---

### 11. Creation and Modification Timestamps
**Suggestion**: Automatically track when each todo is created and last modified  
**Rationale**: Timestamps provide valuable context (when was this task added?), enable sorting by recency, and support audit trails. This metadata is valuable for analytics and user insights.

**Data to track:**
- Created timestamp
- Last modified timestamp
- Possibly: created by, modified by (for future multi-user scenarios)

**Response:** ACCEPT 
---

### 12. Partial Updates
**Suggestion**: Clarify whether updates must include all fields or support partial updates  
**Rationale**: In the current PRD, it's unclear if users must provide all fields when updating or if they can update just one field (e.g., only the title). Partial updates are more user-friendly but require clear specification.

**Recommendation**: Support partial updates where only specified fields are modified

**Response:** ACCEPT 
