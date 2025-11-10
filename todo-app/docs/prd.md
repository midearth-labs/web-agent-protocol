# Product Requirements Document (PRD)
## Todo Management Application

**Version:** 2.0  
**Date:** November 10, 2025  
**Focus:** Backend API (Single-User System)

---

## 1. Problem Statement

Individuals and teams struggle to keep track of their tasks and commitments effectively. Without a structured system, tasks can be forgotten, deadlines missed, and priorities unclear. People need a reliable way to capture, organize, and manage their todos with clear visibility into what needs to be done and when.

---

## 2. Target Users

### Primary Users
- **Individual Professionals**: People who need to manage personal work tasks and deadlines
- **Students**: Individuals tracking assignments, projects, and academic commitments
- **Personal Users**: Anyone looking to organize daily tasks and personal goals

### User Characteristics
- Need to capture tasks quickly and efficiently
- Want to track task status and progress
- Need reminders about approaching or overdue tasks
- Desire a simple, straightforward task management system
- May access the system multiple times throughout the day

---

## 3. Value Proposition

The Todo Management Application provides a simple, reliable backend system for capturing and managing tasks. Users can:
- Never lose track of what needs to be done
- Automatically know when tasks become overdue
- Easily update and manage task information
- Maintain a clear overview of all their commitments
- Focus on execution rather than task tracking logistics

---

## 4. Product Scope

### In Scope (Backend API)
- Creating new todos with relevant details
- Updating existing todo information (partial updates supported)
- Changing todo status
- Deleting todos permanently
- Listing and filtering todos with comprehensive filter options
- Viewing individual todo details
- Automatic status tracking for overdue items
- Priority management with default values
- Bulk operations on multiple todos (atomic, all-or-nothing)
- Automatic timestamp tracking
- Field-specific validation with detailed error messages

### Out of Scope (Current Version)
- Frontend user interface
- User authentication and authorization
- Sharing or collaboration features
- Notifications or reminders
- File attachments
- Comments or notes

---

## 5. Core Features

### 5.1 Todo Data Model
Each todo consists of:
- **ID**: Unique identifier (UUID format, required)
- **Title**: A brief name or description of the task (maximum 100 characters, required)
- **Description**: Detailed information about the task (maximum 1000 characters, optional)
- **Status**: Current state of the todo (system-managed, required)
  - `initial`: Newly created or in-progress (default on creation)
  - `complete`: Task has been finished
  - `due`: Task deadline has passed and task is not complete (automatically set, cannot be manually set by user)
- **Due Date**: The deadline by which the task should be completed (date only, no time component, optional, cannot be set to past dates)
- **Priority**: Importance level of the task (required)
- **Created At**: Timestamp when the todo was created (automatically set)
- **Modified At**: Timestamp when the todo was last updated (automatically updated)

### 5.2 Core Operations
1. **Create Todo**: Add a new todo to the system
2. **Update Todo**: Modify information for an existing todo (supports partial updates)
3. **Change Status**: Update the status of a todo
4. **Delete Todo**: Permanently remove a todo from the system
5. **List and Filter Todos**: Retrieve todos with comprehensive filtering options
6. **View Todo**: Get details of a specific todo
7. **Bulk Update Status**: Change status for multiple todos at once (atomic operation)
8. **Bulk Delete**: Delete multiple todos at once (atomic operation)

### 5.3 Automatic Status Management
The system automatically calculates todo status on-demand (when viewing or listing):
- When the current date is after the due date and the todo status is `initial`, the status is calculated as `due`
- Todos without due dates never transition to `due` status
- Status of `complete` todos never changes to `due`, regardless of due date
- Status is calculated dynamically; the stored status value is only updated when the user explicitly changes it
- Users cannot manually set status to `due` - this status is exclusively system-calculated

