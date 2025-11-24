# WAP State Machine Execution Rules

**Version:** 1.0  
**Status:** Specification  
**Last Updated:** January 2025  
**Owner:** MidEarth Labs

This document defines the execution rules for the WAP (Web Agent Protocol) State Machine executor. These rules are based on Amazon States Language (ASL) semantics with JSONata query language.

---

## Table of Contents

1. [State Input/Output Flow](#1-state-inputoutput-flow)
2. [Assign and Output Execution](#2-assign-and-output-execution)
3. [Arguments Field](#3-arguments-field)
4. [Immutability and Cloning](#4-immutability-and-cloning)
5. [Choice State Execution](#5-choice-state-execution)
6. [Error Handling and Retry](#6-error-handling-and-retry)
7. [Terminal States](#7-terminal-states)
8. [Timeout Handling](#8-timeout-handling)
9. [JSONata Expression Evaluation](#9-jsonata-expression-evaluation)
10. [Execution Persistence and Resumability](#10-execution-persistence-and-resumability)
11. [Context Object](#11-context-object)

---

## 1. State Input/Output Flow

### Rule 1.1: Initial State Input
- The first state (specified by `StartAt`) receives the state machine input as its input
- Initial input is available via `$states.input` or `$` in JSONata expressions

### Rule 1.2: State-to-State Transition
- The output of state N becomes the input of state N+1
- If state N has no `Output` field:
  - **Task/Map/Parallel/Serial**: `$states.result` becomes output
  - **Other states**: `$states.input` becomes output (pass-through)
- Previous state output is available via `$states.output` in JSONata expressions
- Current state input is available via `$states.input` or `$` in JSONata expressions

### Rule 1.3: Default Output Behavior
- If `Output` is not specified:
  - Task/Map/Parallel/Serial: `$states.result` becomes output
  - Other states: `$states.input` becomes output
- If `Output` is specified: JSONata expression result becomes output
- `Output` can be a JSON object (with nested JSONata) or a single JSONata expression

---

## 2. Assign and Output Execution

### Rule 2.1: Parallel Evaluation
- `Assign` and `Output` are evaluated in parallel (same snapshot of state)
- `Assign` expressions see variables as they were when the state was entered
- `Output` expressions see `$states.result` (Task/Map/Parallel/Serial) or `$states.input` (other states)
- `Output` cannot see variables assigned in the same state's `Assign`

### Rule 2.2: Assign Variable Scope (ASL Standard)
- Variables assigned via `Assign` become top-level variables in subsequent states
- Example: `Assign: { "count": 5 }` → accessible as `$count` (not `$data.count`)
- Assignments take effect in the next state (not in the current state's `Output`)
- Variables are accessible by name in all JSONata expressions in subsequent states

### Rule 2.3: Assign Evaluation Order
1. Evaluate all `Assign` expressions (using current variable snapshot)
2. Evaluate `Output` expression (using `$states.result` or `$states.input`, not affected by `Assign`)
3. Apply assignments to variable registry (effective in next state)
4. Pass `Output` result to next state as input

**Example:**
```json
{
  "Type": "Pass",
  "Assign": { "count": "{% $count + 1 %}" },  // Uses OLD $count value
  "Output": "{% $count %}"  // Still sees OLD $count value
}
// Next state can access NEW $count value
```

---

## 3. Arguments Field

### Rule 3.1: Arguments Evaluation
- `Arguments` (Task, Parallel, Serial states) transforms input before execution
- If `Arguments` is specified, it replaces the state's input
- If `Arguments` is not specified, state receives input unchanged
- `Arguments` can be a JSON object (with nested JSONata) or a single JSONata expression

### Rule 3.2: Arguments Context
- `Arguments` expressions can reference:
  - `$states.input` (current state input)
  - `$states.context` (context object)
  - Variables assigned in previous states (by name, e.g., `$count`)
- `Arguments` MUST NOT reference `$states.result` or `$states.errorOutput`

---

## 4. Immutability and Cloning

### Rule 4.1: State Input Immutability
- State inputs are immutable within a state
- Modifications to input do not affect the original data
- Variables assigned via `Assign` are mutable across states

### Rule 4.2: Parallel State Cloning
- Each branch in a `Parallel` state receives a deep copy of the Parallel state's input
- Branches execute independently with isolated input copies
- Branch outputs are collected into an array `[branch1Output, branch2Output, ...]`
- The Parallel state's `Output` field can transform this array
- If `Arguments` is specified on Parallel, it transforms input before cloning to branches

### Rule 4.3: Map State Cloning
- Each iteration in a `Map` state receives:
  - A deep copy of the current item (via `ItemSelector` if specified, otherwise the item itself)
  - The item is available as `$item` in the iteration context
  - The index is available as `$index` (0-based)
- If `ItemSelector` is specified, it transforms each item before passing to iteration
- Map outputs are collected into an array of iteration results
- The Map state's `Output` field can transform this array

### Rule 4.4: Serial State Cloning (WAP Extension)
- Each step in a `Serial` state receives:
  - A deep copy of the Serial state's input (for the first step)
  - Subsequent steps receive the Serial state's input (not previous step outputs)
  - Each step can access previous steps' results via variables (assigned via `Assign` in previous steps)
- Context variables available:
  - `$index` (0-based step index)
  - `$stepCount` (total number of steps)
- Serial outputs are collected into an array of step outputs (only executed steps)
- The Serial state's `Output` field can transform this array
- If `BreakCondition` is true after a step, that step's output is included, but subsequent steps are not executed

---

## 5. Choice State Execution

### Rule 5.1: Choice Rule Evaluation
- Choice rules are evaluated in order (first match wins)
- Each rule's `Condition` is evaluated as a JSONata expression (must return boolean)
- When a rule matches:
  1. Evaluate that rule's `Assign` (if present)
  2. Evaluate that rule's `Output` (if present)
  3. Transition to the rule's `Next` state

### Rule 5.2: Choice Default Path
- If no rule matches and `Default` is specified:
  1. Evaluate top-level `Assign` (if present)
  2. Evaluate top-level `Output` (if present)
  3. Transition to `Default` state
- If no rule matches and no `Default` is specified: execution fails

### Rule 5.3: Choice Output Behavior
- Choice state supports `Output` at two levels:
  - Top-level `Choice.Output`: Applied when Default path is taken
  - `ChoiceRule.Output`: Applied when that specific rule matches
- Only one `Output` is applied (either rule-level or top-level, never both)

---

## 6. Error Handling and Retry

### Rule 6.1: Retry Execution
- Retry policies are evaluated after a state fails
- If error matches `ErrorEquals`, retry is attempted
- Retry uses exponential backoff: `delay = min(IntervalSeconds * (BackoffRate ^ attempt), MaxDelaySeconds)`
- If `RequireUserConfirmation` is true (WAP extension), wait for user confirmation before retry
- After `MaxAttempts`, if no retry matches, proceed to Catch handlers

### Rule 6.2: Catch Execution
- Catch handlers are evaluated in order after retries are exhausted
- If error matches `ErrorEquals`, catch handler executes:
  1. Store error at `ResultPath` (if specified) - this becomes a variable accessible in next state
  2. Evaluate `Assign` (if present) - can reference `$states.errorOutput`
  3. Transition to `Next` state
- If no catch handler matches: execution fails

---

## 7. Terminal States

### Rule 7.1: Succeed State
- Always terminates execution successfully
- `Output` field (if present) becomes the final execution result
- No `Next` or `End` field allowed

### Rule 7.2: Fail State
- Always terminates execution with failure
- `Error` and `Cause` fields (JSONata expressions) are evaluated and returned
- No `Next`, `End`, or `Output` field allowed

### Rule 7.3: End Field
- Any state with `End: true` terminates execution successfully
- `Output` field (if present) becomes the final execution result
- Cannot have both `End: true` and `Next` field

---

## 8. Timeout Handling

### Rule 8.1: State Machine Timeout
- If `TimeoutSeconds` is specified at state machine level, execution fails with `States.Timeout` if exceeded

### Rule 8.2: Task Timeout
- If `TimeoutSeconds` is specified on a Task, task execution fails with `States.Timeout` if exceeded
- If `HeartbeatSeconds` is specified, task must send heartbeat signals or fails with `States.Timeout`

---

## 9. JSONata Expression Evaluation

### Rule 9.1: Expression Wrappers
- All JSONata expressions must be wrapped in `{% %}` delimiters
- Static values (strings, numbers, booleans) are used as-is
- String values wrapped in `{% %}` are evaluated as JSONata

### Rule 9.2: Context Variables (ASL Standard)
- `$states.input`: Current state input
- `$states.result`: State's result (Task, Map, Parallel, Serial states only)
- `$states.errorOutput`: Error output (Catch blocks only)
- `$states.context`: Context object (runtime values like time, execution info)
- Variables assigned via `Assign`: Accessible by name (e.g., `$count`, `$todos`)
- `$item`, `$index`: Map iteration context (only in Map states)
- `$index`, `$stepCount`: Serial execution context (only in Serial states)

### Rule 9.3: Expression Restrictions (ASL Standard)
- JSONata expressions MUST NOT use `$` or unqualified field names at the top level
- JSONata expressions MUST NOT use `$$` (always refers to input document in standard JSONata)
- Variables must be referenced explicitly (e.g., `$states.input.field`, not `$.field` at top level)
- Nested expressions can use `$` or unqualified names in context (e.g., `$filter($items, function($item) { $item.value > 10 })`)

### Rule 9.4: Expression Errors
- If JSONata expression evaluation fails: throw `States.QueryEvaluationError`
- Expression errors can be caught by Catch handlers

---

## 10. Execution Persistence and Resumability

### Rule 10.1: Execution State
- Execution state must be persisted after each state completes
- Execution state includes:
  - Current state ID
  - Variable registry (all variables assigned via `Assign`)
  - Previous state output (`$states.output`)
  - Current state input (`$states.input`)
  - Execution history (for replayability)
  - Error state (if any)

### Rule 10.2: Resumption
- Execution can be resumed from any persisted checkpoint
- On resumption:
  1. Restore variable registry (all assigned variables)
  2. Restore previous state output
  3. Restore current state input
  4. Continue from current state ID
  5. Replay execution history if needed

### Rule 10.3: Determinism
- Execution must be deterministic (same input → same output)
- Non-deterministic operations (e.g., random numbers) should use seeds
- Time-dependent operations should use `$states.context` time values

---

## 11. Context Object

### Rule 11.1: Context Object Structure
- `$states.context` is provided by the interpreter
- Contains runtime execution information:
  - `Execution.Id`: Execution identifier
  - `Execution.StartTime`: Execution start timestamp
  - `Execution.ElapsedTime`: Elapsed time since start
  - Custom context fields (WAP-specific extensions)
- Context is read-only and immutable

### Rule 11.2: Context Access
- `$states.context` is available in all JSONata expressions
- Can be referenced in `Arguments`, `Output`, `Assign`, `Condition` fields
- Example: `"{% $states.context.ElapsedTime %}"`

---

## Summary

These execution rules ensure:
- **ASL Compliance**: Full alignment with Amazon States Language semantics
- **Determinism**: Same input always produces same output
- **Durability**: Execution state can be persisted and resumed
- **Transparency**: Clear rules for data flow and transformations
- **Extensibility**: Support for WAP-specific extensions (Serial state, DisplayTask) while maintaining ASL compatibility

