# User Journey Plans for Todo Management Requests

This document provides step-by-step plans for implementing 5 different user requests using the [IApiClient](https://github.com/midearth-labs/web-agent-protocol/blob/main/todo-app/src/api-client/api-client-interface.ts) interface methods. Each journey follows the format established in the api-client-interface.ts User Journey Examples section.

## Working Prompt (User Journeys / Requests)
```
Given the methods in IApiClient @api-client-interface.ts , show me a plan on how you will achieve each of the following requests individually:

"Add a todo to review Q4 budget, make it due end of next week"
"Mark all todos with 'meeting' in the title as complete"
"Delete all todos that are overdue by more than 30 days"
"I need to prepare slides for the investor meeting on Nov 15, book the conference room, and send agenda by Nov 13"
"Push all incomplete todos due this week to next Monday, except anything with 'urgent' in it"

Use the User Journeys examples output format to output the plan
```

---

## Journey 1: Add a todo to review Q4 budget, make it due end of next week

**Scenario:** User wants to create a new todo item titled "review Q4 budget" with a due date set to the end of next week.

**Approach:**

1. Calculate the end of next week date client-side (typically Sunday or Friday depending on week definition)
2. Create the todo using createTodo with title and calculated due date
3. Default priority will be "medium" if not specified

**Implementation:**

```
// Calculate end of next week date client-side (e.g., "2025-11-23")

createTodo({
  title: "review Q4 budget",
  dueDate: endOfNextWeek  // e.g., "2025-11-23"
})
```

---

## Journey 2: Mark all todos with 'meeting' in the title as complete

**Scenario:** User wants to mark all todos that contain the word "meeting" in their title as complete.

**Approach:**

1. Find all todos with "meeting" in the title using title filter
2. Extract IDs from matching todos
3. Bulk update status to "complete" in batches of 100 (if more than 100 todos)

**Implementation:**

```
// Find todos with "meeting" in title (case-insensitive)
todosWithMeeting = listTodos({
  title: "contains:meeting"
});

// Only proceed if non-empty todos

// Extract IDs from todos

// Process in batches of 100 todos (because of bulkUpdateStatus limit)

bulkUpdateStatus({ids: batchTodoIdsOfHundredEach, status: "complete"})
```

---

## Journey 3: Delete all todos that are overdue by more than 30 days

**Scenario:** User wants to clean up by deleting all todos that are overdue (status "due") and have a due date more than 30 days in the past.

**Approach:**

1. Calculate the cutoff date (30 days ago) client-side
2. Find todos with status "due" and dueDate before the cutoff date using combined filters
3. Extract IDs and bulk delete in batches of 100

**Implementation:**

```
// Calculate cutoff date (30 days ago) client-side (e.g., "2025-10-11")

overdueTodos = listTodos({
  status: "equals:due",
  dueDateBefore: thirtyDaysAgo  // e.g., "2025-10-11"
});

// Only proceed if non-empty todos

// Extract IDs from todos

// Process in batches of 100 todos (because of bulkDelete limit)

bulkDelete({ids: batchTodoIdsOfHundredEach})
```

---

## Journey 4: I need to prepare slides for the investor meeting on Nov 15, book the conference room, and send agenda by Nov 13

**Scenario:** User wants to create three separate todos for an investor meeting preparation: slides due Nov 15, conference room booking due Nov 15, and agenda sending due Nov 13.

**Approach:**

1. Create three separate todos sequentially or in parallel
2. Each todo has a specific title and due date
3. Default priority will be "medium" for each if not specified

**Implementation:**

```
createTodo({
  title: "prepare slides for the investor meeting",
  dueDate: "2025-11-15"
})

createTodo({
  title: "book the conference room",
  dueDate: "2025-11-15"
})

createTodo({
  title: "send agenda",
  dueDate: "2025-11-13"
})
```

---

## Journey 5: Push all incomplete todos due this week to next Monday, except anything with 'urgent' in it

**Scenario:** User wants to reschedule all incomplete todos that are due this week to next Monday, but exclude any todos that have "urgent" in the title or have urgent priority.

**Approach:**

1. Calculate this week's start and end dates client-side
2. Calculate next Monday's date client-side
3. Find incomplete todos due this week, excluding urgent items using combined filters
4. For each matching todo, update the dueDate to next Monday individually

**Implementation:**

```
// Calculate this week's start and end dates client-side
// Calculate next Monday's date client-side (e.g., "2025-11-17")

todosToReschedule = listTodos({
  status: "notEquals:complete",
  dueDateAfter: weekStart,      // e.g., "2025-11-10"
  dueDateBefore: weekEnd,       // e.g., "2025-11-16"
  title: "notContains:urgent",
  priority: "notEquals:urgent"
});

// For each todo in the result, update its dueDate to next Monday

updateTodo({id: todoId, dueDate: nextMonday})  // e.g., "2025-11-17"
```

---

## Notes

- All date calculations must be performed client-side before making API calls
- Dates must be in YYYY-MM-DD format when passed to the API
- Bulk operations (bulkUpdateStatus, bulkDelete) have a maximum limit of 100 items per call
- When filtering, combine multiple filters in a single listTodos call for server-side filtering efficiency
- The "due" status is calculated automatically for todos with past due dates and "initial" status