### 5.4 Status Transition Rules
The following status transitions are allowed:
- `initial` → `complete`
- `initial` → `initial` (no change)
- `complete` → `initial` (reopening a completed task)
- `complete` → `complete` (no change)
- `due` → `complete`
- `due` → `due` (no change)
- **Not allowed**: `due` → `initial` when the due date is in the past (system prevents this)

### 5.5 Filtering Capabilities
Users can filter todos by:
- **Status**: Equality and negation filters (equals, notEquals)
- **Priority**: Equality and negation filters (equals, notEquals) - valid values: low, medium, high, urgent
- **Due Date**: Range filters (before, after) and negation (notBefore, notAfter) - format: YYYY-MM-DD
- **Title**: Contains/like filters and negation (contains, notContains) - case-insensitive
- **Description**: Contains/like filters and negation (contains, notContains) - case-insensitive

**Filter Combination Logic**: All filters are combined using AND logic (all filters must match)

### 5.6 Validation Rules
- **ID**: Required (system-generated UUID), cannot be set by user
- **Title**: Required, maximum 100 characters
- **Description**: Optional, maximum 1000 characters
- **Due Date**: Optional, must not be in the past (at creation or update), date format YYYY-MM-DD, date only (no time)
- **Status**: Required (system-managed), cannot be set by user during creation (defaults to `initial`); cannot be manually set to `due`
- **Priority**: Required, must be one of: low, medium, high, urgent. Defaults to "medium" if not specified during creation. Must always be set to a valid value during updates.
- **Created At**: Required (system-generated timestamp), cannot be set by user
- **Modified At**: Required (system-generated timestamp), automatically updated on successful update operations that result in actual changes

### 5.7 Error Handling
- Validation errors are returned with field-specific error messages
- Error messages are detailed and include guidance on how to fix the issue
- Filter validation errors clearly indicate invalid filter parameters with correction guidance

---

## 6. User Stories

### Story 1: Create a Todo
**As a** user  
**I want to** create a new todo with a title, description, priority, and due date  
**So that** I can capture tasks I need to complete

**Acceptance Criteria:**
- User must provide a title for the todo (required, maximum 100 characters)
- User can optionally provide a description for the todo (optional, maximum 1000 characters)
- User can optionally set a due date for the todo (optional, must not be in the past, format YYYY-MM-DD, date only)
- User can optionally set a priority for the todo (optional in API, valid values: low, medium, high, urgent)
- If priority is not specified, it defaults to "medium"
- User cannot set the status during creation (required, automatically defaults to `initial`)
- User cannot set the ID during creation (required, system-generated UUID)
- Todo is saved and assigned a unique identifier (UUID)
- Created at and modified at timestamps are automatically set (required)
- User receives confirmation that the todo was created successfully with detailed success message
- All provided information is stored accurately
- If validation fails, user receives field-specific error messages with guidance on how to fix the issue

---

### Story 2: Update a Todo
**As a** user  
**I want to** update the details of an existing todo  
**So that** I can correct mistakes or add new information as my tasks evolve

**Acceptance Criteria:**
- User can identify which todo to update using its UUID (required)
- User can modify the title (required, maximum 100 characters)
- User can modify the description (optional, maximum 1000 characters)
- User can modify the due date (optional, must not be in the past, format YYYY-MM-DD, or can be cleared)
- User can modify the priority (required, must be one of: low, medium, high, urgent)
- User can modify the status (required, except cannot manually set to `due`)
- Partial updates are supported - only the specified fields are modified; unspecified fields remain unchanged
- Modified at timestamp is automatically updated only when the update is successful and results in actual changes (required)
- User cannot modify the ID (required, immutable)
- User cannot modify the created at timestamp (required, immutable)
- Changes are saved with last-write-wins concurrency model
- User receives confirmation that the todo was updated successfully with detailed success message
- If the todo doesn't exist, user receives field-specific error message
- If validation fails, user receives field-specific error messages with guidance

---

### Story 3: Change Todo Status
**As a** user  
**I want to** change the status of a todo  
**So that** I can track the progress and completion of my tasks

