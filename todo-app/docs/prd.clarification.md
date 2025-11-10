# PRD Clarification Questions

## Resolved Clarifications

The following questions have been answered and incorporated into PRD v2.0:

1. ✅ **Due Date Requirement**: Optional - todos without due dates never transition to due
2. ✅ **Manual Status Setting**: Users cannot manually set `due` status
3. ✅ **Status Transition Conflicts**: Prevent changing `due` to `initial` when due date is past
4. ✅ **User Context**: Single-user system
5. ✅ **List Filtering**: Comprehensive filtering support added
6. ✅ **Todo Identifier**: UUID
7. ✅ **Update Style**: PATCH-style (partial updates)
8. ✅ **Due Date Clearing**: Can be cleared or set to future dates only
9. ✅ **Complete Status Priority**: Complete status never changes to due
10. ✅ **Date/Time Format**: Date only, no time component
11. ✅ **Validation Rules**: Title (100 chars), Description (1000 chars), no past dates, user can't set creation status
12. ✅ **Status Update Timing**: On-demand calculation
13. ✅ **Error Messages**: Detailed with guidance
14. ✅ **Concurrency**: Last-write-wins
15. ✅ **Deletion**: Permanent and immediate

---

## New Clarifications Needed

### 1. Priority Values
**Question**: What are the valid priority values and their meanings?  
**Context**: Story 11 mentions priority management but doesn't define the specific values.  
**Options**:
- Numeric scale (e.g., 1-5, where 1 is highest)
- Named levels (e.g., low, medium, high, urgent/critical)
- Custom user-defined values
- Numeric with open range

**Impact**: Affects validation, filtering logic, and user understanding.

**Recommendation Needed**: Please specify:
- What are the valid priority values?
- Is there a default priority?
- Should priorities have an implied ordering?

**Answer**: Named levels: low, medium, high, urgent. in that order
---

### 2. Filter Combination Logic
**Question**: When multiple filters are applied, how are they combined?  
**Context**: Story 5 states "Multiple filters can be applied together" but doesn't specify the combination logic.  
**Options**:
- A) AND logic: All filters must match (assumed in PRD v2.0)
- B) OR logic: Any filter can match
- C) Configurable: User specifies AND/OR
- D) Different logic for different filter types

**Examples**:
- Filter: status=initial AND priority=high AND dueDate before 2025-12-31
- Does the system support: (status=initial OR status=due) AND priority=high?

**Recommendation Needed**: Confirm AND logic is correct, or specify alternative approach.

**Answer**: Option A
---

### 3. Bulk Operation Error Handling Detail
**Question**: For bulk operations that partially fail, what exactly is returned?  
**Context**: Stories 9 and 10 mention partial success/failure handling.  
**Clarifications needed**:
- HTTP status code when partial success occurs?
- Exact structure of response showing success/failure per todo?
- Should the entire operation be atomic (all or nothing) or best-effort (do what you can)?
- For bulk update, if 5 out of 10 fail, is it considered success or failure?

**Recommendation Needed**: Clarify response format and semantics for partial bulk operation failures.

**Answer**: Atomic: All or nothing
---

### 4. Search Behavior Details
**Question**: How should the search functionality work exactly?  
**Context**: Story 8 describes basic search but leaves some details unspecified.  
**Clarifications needed**:
- Search for exact phrase or individual words?
- Partial word matching (e.g., "app" matches "application")?
- Multiple keywords treated as AND or OR?
- Search combined with filters?
- Special characters in search terms?

**Examples**:
- Search "todo app" - finds "todo" AND "app" or exact phrase?
- Search "appl" - matches "application"?
- Search + filter: Search "meeting" AND status=complete

**Recommendation Needed**: Specify exact search behavior and edge cases.

**Answer**: Remove "Story 8: Search Todos". "Story 5: List and Filter Todos" covers all the needed behaviour.
---

### 5. Empty or Default Values
**Question**: How are empty/unset optional fields represented?  
**Context**: Multiple optional fields exist (description, due date, priority).  
**Clarifications needed**:
- Are null/absent fields distinguished from empty strings?
- Empty description: null, empty string, or absent from response?
- No priority: null, special "none" value, or absent?
- When filtering, how to filter for "no priority set"?

**Recommendation Needed**: Specify how optional/empty fields are represented and queried.

---

### 6. Modified At Timestamp Behavior
**Question**: When exactly is the "modified at" timestamp updated?  
**Context**: Modified at is auto-updated, but exact triggers unclear.  
**Clarifications needed**:
- Updated on any field change?
- Updated when status automatically calculates to `due` (even though stored status doesn't change)?
- Updated on failed update attempts?
- Updated when changing a field to the same value (no actual change)?

**Recommendation Needed**: Specify exactly when modified at timestamp is updated.

---

### 7. Date Format and Parsing
**Question**: What specific date format should be used for due dates?  
**Context**: "Date only, no time" is specified but not the exact format.  
**Options**:
- ISO 8601: YYYY-MM-DD (e.g., 2025-11-10)
- Other format: MM/DD/YYYY, DD-MM-YYYY, etc.
- Multiple formats accepted?
- Timezone consideration: date in which timezone?

**Recommendation Needed**: Specify exact date format for input and output.

---

### 8. Filter Operator Syntax
**Question**: How are filter operations expressed?  
**Context**: Various filter types mentioned (equals, notEquals, contains, etc.) but not how they're specified in the API.  
**Examples of possible approaches**:
- Query parameters: `?status=initial&priority=high`
- Operator syntax: `?status.equals=initial&dueDate.before=2025-12-31`
- JSON filter object in request body
- Special syntax: `?title.contains=meeting`

**Recommendation Needed**: This may be a technical detail, but clarify if there's a preferred approach or if this is left to implementation.

---

### 9. Case Sensitivity for String Filters
**Question**: Are string filters (contains, notContains) case-sensitive?  
**Context**: Search is specified as case-insensitive, but filters are not specified.  
**Impact**: Affects how users formulate filter queries.

**Examples**:
- Filter title contains "Meeting" - should it match "meeting" or "MEETING"?

**Recommendation Needed**: Specify case sensitivity for:
- Title contains filter
- Description contains filter

---

### 10. Bulk Operations List Size Limits
**Question**: Is there a maximum number of todos that can be bulk-updated or bulk-deleted in one operation?  
**Context**: Bulk operations could potentially include hundreds or thousands of IDs.  
**Impact**: System performance and API design.

**Recommendation Needed**: Should there be a maximum limit (e.g., 100 todos per bulk operation)?

---

### 11. Stored vs Calculated Status Clarification
**Question**: Should the stored status ever be updated to `due`, or always remain as user-set?  
**Context**: The PRD states status is "calculated on-demand" and stored status only updated when user explicitly changes it.  
**Clarification needed**:
- When a todo becomes overdue, stored status remains `initial`, but displayed as `due`?
- If user later updates another field (e.g., title), does stored status stay `initial` or get persisted as `due`?
- For filtering by status=due, does the system filter on stored or calculated status?

**Recommendation Needed**: Confirm that stored status is never automatically updated to `due`, and filtering works on calculated status.

---

### 12. Uniqueness Constraints
**Question**: Are there any uniqueness requirements?  
**Context**: Not specified in the PRD.  
**Clarifications needed**:
- Can multiple todos have identical titles?
- Can multiple todos have identical combinations of all fields?
- Any uniqueness constraints at all?

**Recommendation Needed**: Confirm there are no uniqueness constraints, or specify if any exist.
