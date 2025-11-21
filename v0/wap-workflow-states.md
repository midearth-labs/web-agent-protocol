# WAP Workflow States Language Specification

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** January 2025  
**Owner:** MidEarth Labs

---

## Table of Contents

1. [Background](#background)
2. [Problem Statement](#problem-statement)
3. [Design Approach](#design-approach)
4. [Methodology](#methodology)
5. [Type Definitions](#type-definitions)
6. [Context Functions](#context-functions)
7. [Code Examples](#code-examples)
8. [Resource Links](#resource-links)

---

## Background

The WAP (Web Agent Protocol) orchestrator originally used an **agentic approach** where the LLM continuously generates function calls, executes them, receives responses, and generates the next set of calls in a loop. This approach has several limitations:

1. **High Latency**: Multiple round-trips to the LLM increase execution time
2. **High Cost**: Each step requires an LLM API call
3. **Limited Transparency**: Users can't see the full plan before execution
4. **Adaptive but Unpredictable**: Execution path changes based on intermediate results

To address these limitations, we designed a **generative plan-based approach** where:

- The LLM generates a complete execution plan **once** (not iteratively)
- The plan is presented to the user for review and confirmation
- After confirmation, the plan is executed deterministically in a sandboxed environment
- The plan includes both human-readable descriptions and executable state machine definitions

This approach is inspired by **Amazon States Language (ASL)** and uses **JSONata** for all data transformations, providing a declarative, transparent, and efficient workflow execution system.

---

## Problem Statement

### Challenges with Agentic Approach

1. **Plan Completeness**: LLM must generate complete, correct plans upfront
2. **JavaScript Code Generation**: LLM must generate safe, correct JavaScript code
3. **API Call Execution**: How does generated code call APIs safely?
4. **Dynamic Data Handling**: Plans must handle variable data sizes, pagination, conditional flows
5. **User Interaction**: How to handle mid-execution confirmations?
6. **Error Handling**: What happens when a step fails?
7. **Parallel Execution**: How to express parallel steps correctly?

### Solution: State Machine Language

We adopted a **state machine-based execution plan language** similar to Amazon States Language (ASL) that provides:

- **Declarative Syntax**: No custom JavaScript functions for most operations
- **Transparency**: Full plan visible before execution
- **Deterministic Execution**: Fixed execution path after confirmation
- **Sandboxed Execution**: Safe execution environment
- **Built-in Error Handling**: Retry and catch mechanisms
- **Parallel Execution**: Native support for parallel and map operations

---

## Design Approach

### Key Design Principles

1. **ASL Compatibility**: Match Amazon States Language naming and structure exactly
2. **JSONata-Only**: Use JSONata expressions exclusively (no JSONPath)
3. **Declarative**: Minimize custom JavaScript code
4. **Type-Safe**: Strong TypeScript definitions
5. **Extensible**: Support custom state types and context functions

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│              LLM Plan Generation                        │
│  - Analyzes request                                     │
│  - Generates state machine definition                   │
│  - Includes human-readable descriptions                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│              User Review & Confirmation                 │
│  - Plan displayed in human-readable format             │
│  - User can approve or reject                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│              Execution Runner                           │
│  - Executes state machine                               │
│  - Resolves JSONata expressions                         │
│  - Handles retries and errors                           │
│  - Manages parallel and map operations                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│              Results & UI Updates                        │
│  - Progress reporting                                   │
│  - Final results display                                │
└─────────────────────────────────────────────────────────┘
```

---

## Methodology

### Evolution of the Design

1. **Initial Approach**: Custom JavaScript execution plans
2. **Refinement**: State machine language (similar to ASL)
3. **Parameter System**: Unified parameter system with JSONata
4. **ASL Alignment**: Match ASL naming and structure exactly
5. **JSONata-Only**: Remove all JSONPath dependencies

### Design Decisions

1. **State vs Step**: Use "State" terminology (matches ASL)
2. **Parameters**: ASL uses "Parameters" field which works with JSONPath not JSONata expression. We do not use it
3. **Assign Field**: Custom field for storing results in data (uses JSONata)
4. **Output Field**: Transform output using JSONata
5. **StringOrJSONataExpression**: Unified type for static values or JSONata expressions
6. **Catch Blocks**: ASL-compatible error handling
7. **Retry Configuration**: ASL-compatible retry logic

---

## Type Definitions

### Core Types

```typescript
// JSONata expression type - must be wrapped in {% %} delimiters
// In AWS Step Functions with JSONata, expressions must be enclosed within {% %} characters
// See: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html
// Examples:
//   - Static: "high"
//   - JSONata: "{% $data.filteredCount %}"
//   - JSONata with function: "{% $now() %}"
//   - JSONata with context: "{% $rootState.Input.priority %}"
type JSONataExpression = string;

// String or JSONata expression type
// Can be either:
// 1. A plain string (static value)
// 2. A JSONata expression wrapped in {% %} (e.g., "{% $data.filteredTodos %}", "{% $item.id %}")
type StringOrJSONataExpression = string | JSONataExpression

// Number or JSONata expression type
// Can be either:
// 1. A plain number (static value)
// 2. A JSONata expression wrapped in {% %} (e.g., "{% $data.count %}", "{% $index %}")
type NumberOrJSONataExpression = number | JSONataExpression

// Root-level plan structure
type StateMachine = {
  QueryLanguage: "JSONata",
  Comment: string;
  StartAt: string; // State ID to start execution (matches ASL)
  States: Record<string, State>; // Map of state ID to state definition (matches ASL)
}

// Root state - runtime values injected into StateMachine at execution time (not part of StateMachine definition)
type RootState = {
  Context: StaticJson; // Runtime context (e.g., time, user info, environment) - @TODO: Create WAP Specific context also maybe include time etc.
  Input?: StaticJson; // User request input parameters (runtime value, not part of StateMachine definition)
  contextFunctions?: ContextFunctionRegistry; // Available context functions
}

// Base state type (matches ASL structure)
type BaseState = {
  QueryLanguage: "JSONata",
  Type: StateType; // Matches ASL "Type" field
  Comment: string; // Human-readable description (matches ASL)
  Assign?: Assign; // Assign result to data (custom, uses JSONata)
}

// Task and Parallel States MAY have "Arguments". https://states-language.net/spec.html#states-fields
type ArgumentsReceivingState = {
    Arguments?: ObjectOrJSONataExpression; // Input parameters (matches ASL, uses JSONata)
}

// Any state except Fail MAY have "Output". Also Wait
// Output accepts a JSONata expression wrapped in {% %} or a JSON value where string values are evaluated as JSONata when wrapped in {% %}
// See: https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html#querylanguage-field
type OutputEmittingState = {
    Output?: Outputs; // Output transformation (matches ASL, uses JSONata with {% %} wrappers)
}

type RetryAndCatchState = {
  Retry?: Retry[]; // Retry configuration (matches ASL)
  Catch?: Catch[]; // Error handlers (matches ASL)
}

// State types (matches ASL + WAP extensions)
type StateType = 
  | "Task" // Union of ToolTask and DisplayTask
  | "Choice"
  | "Pass"
  | "Wait"
  | "Succeed"
  | "Fail"
  | "Parallel"
  | "Map"
  | "Serial" // WAP extension: sequential execution with optional break

// Discriminated union of subtypes by the Type property
type State = 
  | Task
  | Choice
  | Pass
  | Wait
  | Succeed
  | Fail
  | Parallel
  | Map
  | Serial

// A Task state must set either the End field to true if the state ends the execution, or must provide a state in the Next field that is run when the Task state is complete.
type NextStateProgression = { Next: string }
type EndStateProgression = { End: boolean}
type NextOrEndStateProgression = NextStateProgression | EndStateProgression

// ObjectOrJSONataExpression type - used for Arguments, ItemSelector, etc.
// Accepts either a JSON object (with nested JSONata expressions in string values) or a single JSONata expression
// The Arguments and Output fields (and other similar fields such as Map state's ItemSelector) will accept either a JSON object Or, you can use a JSONata expression directly https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html#converting-from-jsonpath-to-jsonata
type ObjectOrJSONataExpression = Record<string, Value> | JSONataExpression;
// https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html#converting-from-jsonpath-to-jsonata
type Outputs = Value
// The Assign field accepts a JSON object with key/value pairs that define variable names and their assigned values
// Any string value, including those inside objects or arrays, will be evaluated as JSONata when surrounded by {% %} characters
// See: https://docs.aws.amazon.com/step-functions/latest/dg/workflow-variables.html
// Example: { "foo": "{% $states.input.foo_input %}" } assigns the value from state input to variable foo
// Example: { "allTodos": "{% $ %}" } assigns the state output to variable allTodos
type Assign = Record<string, Value> 
// A JSON array or a JSONata expression that must evaluate to an array. https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
type ArrayOrJSONataExpression = Array<Value> | JSONataExpression;

type StaticJson = 
  | string // Static string value
  | number // Static number value
  | boolean // Static boolean value
  | null // Static null value
  | Record<string, StaticJson> // Nested object of static values
  | StaticJson[]; // Array of static values

type Value = 
  | string // Static string value
  | number // Static number value
  | boolean // Static boolean value
  | null // Static null value
  | StringOrJSONataExpression // JSONata expression
  | Record<string, Value> // Nested object
  | Value[]; // Array of argument values
```

### Task States

```typescript
// Task state - union of ToolTask and DisplayTask
type Task = ToolTask | DisplayTask;

type BaseTask = ArgumentsReceivingState & OutputEmittingState & NextOrEndStateProgression & RetryAndCatchState & {
    Type: "Task";
    Resource: string; // Tool name (e.g., "listTodos", "updateTodo") - matches ASL
}

// ToolTask - executes API calls
type ToolTask = BaseState & BaseTask & {
  // Uses Arguments from base State for API call parameters
  // Uses Output from base State to transform result
  // Uses Assign from base State to store result in data
}

// DisplayTask - renders UI and waits for user action
type DisplayTask = BaseState & BaseTask & {
  Resource: "Display"; // Special resource identifier
  DisplayParams: {
    dataStructure: string; // TypeScript type definition
    stepType: "preview" | "confirm" | "progress" | "result" | "error";
    actions: Array<{
      id: string;
      label: string | StringOrJSONataExpression; // Can be dynamic
      variant: "primary" | "danger" | "secondary" | "success";
      continues: boolean;
    }>;
  };
  // Uses Arguments from base State for data to display
  // Uses Assign from base State to store user action in data
}
```

### Control Flow States

```typescript
// Choice state (matches ASL)
type Choice = BaseState & NextStateProgression & {
  Type: "Choice";
  Choices: Array<ChoiceRule>; // Array of rules evaluated in order (matches ASL)
  Default: string; // Default next state if no rules match (matches ASL)
  // No Arguments/Output/Assign - Choice doesn't transform data
}

// Choice rule with JSONata condition
type ChoiceRule = {
  Comment: string; // 
  Condition: StringOrJSONataExpression; // JSONata expression that evaluates to boolean (matches ASL)
  // Example: "{% $data.filteredCount = 0 %}"
} & NextStateProgression

// Pass state (matches ASL)
type Pass = BaseState & OutputEmittingState & NextOrEndStateProgression & {
  Type: "Pass";
  // Uses Output from base State with JSONata expression to pass/transform data
  // Uses Assign from base State to store result in data
}

// Wait state (matches ASL)
// With JSONata: use Seconds or Timestamp fields (with JSONata expressions in {% %})
// See: https://docs.aws.amazon.com/step-functions/latest/dg/state-wait.html
type Wait = BaseState & NextOrEndStateProgression & {
  Type: "Wait";
} & ({
    Seconds: NumberOrJSONataExpression; // Wait for specified seconds (JSONata: expression in {% %}
} | {
    Timestamp: StringOrJSONataExpression; // Wait till timestamp from JSONata expression (JSONata: expression in {% %}
})

// Succeed state (matches ASL)
type Succeed = BaseState & OutputEmittingState & {
  Type: "Succeed";
  // Optional Output to return final result
  // No Next or End - always terminal
}

// Fail state (matches ASL)
type Fail = BaseState & {
  Type: "Fail";
  Error: StringOrJSONataExpression; // Error code (matches ASL)
  Cause: StringOrJSONataExpression; // Error message (matches ASL)
  // No Next or End - always terminal
}

// Map state (matches ASL)
// See: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
type Map = BaseState & OutputEmittingState & NextOrEndStateProgression & RetryAndCatchState & {
  Type: "Map";
  ItemProcessor: StateMachine & {
    ProcessorConfig?:{
      Mode: "INLINE"; // WAP only supports INLINE
      // See: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html#inline-map-state-fields
    };
  };
  Items?: ArrayOrJSONataExpression; // A JSON array or a JSONata expression that must evaluate to an array (JSONata only, matches ASL)
  ItemSelector?: ObjectOrJSONataExpression; // Overrides input array items before passing to each iteration (matches ASL)
  MaxConcurrency?: NumberOrJSONataExpression; // Upper bound on concurrent iterations (matches ASL, defaults to 0 = unlimited)
  // Uses Assign from base State to store results in data
}

// Parallel state (matches ASL)
// If any branch fails, because of an unhandled error or by transitioning to a Fail state, the entire Parallel state is considered to have failed and all its branches are stopped. If the error is not handled by the Parallel state itself, WAP stops the execution with an error.
// A Parallel state provides each branch with a copy of its own input data
// The output array can be inserted into the input data (and the whole sent as the Parallel state's output)
// Each branch must be self-contained. A state in one branch of a Parallel state must not have a Next field that targets a field outside of that branch, nor can any other state outside the branch transition into that branch.
type Parallel = BaseState & ArgumentsReceivingState & OutputEmittingState & NextOrEndStateProgression & RetryAndCatchState & {
  Type: "Parallel";
  Branches: Array<StateMachine>; // Array of state machines to execute in parallel (matches ASL)
  // Uses Assign from base State to store combined results in data
}

// Serial state (WAP extension)
// Executes multiple state machines sequentially (single-threaded), similar to a for loop
// Unlike Parallel (which uses concurrency/threads), Serial ensures:
// 1. Step N completes fully before Step N+1 begins
// 2. Each step can access results from all previous steps via $data
// 3. Optional BreakCondition allows early termination (like a break statement)
// 
// Use cases:
// - Sequential search queries (try query A, then B, then C until criteria met)
// - Progressive data fetching (fetch batch 1, check if enough, fetch batch 2, etc.)
// - Multi-step validation with early exit
//
// The state output is an array containing the output of each executed step (steps after break are not included)
// Each step receives:
// - Previous steps' results via $data (accumulated using Assign)
// - Index of current step via $index (0-based)
// - Total number of steps via $stepCount
type Serial = BaseState & ArgumentsReceivingState & OutputEmittingState & NextOrEndStateProgression & RetryAndCatchState & {
  Type: "Serial";
  Steps: Array<StateMachine>; // Array of state machines to execute sequentially (one completes before next starts)
  BreakCondition?: StringOrJSONataExpression; // Optional early termination condition evaluated after each step
  // The BreakCondition is evaluated after each step completes
  // If condition evaluates to true, execution stops and proceeds to Next/End state
  // If condition is false or undefined, execution continues to next step
  // If no BreakCondition is provided, all steps execute
  // Example: "{% $data.totalResults >= 20 or $index >= 4 %}" (stop at 20 results OR 5 tries)
  
  // Uses Arguments from base State for initial input to first step
  // Uses Assign from base State to accumulate results across steps
  // Uses Output from base State to transform final output array
}
```

### Error Handling

```typescript
// Retry configuration (matches ASL, uses JSONata instead of JSONPath)
type Retry = {
  ErrorEquals: string[]; // Error types to retry on (matches ASL)
  // Examples: ["States.ALL"], ["States.TaskFailed"], ["States.Timeout"], ["CustomError"]
  IntervalSeconds?: number; // Delay between retries (matches ASL)
  MaxAttempts?: number; // Maximum retry attempts (matches ASL)
  BackoffRate?: number; // Exponential backoff multiplier (matches ASL)
  RequireUserConfirmation?: boolean; // Custom: ask user before retry
}

// Catch block for error handling (matches ASL semantics)
type Catch = {
  ErrorEquals: string[]; // Error types to catch (matches ASL)
  // Examples: ["States.ALL"], ["States.TaskFailed"], ["States.Timeout"], ["CustomError"]
  // States.ALL catches all errors
  // States.TaskFailed catches task execution failures
  // States.Timeout catches timeout errors
  // States.Permissions catches permission errors
  // Custom error names can be used for application-specific errors
  Next: string; // State to transition to on error (matches ASL)
  ResultPath?: StringOrJSONataExpression; // JSONata expression for where to store error in data (ASL uses JSONPath, we use JSONata)
  // Example: "{% $data.error %}" or "{% $.errorInfo %}"
}
```

---

## Key Design Patterns

**JSONata Expression Wrappers:**
- All JSONata expressions must be wrapped in `{% %}` delimiters
- See: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html

**Assign and Output Execution:**
- Assign and Output steps occur in parallel. If you choose to transform data during variable assignment, that transformed data will not be available in the Output step. You must reapply the JSONata transformation in the Output step.
- If an "Assign" field is provided, the interpreter first evaluates the new value for each variable, and then performs the assignments. Any variable referenced in an "Assign" field sees its current value as it was when the state was entered, and each variable's new value only takes effect in the next state.

**Function Signatures:**
- Functions can be defined with an optional signature which specifies the parameter types of the function. If supplied, the evaluation engine will validate the arguments passed to the function before it is invoked. A dynamic error is thrown if the argument list does not match the signature. https://docs.jsonata.org/programming#function-signatures


## Context Functions

### AWS Step Functions JSONata Functions

AWS Step Functions provides these functions natively in JSONata expressions (see [AWS Documentation](https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html#jsonata-functions-provided-by-sfn)):
// Note: Built-in JSONata functions that require integer values as parameters will automatically round down any non-integer numbers provided.

- `$sfn.partition()` - intrinsic function to partition a large array. The first parameter is the array to partition, the second parameter is an integer representing the chunk size. The return value will be a two-dimensional array.
- `$sfn.range()` - intrinsic function to generate an array of values. This function takes three parameters. The first argument is an integer representing the first element of the new array, the second argument is an integer representing the final element of the new array, and the third argument is the delta value integer for the elements in the new array. The return value is a newly-generated array of values ranging from the first argument of the function to the second argument of the function with elements in between adjusted by the delta. The delta value can be positive or negative which will increment or decrement each element from the last until the end value is reached or exceeded.
- `$sfn.hash()` - intrinsic function to calculate the hash value of a given input. This function takes two parameters. The first argument is the source string to be hashed. The second argument is a string representing the hashing algorithm to for the hash calculation. The hashing algorithm must be one of the following values: "MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512". The return value is a string of the calculated hash of the data.
- `$sfn.random()` - intrinsic function to return a random number n where 0 ≤ n < 1. The function takes an optional integer argument representing the seed value of the random function. If you use this function with the same seed value, it returns an identical number. This overloaded function was created because the built-in JSONata function $random does not accept a seed value.
- `$sfn.uuid()` - intrinsic function. The function takes no parameters. This function return a v4 UUID. This function was created because JSONata does not natively support the ability to generate UUIDs.
- `$sfn.parse()` - JSONata function to deserialize JSON strings. The function takes a stringified JSON as its only argument. JSONata supports this functionality via $eval; however, $eval is not supported in Step Functions workflows.

### Custom Context Functions

```typescript
type ContextFunctionRegistry = {
  [functionName: string]: ContextFunction;
}

type ContextFunction = {
  description: string;
  parameters: Record<string, {
    type: "string" | "number" | "boolean" | "date" | "array" | "object";
    description: string;
    optional?: boolean;
  }>;
  returns: {
    type: "string" | "number" | "boolean" | "date" | "array" | "object";
    description: string;
  };
  implementation: string; // JavaScript function code: (args, context) => returnType
}

// Example custom functions
const DEFAULT_CONTEXT_FUNCTIONS: ContextFunctionRegistry = {
};
```

### JSONata Context Variables

The execution context provides these variables to JSONata expressions:

```typescript
type JSONataContext = {
  // $ - Root input document (current state input)
  $: unknown;
  
  // $data - Global data object (persistent across all states)
  $data: Record<string, unknown>;
  
  // $rootState - Root state runtime values (injected at execution time, not part of StateMachine definition)
  $rootState: {
    Context: StaticJson; // Runtime context (e.g., time, user info)
    Input?: StaticJson; // User request parameters
    contextFunctions?: ContextFunctionRegistry; // Available context functions
  };
  
  // $states - State execution context
  $states: {
    input: unknown; // Current state input
    output: unknown; // Previous state output (if available)
  };
  
  // Map context (only available in Map state iterator)
  $item?: unknown; // Current item in map iteration
  $index?: number; // Current index in map iteration
  
  // Context functions (custom functions registered in plan)
  $now?: () => string;
  $addDays?: (date: string, days: number) => string;
  // ... other context functions from contextFunctions registry
}
```

---

## Code Examples

### Complete Example: Update Overdue Todos

```json
{
  "planName": "Find and update overdue high-priority todos",
  "planSummary": "Retrieve all todos, filter for overdue high-priority items, show preview, get confirmation, then update status to urgent",
  "StartAt": "FetchTodos",
  // Note: rootState is a runtime value, not part of StateMachine definition
  // This shows what would be injected at execution time:
  // rootState: {
  //   Context: { /* runtime context */ },
  //   Input: {
  //     "priority": "high",
  //     "targetStatus": "urgent",
  //     "userRequest": "Show me all overdue high-priority todos and mark them as urgent"
  //   }
  // }
  "States": {
    "FetchTodos": {
      "Type": "Task",
      "Comment": "Fetch all todos from the API",
      "Resource": "listTodos",
      "Arguments": {
        "query": {
          "status": null
        }
      },
      "Output": "{% $ %}",
      "Assign": {
        "allTodos": "{% $ %}"
      },
      "Next": "FilterTodos",
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed", "States.Timeout"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "ResultPath": "{% $data.error %}",
          "Next": "ShowError"
        }
      ]
    },
    "FilterTodos": {
      "Type": "Pass",
      "Comment": "Filter todos to find overdue high-priority items",
      "Output": "{% $data | { filteredTodos: $filter($data.allTodos.data, function($todo) { $todo.priority = $rootState.Input.priority and $todo.status != 'urgent' and $compare($todo.dueDate, $now(), '<') }), filteredCount: $count($filter($data.allTodos.data, function($todo) { $todo.priority = $rootState.Input.priority and $todo.status != 'urgent' and $compare($todo.dueDate, $now(), '<') })) } %}",
      "Assign": {
        "filteredTodos": "{% $filter($data.allTodos.data, function($todo) { $todo.priority = $rootState.Input.priority and $todo.status != 'urgent' and $compare($todo.dueDate, $now(), '<') }) %}",
        "filteredCount": "{% $count($filter($data.allTodos.data, function($todo) { $todo.priority = $rootState.Input.priority and $todo.status != 'urgent' and $compare($todo.dueDate, $now(), '<') })) %}"
      },
      "Next": "CheckIfEmpty"
    },
    "CheckIfEmpty": {
      "Type": "Choice",
      "Comment": "Check if any matching todos were found",
      "Choices": [
        {
          "Condition": "{% $data.filteredCount = 0 %}",
          "Next": "ShowNoResults"
        },
        {
          "Condition": "{% $data.filteredCount > 50 %}",
          "Next": "ShowLargeBatchWarning"
        }
      ],
      "Default": "ShowPreview"
    },
    "ShowPreview": {
      "Type": "Task",
      "Comment": "Show preview of todos to be updated and get confirmation",
      "Resource": "Display",
      "Arguments": {
        "data": "{% { todos: $data.filteredTodos, count: $data.filteredCount } %}"
      },
      "DisplayParams": {
        "dataStructure": "{ todos: Array<{ id: string; title: string; dueDate: string; priority: string; status: string; }>; count: number; }",
        "subGoal": "{% 'Confirm update of ' & $data.filteredCount & ' todos to urgent status' %}",
        "stepType": "confirm",
        "actions": [
          {
            "id": "confirm",
            "label": "{% 'Confirm & Update (' & $data.filteredCount & ')' %}",
            "variant": "primary",
            "continues": true
          },
          {
            "id": "cancel",
            "label": "Cancel",
            "variant": "secondary",
            "continues": false
          }
        ]
      },
      "Assign": {
        "userAction": "{% $ %}"
      },
      "Next": "CheckConfirmation"
    },
    "CheckConfirmation": {
      "Type": "Choice",
      "Comment": "Check if user confirmed or cancelled",
      "Choices": [
        {
          "Condition": "{% $data.userAction.actionId = 'confirm' %}",
          "Next": "UpdateTodos"
        }
      ],
      "Default": "ShowCancelled"
    },
    "UpdateTodos": {
      "Type": "Map",
      "Comment": "Update each todo to urgent status",
      "Items": "{% $data.filteredTodos %}",
      "MaxConcurrency": 5,
      "ItemProcessor": {
        "QueryLanguage": "JSONata",
        "Comment": "Process each todo item",
        "StartAt": "UpdateSingleTodo",
        "States": {
          "UpdateSingleTodo": {
            "Type": "Task",
            "Comment": "Update a single todo to urgent status",
            "Resource": "updateTodo",
            "Arguments": {
              "id": "{% $item.id %}",
              "status": "{% $rootState.Input.targetStatus %}",
              "modifiedAt": "{% $now() %}"
            },
            "Output": "{% $ %}",
            "End": true
          }
        }
      },
      "Assign": {
        "updateResults": "{% $ %}"
      },
      "Next": "ShowResults"
    },
    "ShowResults": {
      "Type": "Pass",
      "Comment": "Calculate success/failure counts",
      "Output": "{% $data | { successCount: $count($filter($data.updateResults, function($r) { not($r.error) })), failureCount: $count($filter($data.updateResults, function($r) { $r.error })) } %}",
      "Assign": {
        "successCount": "{% $count($filter($data.updateResults, function($r) { not($r.error) })) %}",
        "failureCount": "{% $count($filter($data.updateResults, function($r) { $r.error })) %}"
      },
      "Next": "ShowFinalResult"
    },
    "ShowFinalResult": {
      "Type": "Task",
      "Comment": "Show final results",
      "Resource": "Display",
      "Arguments": {
        "data": "{% { successCount: $data.successCount, failureCount: $data.failureCount, message: 'Updated ' & $data.successCount & ' todos successfully' } %}"
      },
      "DisplayParams": {
        "dataStructure": "{ successCount: number; failureCount: number; message: string; }",
        "subGoal": "Update complete",
        "stepType": "result",
        "actions": [
          {
            "id": "ok",
            "label": "OK",
            "variant": "primary",
            "continues": false
          }
        ]
      },
      "Next": "SuccessState"
    },
    "SuccessState": {
      "Type": "Succeed",
      "Comment": "Execution completed successfully"
    },
    "ShowError": {
      "Type": "Task",
      "Comment": "Show error message",
      "Resource": "Display",
      "Arguments": {
        "data": "{% { error: $data.error, message: 'An error occurred while fetching todos' } %}"
      },
      "DisplayParams": {
        "dataStructure": "{ error: string; message: string; }",
        "subGoal": "Error occurred",
        "stepType": "error",
        "actions": [
          {
            "id": "retry",
            "label": "Retry",
            "variant": "primary",
            "continues": true
          },
          {
            "id": "cancel",
            "label": "Cancel",
            "variant": "secondary",
            "continues": false
          }
        ]
      },
      "Assign": {
        "userAction": "{% $ %}"
      },
      "Next": "HandleErrorAction"
    },
    "HandleErrorAction": {
      "Type": "Choice",
      "Comment": "Handle user's error response",
      "Choices": [
        {
          "Condition": "{% $data.userAction.actionId = 'retry' %}",
          "Next": "FetchTodos"
        }
      ],
      "Default": "FailState"
    },
    "FailState": {
      "Type": "Fail",
      "Error": "UserCancelled",
      "Cause": "User cancelled the operation"
    },
    "ShowNoResults": {
      "Type": "Task",
      "Comment": "Display message that no matching todos were found",
      "Resource": "Display",
      "Arguments": {
        "data": "{% { message: 'No overdue high-priority todos found' } %}"
      },
      "DisplayParams": {
        "dataStructure": "{ message: string; }",
        "subGoal": "No matching todos found",
        "stepType": "result",
        "actions": [
          {
            "id": "ok",
            "label": "OK",
            "variant": "primary",
            "continues": false
          }
        ]
      },
      "Next": "SuccessState"
    }
  }
}
```

### Example: Complex Choice with And/Or

```json
{
  "ComplexCondition": {
    "Type": "Choice",
    "Comment": "Complex condition with And/Or using JSONata",
    "Choices": [
        {
          "Condition": "{% $data.filteredCount > 0 and ($data.userAction.actionId = 'confirm' or $data.autoConfirm = true) %}",
          "Next": "UpdateTodos"
        },
        {
          "Condition": "{% $data.filteredCount > 100 %}",
          "Next": "ShowLargeBatchWarning"
        }
    ],
    "Default": "ShowCancelled"
  }
}
```

### Example: Parallel Execution

```json
{
  "FetchMultipleData": {
    "Type": "Parallel",
    "Comment": "Fetch todos and categories in parallel",
    "Branches": [
      {
        "StartAt": "FetchTodos",
        "States": {
          "FetchTodos": {
            "Type": "Task",
            "Resource": "listTodos",
            "End": true
          }
        }
      },
      {
        "StartAt": "FetchCategories",
        "States": {
          "FetchCategories": {
            "Type": "Task",
            "Resource": "listCategories",
            "End": true
          }
        }
      }
    ],
    "Assign": {
      "todos": "{% $[0] %}",
      "categories": "{% $[1] %}"
    },
    "Next": "ProcessResults"
  }
}
```

### Example: Serial Execution with Break Condition

This example shows Serial state executing multiple search queries sequentially, stopping when either 20 results are accumulated OR 5 search attempts have been made (whichever comes first):

```json
{
  "SearchOrdersSequentially": {
    "Type": "Serial",
    "Comment": "Try multiple search queries sequentially until we have enough results",
    "Steps": [
      {
        "QueryLanguage": "JSONata",
        "Comment": "Search by order ID",
        "StartAt": "SearchByOrderId",
        "States": {
          "SearchByOrderId": {
            "Type": "Task",
            "Comment": "Search for orders by ID",
            "Resource": "searchOrders",
            "Arguments": {
              "query": "{% $rootState.Input.orderId %}",
              "searchField": "orderId"
            },
            "Output": "{% $ %}",
            "Assign": {
              "searchResults_0": "{% $ %}",
              "totalResults": "{% $count($append($data.totalResults default [], $.results)) %}",
              "allResults": "{% $append($data.allResults default [], $.results) %}"
            },
            "End": true
          }
        }
      },
      {
        "QueryLanguage": "JSONata",
        "Comment": "Search by customer name",
        "StartAt": "SearchByCustomerName",
        "States": {
          "SearchByCustomerName": {
            "Type": "Task",
            "Comment": "Search for orders by customer name",
            "Resource": "searchOrders",
            "Arguments": {
              "query": "{% $rootState.Input.customerName %}",
              "searchField": "customerName"
            },
            "Output": "{% $ %}",
            "Assign": {
              "searchResults_1": "{% $ %}",
              "totalResults": "{% $count($append($data.allResults, $.results)) %}",
              "allResults": "{% $append($data.allResults, $.results) %}"
            },
            "End": true
          }
        }
      },
      {
        "QueryLanguage": "JSONata",
        "Comment": "Search by email",
        "StartAt": "SearchByEmail",
        "States": {
          "SearchByEmail": {
            "Type": "Task",
            "Comment": "Search for orders by email",
            "Resource": "searchOrders",
            "Arguments": {
              "query": "{% $rootState.Input.email %}",
              "searchField": "email"
            },
            "Output": "{% $ %}",
            "Assign": {
              "searchResults_2": "{% $ %}",
              "totalResults": "{% $count($append($data.allResults, $.results)) %}",
              "allResults": "{% $append($data.allResults, $.results) %}"
            },
            "End": true
          }
        }
      },
      {
        "QueryLanguage": "JSONata",
        "Comment": "Search by phone number",
        "StartAt": "SearchByPhone",
        "States": {
          "SearchByPhone": {
            "Type": "Task",
            "Comment": "Search for orders by phone",
            "Resource": "searchOrders",
            "Arguments": {
              "query": "{% $rootState.Input.phone %}",
              "searchField": "phone"
            },
            "Output": "{% $ %}",
            "Assign": {
              "searchResults_3": "{% $ %}",
              "totalResults": "{% $count($append($data.allResults, $.results)) %}",
              "allResults": "{% $append($data.allResults, $.results) %}"
            },
            "End": true
          }
        }
      },
      {
        "QueryLanguage": "JSONata",
        "Comment": "Search by address",
        "StartAt": "SearchByAddress",
        "States": {
          "SearchByAddress": {
            "Type": "Task",
            "Comment": "Search for orders by shipping address",
            "Resource": "searchOrders",
            "Arguments": {
              "query": "{% $rootState.Input.address %}",
              "searchField": "shippingAddress"
            },
            "Output": "{% $ %}",
            "Assign": {
              "searchResults_4": "{% $ %}",
              "totalResults": "{% $count($append($data.allResults, $.results)) %}",
              "allResults": "{% $append($data.allResults, $.results) %}"
            },
            "End": true
          }
        }
      }
    ],
    "BreakCondition": "{% $data.totalResults >= 20 or $index >= 4 %}",
    "Assign": {
      "serialStepOutputs": "{% $ %}",
      "finalResultCount": "{% $data.totalResults %}"
    },
    "Next": "DeduplicateResults"
  },
  "DeduplicateResults": {
    "Type": "Pass",
    "Comment": "Remove duplicate orders from combined results",
    "Output": "{% $data | { uniqueOrders: $distinct($data.allResults, function($order) { $order.id }), searchesPerformed: $index + 1 } %}",
    "Assign": {
      "uniqueOrders": "{% $distinct($data.allResults, function($order) { $order.id }) %}",
      "uniqueCount": "{% $count($distinct($data.allResults, function($order) { $order.id })) %}",
      "searchesPerformed": "{% $index + 1 %}"
    },
    "Next": "ShowResults"
  }
}
```

**Key Points About Serial State:**

1. **Single-Threaded Execution**: Each step fully completes before the next begins (unlike Parallel)
2. **Accumulated Context**: Each step can access results from previous steps via `$data`
3. **Early Termination**: Optional `BreakCondition` is evaluated after each step completes
4. **Loop Variables**: 
   - `$index` - Current step index (0-based, e.g., 0 for first step, 1 for second, etc.)
   - `$stepCount` - Total number of steps defined
5. **Break Condition**: In the example above, execution stops when:
   - 20 or more results accumulated (`$data.totalResults >= 20`), OR
   - 5 attempts completed (`$index >= 4`, meaning steps 0-4 have executed)
   - If condition is true, proceeds to the Serial state's `Next` field
6. **Output Array**: Serial state output is an array of each executed step's output (excluding steps after break)

**Comparison: Serial vs Parallel vs Map**

| State Type | Execution Model | Use Case |
|------------|----------------|----------|
| **Parallel** | Concurrent (multi-threaded) | Execute independent tasks simultaneously (e.g., fetch todos AND categories at same time) |
| **Serial** | Sequential (single-threaded) | Execute dependent tasks in order with optional early exit (e.g., try searches until enough results) |
| **Map** | Iterate over array | Process each item in a collection (e.g., update status of each todo in a list) |

---

## Resource Links

### Amazon States Language Documentation

- [Amazon States Language Specification](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html)
- [Choice State Documentation](https://docs.aws.amazon.com/step-functions/latest/dg/state-choice.html)
- [Task State Documentation](https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html)
- [Error Handling Documentation](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [Data Transformation with JSONata](https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html#querylanguage-field)
- [JSONata Functions Provided by Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html#jsonata-functions-provided-by-sfn)

### JSONata Documentation

- [JSONata Language Guide](https://docs.jsonata.org/simple)
- [JSONata Functions](https://docs.jsonata.org/operators)
- [JSONata Expression Examples](https://docs.jsonata.org/examples)

### Related WAP Documentation

- [WAP Dynamic UI Orchestration Spec](./wap-dynamic-ui-orchestration-spec.md)
- [WAP Technical Design](./technical-design.md)

---

## Summary

The WAP Workflow States Language provides a declarative, transparent, and efficient way to execute multi-step workflows. By adopting Amazon States Language conventions and using JSONata for all data transformations, we achieve:

1. **Transparency**: Full plan visible before execution
2. **Determinism**: Fixed execution path after confirmation
3. **Safety**: Sandboxed execution environment
4. **Efficiency**: Single LLM call for plan generation
5. **Flexibility**: Support for complex workflows with parallel execution, sequential execution with early termination (Serial), error handling, and user interactions

The design is fully compatible with ASL naming conventions while restricting it to JSONata-only (no JSONPath) data transformation capabilities. WAP extends ASL with the Serial state type for single-threaded sequential execution with optional break conditions.

