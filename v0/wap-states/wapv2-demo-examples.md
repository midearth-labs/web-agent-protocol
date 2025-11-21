# WAP V2 Demo Examples

**Version:** 2.0  
**Status:** Demo Documentation  
**Last Updated:** November 2025  
**Owner:** MidEarth Labs

---

## Overview

This document showcases WAP V2 (Web Agent Protocol Version 2) with the generative plan-based approach (Plan-then-execute Model) using Amazon States Language (ASL) with JSONata. Unlike the previous agentic approach that required multiple LLM round-trips, WAPV2 generates complete, deterministic execution plans as state machines in a single LLM call. The showcase is done with a sample simple Todo app but it's in no way restricted to simple use-cases.

**Key Innovation**: The LLM analyzes the user request and generates a complete state machine definition that is then executed deterministically by a separate execution engine. This provides transparency (users can review the plan before execution), efficiency (single LLM call), and determinism (fixed execution path after confirmation).

**Reference**: 
- Complete interaction examples available at: https://claude.ai/share/dbeb60da-ac33-4095-95d9-b90c99598a29
- WAP [System Instructions Prompt](../../todo-app/src/orchestrator/system-instruction-stateful.md)
- [Demo Todo tools](../../todo-app/src/api-client/wap-tools.types.ts)
- WAP [Workflow Design Doc](../wap-workflow-states.md)

---

## Tools
### Todo Tools
The following tools are available for use in the demo WAP state machines. These tools are used as `Resource` values in Task states.

1. **createTodo** - Creates a new todo. Status defaults to "initial", priority defaults to "medium". Supports optional title, description, dueDate, and priority fields.

2. **listTodos** - Lists todos with optional filtering. Supports filtering by status, priority, dueDate (before/after), title, and description. Multiple filters combine with AND logic. Date range filtering is supported.

3. **getTodoById** - Gets a single todo by its unique identifier (UUID).

4. **updateTodo** - Performs a partial update of a todo. All fields except id are optional. Pass null for description or dueDate to clear those fields. Status transitions are validated (cannot transition from "complete" back to "initial").

5. **deleteTodo** - Deletes a single todo by its unique identifier (UUID).

6. **bulkUpdateStatus** - Bulk update status for multiple todos (max 100 per call). Atomic operation - all succeed or all fail. Returns array of updated todos.

7. **bulkDelete** - Bulk delete multiple todos (max 100 per call). Atomic operation - all succeed or all fail.

### WAP Specific Tools
8. **render** - Meta-tool for generating dynamic UIs. Used as Resource "Display" in Display tasks. Returns JavaScript code for render(data, onAction) function. Supports preview, confirm, progress, result, and error step types.

---

## User Request 1: "Find my todos with urgent priority"

### Request Analysis

This is a **clear, unambiguous request** with a specific priority filter. The user explicitly requests todos with "urgent priority", which maps directly to the `priority="urgent"` field in the data model.

**State Machine Characteristics**:
- **Straightforward execution**: Single API call with priority filter
- **No ambiguity resolution needed**: Unlike "Find my urgent todos", this request is explicit
- **Simple flow**: Fetch → Display results
- **Demonstrates**: Basic Task state with filtered arguments

This example showcases the most direct WAP execution pattern where the user intent maps cleanly to a single tool invocation. The state machine is minimal but complete, with proper error handling and result display.

### State Machine Diagram

```
┌─────────────────┐
│  FetchTodos     │
│  (Task)         │
│  listTodos      │
│  priority=      │
│  urgent         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ShowResults    │
│  (Display)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SuccessState   │
│  (Succeed)      │
└─────────────────┘
```

### Generated State Machine

[View Detailed States Language output](./tools-demo-request-1.json)

---

## User Request 2: "Find my urgent todos"

### Request Analysis

This is an **ambiguous request** that could be interpreted in multiple valid ways. Unlike Request 1, this doesn't explicitly specify "priority" - it just says "urgent". This could mean:
1. Todos with `priority="urgent"` (field match)
2. Todos with "urgent" in the title (text search)
3. Todos with "urgent" in the description (text search)

**State Machine Characteristics**:
- **Uses Serial state for exploration**: Tries multiple readonly strategies sequentially
- **Generative approach**: Explores finite interpretations until results are found
- **Break on success**: BreakCondition stops as soon as any strategy finds results
- **Readonly only**: All strategies use readonly operations (listTodos)
- **Demonstrates**: Serial state with BreakCondition, ambiguity resolution, cumulative result collection