**Acceptance Criteria:**
- User can identify which todo to update using its UUID
- User can change status to `initial` or `complete` only (cannot manually set to `due`)
- If attempting to change from `due` to `initial` when due date is in the past, the operation is rejected with detailed error message
- All other status transitions are allowed (`initial` ↔ `complete`, `due` → `complete`)
- Status change is saved immediately
- Modified at timestamp is automatically updated
- User receives confirmation that the status was changed with detailed success message
- If the todo doesn't exist, user receives detailed error message
- Status can be changed multiple times within allowed transitions

---

### Story 4: Delete a Todo
**As a** user  
**I want to** delete a todo  
**So that** I can remove tasks that are no longer relevant or were created by mistake

**Acceptance Criteria:**
- User can identify which todo to delete using its UUID
- Todo is permanently and immediately removed from the system (no soft delete)
- User receives confirmation that the todo was deleted with detailed success message
- If the todo doesn't exist, user receives detailed error message
- Deleted todos cannot be retrieved or listed
- There is no recovery mechanism for deleted todos

---

### Story 5: List and Filter Todos
**As a** user  
**I want to** view a list of todos with comprehensive filtering options  
**So that** I can see all my tasks or focus on specific subsets

**Acceptance Criteria:**
- User can retrieve a list of all todos without filters
- Each todo in the list shows: UUID (required), title (required), description (optional), status (required), due date (optional), priority (required), created at (required), and modified at (required)
- User can filter by status using equality (equals, notEquals)
- User can filter by priority using equality (equals, notEquals) - values: low, medium, high, urgent
- User can filter by due date using range filters (before, after, notBefore, notAfter) - format: YYYY-MM-DD
- User can filter by title using contains/like filters (contains, notContains) - case-insensitive
- User can filter by description using contains/like filters (contains, notContains) - case-insensitive
- Multiple filters can be applied together using AND logic (all filters must match)
- List includes todos with all status types (initial, complete, due)
- If no todos match the criteria, user receives an empty list
- List reflects the current state of all todos including dynamically calculated status updates
- Status is calculated on-demand for each todo based on current date and due date
- Stored status is never automatically updated to `due`; filtering works on the calculated status
- If filter validation fails, user receives field-specific error messages with guidance

---

### Story 6: View a Specific Todo
**As a** user  
**I want to** view the complete details of a specific todo  
**So that** I can see all information about a particular task

**Acceptance Criteria:**
- User can identify which todo to view using its UUID (required)
- System returns the complete information for that todo: UUID (required), title (required), description (optional), status (required), due date (optional), priority (required), created at (required), and modified at (required)
- Information reflects the current state of the todo
- Status is calculated on-demand based on current date and due date
- Stored status is never automatically updated to `due`
- If the todo doesn't exist, user receives field-specific error message

---

### Story 7: Automatic Status Calculation for Overdue Todos
**As a** user  
**I want** the system to automatically calculate and show todos as `due` when their due date has passed and they're not complete  
**So that** I can easily identify overdue tasks without manual tracking

**Acceptance Criteria:**
- When the current date is after the due date of a todo, and the stored status is `initial`, the calculated status becomes `due`
- Todos without due dates never show as `due` status
- Status of `complete` todos never calculates to `due`, regardless of due date
- The status calculation happens on-demand when viewing or listing todos
- The stored status value remains as `initial` - only the calculated/displayed status is `due`
- When listing or viewing todos, the displayed status reflects whether they are overdue
- Users can see which tasks are overdue immediately when they access the system
- No background processes are needed for status updates

---

### Story 8: Bulk Update Status
**As a** user  
**I want to** change the status of multiple todos at once  
**So that** I can efficiently manage multiple tasks simultaneously

