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
- Listing and filtering todos
- Viewing individual todo details
- Searching todos by title and description
- Automatic status tracking for overdue items
- Priority management
- Bulk operations on multiple todos
- Automatic timestamp tracking

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
5. **List Todos**: Retrieve todos with optional filtering
6. **View Todo**: Get details of a specific todo
7. **Search Todos**: Find todos by keyword in title or description
8. **Bulk Update Status**: Change status for multiple todos at once
9. **Bulk Delete**: Delete multiple todos at once

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

### 5.5 Filtering and Search Capabilities
Users can filter todos by:
- **Status**: Equality and negation filters (equals, notEquals)
- **Priority**: Equality and negation filters (equals, notEquals)
- **Due Date**: Range filters (before, after) and negation (notBefore, notAfter)
- **Title**: Contains/like filters and negation (contains, notContains)
- **Description**: Contains/like filters and negation (contains, notContains)

### 5.6 Validation Rules
- **Title**: Required, maximum 100 characters
- **Description**: Optional, maximum 1000 characters
- **Due Date**: Optional, must not be in the past (at creation or update), date only (no time)
- **Status**: Cannot be set by user during creation (defaults to `initial`); cannot be manually set to `due`
- **Priority**: Optional, valid priority values only

---

## 6. User Stories

### Story 1: Create a Todo
**As a** user  
**I want to** create a new todo with a title, description, priority, and due date  
**So that** I can capture tasks I need to complete

**Acceptance Criteria:**
- User must provide a title for the todo (maximum 100 characters)
- User can optionally provide a description for the todo (maximum 1000 characters)
- User can optionally set a due date for the todo (must not be in the past, date only)
- User can optionally set a priority for the todo
- User cannot set the status during creation (automatically defaults to `initial`)
- Todo is saved and assigned a unique identifier (UUID)
- Created at and modified at timestamps are automatically set
- User receives confirmation that the todo was created successfully with detailed success message
- All provided information is stored accurately
- If validation fails, user receives detailed error message with guidance on how to fix the issue

---

### Story 2: Update a Todo
**As a** user  
**I want to** update the details of an existing todo  
**So that** I can correct mistakes or add new information as my tasks evolve

**Acceptance Criteria:**
- User can identify which todo to update using its UUID
- User can modify the title (maximum 100 characters)
- User can modify the description (maximum 1000 characters)
- User can modify the due date (must not be in the past, or can be cleared)
- User can modify the priority
- User can modify the status (except cannot manually set to `due`)
- Partial updates are supported - only the specified fields are modified; unspecified fields remain unchanged
- Modified at timestamp is automatically updated
- Changes are saved with last-write-wins concurrency model
- User receives confirmation that the todo was updated successfully with detailed success message
- If the todo doesn't exist, user receives detailed error message
- If validation fails, user receives detailed error message with guidance

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
**I want to** view a list of todos with filtering options  
**So that** I can see all my tasks or focus on specific subsets

**Acceptance Criteria:**
- User can retrieve a list of all todos without filters
- Each todo in the list shows: UUID, title, description, status, due date, priority, created at, and modified at
- User can filter by status using equality (equals, notEquals)
- User can filter by priority using equality (equals, notEquals)
- User can filter by due date using range filters (before, after, notBefore, notAfter)
- User can filter by title using contains/like filters (contains, notContains)
- User can filter by description using contains/like filters (contains, notContains)
- Multiple filters can be applied together
- List includes todos with all status types (initial, complete, due)
- If no todos match the criteria, user receives an empty list
- List reflects the current state of all todos including dynamically calculated status updates
- Status is calculated on-demand for each todo based on current date and due date

---

### Story 6: View a Specific Todo
**As a** user  
**I want to** view the complete details of a specific todo  
**So that** I can see all information about a particular task

**Acceptance Criteria:**
- User can identify which todo to view using its UUID
- System returns the complete information for that todo: UUID, title, description, status, due date, priority, created at, and modified at
- Information reflects the current state of the todo
- Status is calculated on-demand based on current date and due date
- If the todo doesn't exist, user receives detailed error message

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

### Story 8: Search Todos
**As a** user  
**I want to** search for todos by keywords in their title or description  
**So that** I can quickly find specific tasks without scanning through the entire list

**Acceptance Criteria:**
- User can provide a search keyword or phrase
- System searches in both title and description fields
- Search is case-insensitive
- Search returns all todos where the keyword appears in title or description
- Search results show: UUID, title, description, status, due date, priority, created at, and modified at
- If no todos match the search, user receives an empty list
- Search results reflect current status (calculated on-demand)

---

### Story 9: Bulk Update Status
**As a** user  
**I want to** change the status of multiple todos at once  
**So that** I can efficiently manage multiple tasks simultaneously

**Acceptance Criteria:**
- User can specify multiple todo UUIDs to update
- User can set a new status (`initial` or `complete`) for all specified todos
- Cannot bulk-set status to `due` (same restriction as single update)
- Status transition rules apply to each todo individually
- If any todo would violate transition rules, that specific update is rejected with detailed error
- Modified at timestamp is automatically updated for all successfully updated todos
- User receives confirmation indicating which todos were updated successfully and which failed
- If a todo doesn't exist, that specific todo is reported in the error response
- Operation continues for other valid todos even if some fail

---

### Story 10: Bulk Delete Todos
**As a** user  
**I want to** delete multiple todos at once  
**So that** I can efficiently clean up completed or irrelevant tasks

**Acceptance Criteria:**
- User can specify multiple todo UUIDs to delete
- All specified todos are permanently and immediately removed from the system
- User receives confirmation indicating which todos were deleted successfully
- If a todo doesn't exist, that specific todo is reported in the error response
- Operation continues for other valid todos even if some don't exist
- There is no recovery mechanism for bulk-deleted todos

---

### Story 11: Manage Todo Priority
**As a** user  
**I want to** assign priority levels to my todos  
**So that** I can focus on the most important tasks

**Acceptance Criteria:**
- User can set priority when creating a todo
- User can update priority when updating a todo
- User can clear priority (set to no priority)
- User can filter todos by priority when listing
- Priority is displayed when viewing or listing todos
- Valid priority values are clearly defined
- If invalid priority is provided, user receives detailed error message with guidance

---

## 7. Success Metrics

### User Engagement
- Number of todos created
- Frequency of status updates
- Ratio of completed to created todos
- Usage of filtering and search features
- Usage of bulk operations

### System Performance
- Time to create a todo
- Time to retrieve filtered todo list
- Time to update a todo
- Time to perform search operations
- Time to execute bulk operations

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
- Due dates use date only (no time component) and are stored/compared consistently
- The system clock is accurate for calculating overdue status
- Concurrent operations follow last-write-wins model
- Error messages can include detailed information and guidance without security concerns
- Filters can be combined using AND logic (all filters must match)
- Priority values are predefined and limited

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
- Reminders and notifications
- Calendar integration
- Activity logs and change history