This is a flagship example of WAPV2's intelligent interpretation capabilities. Instead of guessing which interpretation the user meant, the system tries each reasonable interpretation until it finds results. This creates a more robust user experience where the system "figures out" what you mean through finite exploration rather than requiring precise language.

The Serial state accumulates results and tracks which strategy succeeded, providing transparency about how the system interpreted the ambiguous request.

### State Machine Diagram

```
                    ┌─────────────────────────┐
                    │  TryFindingUrgent       │
                    │  (Serial)               │
                    └────────┬────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌───────────┐     ┌───────────┐    ┌────────────┐
    │ Strategy1 │     │ Strategy2 │    │ Strategy3  │
    │ Priority  │     │  Title    │    │Description │
    │ Filter    │     │  Search   │    │  Search    │
    └─────┬─────┘     └─────┬─────┘    └──────┬─────┘
          │                 │                  │
          └─────────────────┼──────────────────┘
                            │
                  BreakCondition:
                  $data.totalCount > 0
                            │
                            ▼
                    ┌───────────────┐
                    │ CheckResults  │
                    │  (Choice)     │
                    └───────┬───────┘
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │ ShowResults  │    │ ShowNoResults│
          │  (Display)   │    │  (Display)   │
          └──────┬───────┘    └──────┬───────┘
                 │                   │
                 └─────────┬─────────┘
                           ▼
                   ┌───────────────┐
                   │ SuccessState  │
                   │  (Succeed)    │
                   └───────────────┘
```

### Generated State Machine

[View Detailed States Language output](./tools-demo-request-2.json)

---

## User Request 3: "I'd like to download all my todos due in the next 5 weeks as a CSV"

### Request Analysis

This request combines **data filtering, date computation, and format transformation**. The user wants todos within a specific date range (next 5 weeks from today) exported in CSV format.

**State Machine Characteristics**:
- **Date calculation**: Uses JSONata and context functions to compute dates
- **Client-side transformation**: Converts JSON to CSV format using JSONata
- **DRY principle**: Computes end date once, reuses in filter and display
- **No actual download**: WAP generates CSV data and displays it (download would be handled by UI)
- **Demonstrates**: Pass state for data transformation, JSONata date functions, complex filtering

This example showcases WAPV2's ability to handle requests that require computation and data transformation. The state machine computes the date range (today + 5 weeks), filters todos using the `dueDateBefore` filter, and then transforms the JSON response into CSV format client-side using JSONata expressions.

Key innovation here is the **client-side data transformation** - instead of requiring a server-side CSV export endpoint, WAP generates the CSV format directly in the state machine using JSONata. This demonstrates how WAPV2 can orchestrate complex data transformations without requiring new backend APIs.

### State Machine Diagram

```
┌─────────────────┐
│ CalculateDates  │
│   (Pass)        │
│ Compute today + │
│   5 weeks       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FetchTodos     │
│   (Task)        │
│ dueDateBefore=  │
│  $data.endDate  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TransformToCSV  │
│   (Pass)        │
│ JSON → CSV      │
│ using JSONata   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DisplayCSV      │
│  (Display)      │
│ Show CSV data   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SuccessState   │
│  (Succeed)      │
└─────────────────┘
```

### Generated State Machine

[View Detailed States Language output](./tools-demo-request-3.json)

---

## User Request 4: "I need to prepare slides for the investor meeting on Nov 25 2025, book the conference room, and send agenda by Nov 23"

### Request Analysis

This is a **complex, multi-step request** that goes beyond the Todo application's scope but demonstrates WAPV2's capability to break down complex tasks into actionable steps. The request involves:
1. Creating a todo for preparing slides (due Nov 25)
2. Creating a todo for booking conference room (due before Nov 25)
3. Creating a todo for sending agenda (due Nov 23)

**State Machine Characteristics**:
- **Task decomposition**: Single request broken into 3 distinct todos
- **Date parsing and ordering**: Recognizes dependencies (agenda before meeting)
- **Parallel execution**: Can create todos concurrently since they're independent
- **User confirmation**: Shows preview of all todos before creation (mutating operation)
- **Demonstrates**: Parallel state, complex task decomposition, mutating operation confirmation

This example showcases WAPV2's ability to understand complex, multi-part requests and decompose them into structured actions. Even though booking a conference room isn't a todo feature, the system intelligently creates relevant todos for tracking these tasks. The state machine uses a Parallel state to create all three todos simultaneously after user confirmation, demonstrating efficient execution of independent operations.

The confirmation step is crucial here - since we're creating multiple items, the user sees a preview of all planned todos before execution, maintaining transparency and control.

### State Machine Diagram

