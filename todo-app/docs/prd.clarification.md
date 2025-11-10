# PRD Clarification Questions

## Questions Requiring Product Owner Input

### 1. Due Date Requirement
**Question**: Is the due date a required field when creating a todo?  
**Context**: The PRD lists due date as a core attribute, but doesn't explicitly state if it's required.  
**Impact**: 
- If required: All todos must have deadlines, simpler logic for automatic status updates
- If optional: More flexible but requires handling todos without due dates in the automatic status update logic

**Recommendation Needed**: Please clarify whether due date is mandatory or optional when creating a todo.
**Answer**: It is not required, todos without due dates will never transition to being due.
---

### 2. Status Manipulation
**Question**: Can users manually set status to `due`, or is this exclusively automatic?  
**Context**: User Story 3 states users can change status to `initial`, `complete`, or `due`, but Story 7 describes automatic status updates to `due`.  
**Impact**: 
- If manual setting is allowed: Users might mark something as `due` before the due date actually passes
- If automatic only: Need to restrict manual status changes to only `initial` and `complete`

**Recommendation Needed**: Should users be able to manually set status to `due`, or should this status only be set automatically by the system?
**Answer**: Users cannot manually set due status. 
---

### 3. Status Transition Logic After Manual Override
**Question**: If a user marks an overdue todo as `initial`, does the system immediately change it back to `due`?  
**Context**: There could be conflict between manual status changes and automatic status updates.  
**Scenarios**:
- User has an overdue todo (status: `due`)
- User manually changes it to `initial` 
- Due date is still in the past
- What should happen?

**Options**:
- A) System immediately changes it back to `due`
- B) Manual change takes precedence until next automatic check
- C) Prevent user from changing `due` status to `initial` if due date is past

**Recommendation Needed**: How should the system handle manual status changes that conflict with automatic status rules?
**Answer**: Option C

---

### 4. User Context and Data Isolation
**Question**: How should the system handle multiple users in the backend, given that user authentication is out of scope?  
**Context**: The PRD mentions "todos per user" in success metrics but user management is explicitly out of scope.  
**Impact**: 
- If single-user system: Simpler implementation, all todos belong to one implicit user
- If multi-user without auth: Need to identify users somehow (user ID parameter?) without proper authentication
- If preparing for future multi-user: Need to design data model with user association from the start

**Recommendation Needed**: Should the backend be designed as:
- A) Single-user system (all todos in one pool)
- B) Multi-user capable but accepting user identifier as parameter (no authentication)
- C) Multi-user aware data model, but exposing single-user API

**Answer**: The system is single-user.
---

### 5. Listing and Filtering
**Question**: When listing todos, should all todos be returned, or should there be basic filtering capabilities?  
**Context**: User Story 5 states users can "view a list of all my todos" which implies no filtering.  
**Impact**: 
- All todos: Simple but potentially large responses
- Basic filtering: Better user experience, requires defining filter parameters

**Scenarios requiring clarification**:
- Should users be able to list only incomplete todos (`initial` and `due`)?
- Should users be able to list only `complete` todos?
- Should listing support any filters in the initial version?

**Recommendation Needed**: Should the list operation return all todos or support filtering parameters?
**Answer**: Yes, support equality filter for status, and priority. Range (before and after) filters for dueDate.  Contains/Like filter for string fields title and description. Support negation filters for all filters i.e. notContains, notEquals, notBefore, etc. 

---

### 6. Todo Identifier
**Question**: How should todos be uniquely identified?  
**Context**: The PRD mentions "unique identifier" but doesn't specify the type.  
**Options**:
- A) Auto-incrementing integer (1, 2, 3, ...)
- B) UUID/GUID
- C) Custom identifier format
- D) User-provided identifier

**Recommendation Needed**: What type of identifier should be used for todos?
**Answer**: UUID
---

### 7. Update Operation Behavior
**Question**: When updating a todo, must all fields be provided, or can users update individual fields?  
**Context**: User Story 2 says "only the specified fields are modified; unspecified fields remain unchanged," but this needs confirmation.  
**Impact**:
- Partial updates: More flexible, requires distinguishing between "not provided" and "clear this field"
- Full updates: Simpler, but users must provide all data even when changing one field