**Acceptance Criteria:**
- User can specify multiple todo UUIDs to update (maximum 100 todos per operation)
- User can set a new status (`initial` or `complete`) for all specified todos (required)
- Cannot bulk-set status to `due` (same restriction as single update)
- Status transition rules apply to each todo individually
- Operation is atomic: all or nothing - if any todo update fails, entire operation is rolled back
- If any todo would violate transition rules, entire operation fails with field-specific error messages
- If any todo doesn't exist, entire operation fails with field-specific error message
- Modified at timestamp is automatically updated for all updated todos only if entire operation succeeds
- User receives confirmation that all todos were updated successfully, or detailed error message if operation failed
- If validation fails, user receives field-specific error messages with guidance

---

### Story 9: Bulk Delete Todos
**As a** user  
**I want to** delete multiple todos at once  
**So that** I can efficiently clean up completed or irrelevant tasks

**Acceptance Criteria:**
- User can specify multiple todo UUIDs to delete (maximum 100 todos per operation)
- Operation is atomic: all or nothing - if any todo deletion fails, entire operation is rolled back
- If any todo doesn't exist, entire operation fails with field-specific error message
- All specified todos are permanently and immediately removed from the system only if entire operation succeeds
- User receives confirmation that all todos were deleted successfully, or detailed error message if operation failed
- There is no recovery mechanism for bulk-deleted todos

---

### Story 10: Manage Todo Priority
**As a** user  
**I want to** assign priority levels to my todos  
**So that** I can focus on the most important tasks

**Acceptance Criteria:**
- User can optionally set priority when creating a todo (optional in API)
- If priority is not specified during creation, it defaults to "medium"
- User must provide a valid priority when updating a todo (required)
- Valid priority values are: low, medium, high, urgent (in priority order)
- Priority cannot be cleared - it must always have one of the valid values
- User can filter todos by priority when listing (equals, notEquals)
- Priority is displayed when viewing or listing todos (required)
- If invalid priority is provided, user receives field-specific error message with guidance

---

## 7. Success Metrics

### User Engagement
- Number of todos created
- Frequency of status updates
- Ratio of completed to created todos
- Usage of filtering features
- Usage of bulk operations
- Distribution of priority usage (low, medium, high, urgent)

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

## 8. Assumptions

- This is a single-user system; all todos belong to one implicit user
- Users will access the backend through a client application (to be developed separately)
- The system maintains accurate date information for due date tracking
- Todos are independent and have no relationships to each other
- The system has sufficient storage for todos and their metadata
- Due dates use date only (no time component) in YYYY-MM-DD format and are stored/compared consistently
- The system clock is accurate for calculating overdue status
- Concurrent operations follow last-write-wins model
- Error messages are field-specific and include detailed information and guidance without security concerns
- Filters can be combined using AND logic (all filters must match)
- Filter validation errors provide clear guidance on correction
- Priority values are predefined and limited to: low, medium, high, urgent (in priority order)
- Priority always has a value (defaults to "medium" on creation if not specified)
- Bulk operations are atomic (all or nothing) with a maximum of 100 todos per operation
- There are no uniqueness constraints on any fields
- String filters (contains, notContains) are case-insensitive
- Stored status is never automatically updated to `due`; status is calculated on-demand for display and filtering

---

## 9. Future Considerations

While not in the current scope, these features may be considered for future releases:
- User authentication and authorization
- Multiple users and user management
- Sharing todos with other users
- Todo categories or tags
- Recurring todos
- Notifications and reminders
- Todo history and audit trail
- Subtasks or checklist items within todos
- Pagination for large result sets
- Soft delete with recovery mechanism
- Archive functionality for completed todos
- Sorting capabilities (by due date, priority, creation date, etc.)
- Advanced filter combinations (OR logic, complex queries)
- Attachments or file links
- Comments or notes on todos
- Todo dependencies or relationships
- Calendar integration
- Activity logs and change history
- Default filter/view for active todos
- Todo count summary statistics
- Batch create operation
- Clear all completed todos operation
- Smart dates (relative date filtering)
- Status history flag (wasOverdue)
- Bulk get by IDs
- Due date warnings (dueSoon status)
- Todo templates
- Import/export functionality