```
┌──────────────────┐
│ ParseAndPlan     │
│   (Pass)         │
│ Extract 3 todos: │
│ - Slides (11/25) │
│ - Room booking   │
│ - Agenda (11/23) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ShowPreview      │
│  (Display)       │
│ Confirm creation │
│ of 3 todos       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CheckConfirm     │
│   (Choice)       │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ Cancel │  │CreateIn│
│        │  │Parallel│
└────────┘  └────┬───┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│ Create │  │ Create │  │ Create │
│ Slides │  │ Room   │  │ Agenda │
│  Todo  │  │  Todo  │  │  Todo  │
└────┬───┘  └────┬───┘  └────┬───┘
     │           │           │
     └───────────┼───────────┘
                 ▼
         ┌──────────────┐
         │ ShowResults  │
         │  (Display)   │
         └──────┬───────┘
                ▼
         ┌──────────────┐
         │SuccessState  │
         │  (Succeed)   │
         └──────────────┘
```

### Generated State Machine

[View Detailed States Language output](./tools-demo-request-4.json)

---

## Key Takeaways

### 1. **Single LLM Call Efficiency**
All four examples demonstrate state machines generated in a single LLM call. Unlike the previous agentic approach requiring multiple round-trips, WAPV2 generates the complete plan upfront.

### 2. **Transparency and User Control**
Every mutating operation (Request 4) includes a confirmation step where users can review the plan before execution. Readonly operations (Requests 1-3) can execute directly but still show clear results.

### 3. **Intelligent Ambiguity Resolution**
Request 2 showcases the Serial state pattern for exploring multiple valid interpretations of ambiguous requests, creating a more robust user experience.

### 4. **Client-Side Computation**
Request 3 demonstrates complex data transformation (JSON to CSV) using JSONata expressions, eliminating the need for new backend APIs.

### 5. **Task Decomposition**
Request 4 shows WAPV2's ability to break complex multi-part requests into structured actions and execute them efficiently in parallel.

### 6. **ASL Compatibility**
All state machines follow Amazon States Language conventions with WAP extensions (Serial state), making them familiar to developers who know AWS Step Functions.

### 7. **DRY Principle**
Throughout all examples, computed values are stored in `$data` and reused (dates, counts, filtered results), minimizing redundant computation.

---

## Comparison: WAPV1 vs WAPV2

| Aspect | WAPV1 (Agentic) | WAPV2 (Generative Plan) |
|--------|----------------|-------------------------|
| **LLM Calls** | Multiple per request | Single per request |
| **Transparency** | Limited (steps revealed as executed) | Full (complete plan before execution) |
| **User Control** | Reactive (approve each step) | Proactive (review plan upfront) |
| **Execution** | Adaptive but unpredictable | Deterministic after confirmation |
| **Latency** | High (multiple round-trips) | Low (single generation + execution) |
| **Cost** | Higher (multiple API calls) | Lower (single generation call) |
| **Ambiguity Handling** | Asks user for clarification | Explores alternatives (Serial state) |
| **Debugging** | Difficult (step-by-step trace) | Easy (static state machine) |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         LLM (System Instruction + WAP Tools)            │
│  - Analyzes request                                     │
│  - Generates complete state machine                     │
│  - Applies DRY, chooses execution patterns             │
│  - Handles ambiguity with Serial states                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼ (Single JSON output)
┌─────────────────────────────────────────────────────────┐
│              User Review & Confirmation                  │
│  - Plan displayed in human-readable format             │
│  - User can approve or reject                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼ (If approved)
┌─────────────────────────────────────────────────────────┐
│           State Machine Execution Engine                 │
│  - Executes states deterministically                    │
│  - Resolves JSONata expressions                         │
│  - Handles retries, errors, parallel/serial execution  │
│  - Manages Display states (UI rendering)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Results & UI Updates                          │
│  - Progress reporting                                   │
│  - Final results display                                │
│  - Task completion                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Conclusion

WAPV2 represents a significant evolution in web agent orchestration, moving from an adaptive agentic approach to a transparent, efficient, generative plan-based system. By leveraging Amazon States Language with JSONata and introducing the Serial state for ambiguity exploration, WAPV2 provides:

- **Better user experience** through transparency and upfront plan review
- **Lower costs** through single-LLM-call efficiency  
- **Higher reliability** through deterministic execution
- **Greater intelligence** through finite exploration of ambiguous requests
- **Improved maintainability** through standard ASL conventions

The four examples in this document showcase WAPV2's versatility across simple queries, ambiguous requests, data transformations, and complex multi-step tasks.