**Recommendation Needed**: Should updates support partial field updates (PATCH-style) or require all fields (PUT-style)?
**Answer**: Patch style
---

### 8. Empty or Invalid Due Dates
**Question**: What happens if a user updates a todo and removes the due date or sets it to an invalid value?  
**Context**: If due date is required for creation, can it be removed later through updates?  
**Impact**: Affects automatic status update logic and data validation rules

**Recommendation Needed**: Can due dates be removed or cleared after a todo is created? What validations should apply?
**Answer**: Yes, due dates can be cleared, or set to any date not in the past.
---

### 9. Completed Todos and Due Dates
**Question**: If a todo is marked as `complete` after its due date has passed, what status should it have?  
**Context**: Clarifying the priority of status values.  
**Scenarios**:
- Todo has due date of Nov 1
- Today is Nov 10 (todo is overdue, status: `due`)
- User marks it as `complete`
- Should final status be `complete` or `due`?

**Assumption in PRD**: Complete status takes precedence (completed todos don't auto-update to `due`)

**Recommendation Needed**: Confirm that `complete` status means the todo remains complete regardless of due date.
**Answer**: complete
---

### 10. Date/Time Format and Timezone
**Question**: What format should due dates use, and how should timezones be handled?  
**Context**: Backend needs to compare due dates with current time for automatic status updates.  
**Options**:
- Date only (no time component) - due date is "end of day"
- Date and time with timezone
- Date and time in UTC
- Date and time in user's local timezone

**Impact**: 
- Date only: Todo becomes `due` at start of day after due date
- Date and time: More precise but requires timezone handling

**Recommendation Needed**: Should due date include time, and how should timezones be handled?
**Answer**: Just date, no time.
---

### 11. Validation Rules
**Question**: What validation rules should apply to todo fields?  
**Clarifications needed**:
- **Title**: Maximum length? Can it be empty? Special characters allowed?
- **Description**: Maximum length? Can it be empty? Required or optional?
- **Due Date**: Can it be in the past when creating? How far in the future is allowed?
- **Status**: Can user set any status on creation, or must it start as `initial`?

**Recommendation Needed**: Please provide specific validation rules for each field.
**Answer**: Todo length: 100, Description length: 1000, Due date: No past dates, Status: user cant set creation status.
---

### 12. Automatic Status Update Timing
**Question**: When exactly does the automatic status update to `due` occur?  
**Context**: User Story 7 describes automatic updates but not the timing mechanism.  
**Options**:
- A) Real-time: Check when the todo is accessed (list/view operations)
- B) Scheduled: Background process runs periodically (e.g., every hour)
- C) On-demand: Status calculated dynamically but not stored
- D) Hybrid: Calculate on access and persist

**Recommendation Needed**: What mechanism should be used for automatic status updates?
**Answer**: C On-demand
---

### 13. Error Handling and Responses
**Question**: What level of detail should error messages provide?  
**Context**: Several acceptance criteria mention "appropriate error message" but don't define appropriateness.  
**Examples**:
- "Todo not found"
- "Todo with ID 12345 not found"
- "Invalid due date format"
- "Title exceeds maximum length of 200 characters"

**Recommendation Needed**: How detailed should error messages be? Should they include guidance on how to fix the error?
**Answer**: Detailed and guidance
---

### 14. Concurrent Updates
**Question**: How should the system handle simultaneous updates to the same todo?  
**Context**: Multiple clients might try to update the same todo at the same time.  
**Impact**: Without concurrency control, updates might be lost or create inconsistent state.

**Recommendation Needed**: Should the initial version include:
- Optimistic locking (version numbers)?
- Last-write-wins?
- No special handling?
**Answer**: Last-write-wins.
---

### 15. Data Retention and Deletion
**Question**: When a todo is deleted, is it permanently removed immediately?  
**Context**: Relates to whether there's a recovery mechanism or audit trail.  
**Options**:
- Permanent deletion: Todo is removed from database immediately
- Soft deletion: Todo is marked as deleted but retained
- No deletion: Use status/archive instead of delete operation

**Recommendation Needed**: Should deletion be permanent and immediate, or should there be a recovery mechanism?
**Answer**: Permanent

