# Policy Extraction to State Machine: Process & Mental Model

**Purpose:** Generic process for extracting business policies from natural language into executable state machine workflows.

**Status:** Proven Process  
**Last Updated:** [Date]

---

## Overview

This document describes a systematic process for reverse engineering natural language business policies into exhaustive, maintainable workflow state machines. The process emphasizes separation of concerns, configuration-driven design, and incremental development.

---

## Mental Model

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│  Layer 1: Configuration (Context)   │
│  - Policy rules as data             │
│  - Business constants               │
│  - Category definitions             │
│  - Thresholds and limits            │
└──────────────┬──────────────────────┘
               │ (passed at execution)
               v
┌─────────────────────────────────────┐
│  Layer 2: State Machine (Logic)     │
│  - Decision making                  │
│  - Data transformations             │
│  - Flow control                     │
│  - Orchestration                    │
└──────────────┬──────────────────────┘
               │ (reads from context)
               v
┌─────────────────────────────────────┐
│  Layer 3: Execution                  │
│  - Runtime execution                │
│  - Context injection                │
│  - Result processing                │
└─────────────────────────────────────┘
```

### Key Principles

1. **Configuration vs Logic Separation**
   - Configuration (what): Policy rules, constants, thresholds → Context
   - Logic (how): Decision making, transformations, flow → State Machine

2. **Composition over Duplication**
   - Sub-workflows for cohesive, multi-step logic
   - Pass states for simple transformations
   - Reusable components

3. **Single Source of Truth**
   - Each rule exists in exactly one place (context)
   - State machines read from context, don't hardcode

4. **Change Impact Clarity**
   - Policy value change → Update context only
   - Policy schema change → Update context schema + maybe state machine
   - Logic change → Update state machine only

---

## Process Steps

### Phase 1: Initial Extraction & Modeling

#### Step 1.1: Extract Entities
**Goal:** Identify all nouns and their properties

**Process:**
1. Read through policy document systematically
2. List all entities (Request, Item, Purchase, etc.)
3. For each entity, extract all attributes mentioned
4. Define enum types for categorical values
5. Document relationships between entities

**Output:** Entity definitions with attributes and relationships

**Checkpoint:** Can you answer "What is a [entity]?" with all its properties?

---

#### Step 1.2: Extract Business Rules
**Goal:** Convert policy statements into evaluable predicates

**Process:**
1. For each policy statement, create a predicate/function
2. Write expressions (JSONata) for each condition
3. Document dependencies between rules
4. Identify decision points
5. Map rules to policy sections for traceability

**Output:** Business rules as predicates with expressions

**Checkpoint:** Can you evaluate "Is this [action] eligible?" for any scenario?

---

#### Step 1.3: Define Operations
**Goal:** Identify all actions the system can perform

**Process:**
1. List all operations (validate, calculate, process, etc.)
2. Define input/output types
3. Map operations to state machine states
4. Identify which become Pass states vs sub-workflows
5. Identify parallelizable operations

**Output:** Operations mapped to state machine components

**Checkpoint:** Can you process a [request] from start to finish using these operations?

---

#### Step 1.4: Build Decision Trees
**Goal:** Visualize complex conditional logic

**Process:**
1. Start with main decision point
2. Branch on each condition
3. Map all paths to outcomes
4. Identify rejection points
5. Document edge cases

**Output:** Decision trees for complex logic flows

**Checkpoint:** Can you trace any scenario through the decision tree?

---

#### Step 1.5: Document Clarifications, Assumptions, Conflicts & Gaps
**Goal:** Surface ambiguities and decisions before implementation

**Process:**
1. **Clarifications Needed:**
   - List ambiguous policy statements that need stakeholder input
   - Identify missing definitions or unclear terms
   - Document questions about edge cases
   
2. **Assumptions Made:**
   - Document all interpretive decisions
   - State default behaviors when policy is silent
   - Note business logic inferred from context
   - Include rationale for each assumption
   
3. **Conflicts Identified:**
   - Document contradictory policy statements
   - Highlight inconsistent rules
   - Note overlapping or competing requirements
   - Propose resolution strategies
   
4. **Policy Gaps:**
   - Identify scenarios not covered by policy
   - List missing rules for edge cases
   - Document boundary conditions needing definition
   - Suggest completeness improvements

**Output Format:**
```markdown
## Phase 1 Review: Clarifications, Assumptions, Conflicts & Gaps

### Clarifications Needed
1. [Question about policy X] - Need stakeholder input on [specific scenario]
2. [Unclear term Y] - What does "reasonable time" mean quantitatively?

### Assumptions Made  
1. [Assumption A] - When policy is silent on [X], we assume [Y] because [rationale]
2. [Assumption B] - Default behavior for [edge case] is [action] to align with [principle]

### Conflicts Identified
1. [Conflict C] - Section 2.1 states [X] but Section 3.4 states [Y]
   - Proposed Resolution: [Solution with justification]

### Policy Gaps
1. [Gap G] - No rule defined for [scenario]. Suggest: [proposed rule]
2. [Gap H] - Boundary condition [X] not addressed. Need: [clarification]
```

**Review Gate:** 
- ✅ Present to stakeholders for approval
- ✅ Document resolutions and decisions
- ✅ Update policy document with clarifications
- ✅ Finalize as Version 1.0 - Initial Policy Model
- ✅ Proceed to SOLID Analysis only after approval

**Checkpoint:** Are all ambiguities resolved and documented?

**Version Milestone:** After Review Gate 1 approval, finalize as **Version 1.0 - Initial Policy Model**

---

### Phase 2: SOLID Analysis

#### Step 2.1: DRY Analysis
**Goal:** Identify rule duplication

**Process:**
1. Find rules that appear in multiple places
2. Identify hardcoded values that should be configuration
3. Find repeated calculations
4. Document violations with examples

**Output:** List of DRY violations with recommendations

**Key Questions:**
- Does this rule appear in more than one place?
- Is this value hardcoded when it should be configuration?
- Can this calculation be reused?

---

#### Step 2.2: SRP Analysis
**Goal:** Ensure single responsibility per component

**Process:**
1. Identify functions/components with multiple responsibilities
2. Separate concerns (physical restrictions vs business rules)
3. Create focused components (one responsibility each)
4. Compose components, don't mix concerns

**Output:** Refactored components with single responsibilities

**Key Questions:**
- Does this component do more than one thing?
- Can responsibilities be separated?
- Is this component easy to test independently?

---

#### Step 2.3: Abstraction Level Analysis
**Goal:** Ensure proper abstraction layers

**Process:**
1. Identify configuration that should be data (not code)
2. Separate policy definitions from evaluation logic
3. Create clear layers: Configuration → Services → Orchestration
4. Ensure policy changes don't require code changes

**Output:** Refactored architecture with clear abstraction layers

**Key Questions:**
- Is this policy rule hardcoded in logic?
- Can this be moved to configuration?
- Are abstraction levels clear?

**Version Milestone:** After completing SOLID Analysis, create **Version 2.0 - SOLID-Improved Model** that incorporates all refactoring recommendations.

**Checkpoint:** Have all SOLID violations been identified and refactoring recommendations documented?

---

### Phase 3: Policy Rewrite

#### Step 3.1: Generate Rewritten Policy Document
**Goal:** Create authoritative, unambiguous policy specification for final review

**Purpose:** 
- Bridge between natural language policy and technical implementation
- Enable non-technical stakeholders to validate logic
- Serve as source of truth for implementation
- Document SOLID design decisions in business language

**Process:**

1. **Structure with Precision Language:**
   - Use **MUST** for mandatory requirements
   - Use **SHOULD** for recommended but not required
   - Use **CAN** for optional/permitted actions
   - Use **MAY/MIGHT** for conditional possibilities
   - Use **AND, OR, NOT** explicitly (avoid ambiguity)
   - Number all rules for traceability

2. **Organize Top-Down:**
   - Start with high-level workflow
   - Break down into logical sections
   - Reference detailed logic (don't inline everything)
   - Keep main policy document focused and readable

3. **Extract to References/Appendix:**
   - Reusable concepts (e.g., "Restricted Items" definition)
   - Complex calculations (e.g., "Return Window Calculation")
   - Category definitions (e.g., "Electronics Categories")
   - Threshold values (e.g., "Price Limits by Type")
   - Business predicates (e.g., "Eligibility Rules")

4. **Add Supporting Artifacts:**
   - **Example Scenarios:** Walk through concrete cases with expected outcomes
   - **Decision Tables:** For complex conditional logic
   - **Traceability Matrix:** Link original policy → rewritten policy sections
   - **Test Cases:** Expected behavior for edge cases

**Output Format:**
```markdown
# [Policy Name] - Rewritten Specification
Version: [X.Y]
Last Updated: [Date]
Status: Awaiting Review

## 1. High-Level Workflow

When a [request] is received, the system MUST:
1. Validate request completeness (see §A.1)
2. Check eligibility per Eligibility Rules (see Appendix B)
3. Calculate applicable windows per §2
4. Process items per §3
5. Return results per §4

## 2. Eligibility Determination

2.1. An item MUST meet ALL of the following:
   - Purchase date is within Return Window (see Appendix C.1)
   - Item category is NOT in Restricted Categories (see Appendix C.2)
   - Item condition meets Physical Requirements (see Appendix D)

2.2. The system SHOULD apply category-specific rules:
   - For Electronics: Additional checks per §2.2.1
   - For Clothing: Additional checks per §2.2.2

2.2.1. Electronics Eligibility
   An electronics item CAN be returned only if:
   - Serial number is intact AND
   - Packaging is available OR proof of purchase exists

## 3. Window Calculation

3.1. Default window is [Ref: default_return_window]
3.2. Extended windows apply per Appendix E

...

---

## Appendix A: Definitions

### A.1 Request Completeness
A request is complete if it contains:
- User ID (MUST)
- Purchase ID (MUST)  
- Item IDs (MUST, at least one)
- Reason code (SHOULD)

---

## Appendix B: Eligibility Rules

### B.1 Base Eligibility Rule
```
isEligible(item) := 
  isWithinWindow(item) AND
  NOT isRestricted(item) AND
  meetsPhysicalRequirements(item)
```

### B.2 Category-Specific Rules
[Define each predicate referenced above]

---

## Appendix C: Policy Parameters

### C.1 Return Windows
- Default: 90 days
- Electronics: 30 days
- Clothing: 60 days
- Holiday purchases: 120 days

### C.2 Restricted Categories
- Perishable items
- Personal care items
- Digital downloads
- Custom orders

---

## Appendix D: Physical Requirements
[Define inspection criteria]

---

## Appendix E: Decision Tables

### E.1 Category-Specific Window Resolution
| Category    | Condition           | Window |
|-------------|---------------------|--------|
| Electronics | Standard purchase   | 30     |
| Electronics | Holiday purchase    | 60     |
| Clothing    | Standard purchase   | 60     |
| Clothing    | Holiday purchase    | 90     |

---

## Appendix F: Example Scenarios

### Scenario 1: Standard Electronics Return
**Given:**
- Item: Laptop (Electronics category)
- Purchase date: 2024-01-15
- Request date: 2024-02-10
- Days elapsed: 26 days
- Condition: Sealed box with serial number intact

**Expected:**
- Eligibility: APPROVED
- Reason: Within 30-day electronics window, meets physical requirements
- Window used: Electronics-specific (30 days)

### Scenario 2: Restricted Item
[More scenarios]

---

## Appendix G: Traceability Matrix

| Original Policy Section | Rewritten Policy | State Machine Component |
|------------------------|------------------|-------------------------|
| Section 2.1 "Returns accepted within 90 days" | §3.1 Default Window | CalculateReturnWindow state |
| Section 2.3 "Electronics have 30-day limit" | §3.2, Appendix C.1 | GetCategoryWindow sub-workflow |

---

## Appendix H: Test Cases

1. **Valid standard return:** [Expected: Approved]
2. **Outside window:** [Expected: Rejected - "Outside return window"]
3. **Restricted category:** [Expected: Rejected - "Category not eligible"]
[More test cases]
```

**Review Gate:**
- ✅ Present to business stakeholders for validation
- ✅ Confirm all original policy statements are covered
- ✅ Verify precision language is correct
- ✅ Validate example scenarios match expected behavior
- ✅ Approve before proceeding to implementation

**Benefits:**
- Stakeholders can validate without reading code
- Serves as specification document for implementation
- Documents all design decisions and rationale
- Creates regression test scenarios
- Establishes version-controlled source of truth

**Checkpoint:** Can stakeholders approve this as the definitive policy specification?

---

### Phase 4: State Machine Architecture Design

#### Step 4.1: Identify Sub-Workflows
**Goal:** Determine cohesive, reusable workflows

**Process:**
1. Identify multi-step, cohesive logic
2. Group related operations
3. Define clear input/output contracts
4. Ensure single responsibility

**Criteria for Sub-Workflow:**
- ✅ Multiple steps involved
- ✅ Conditional branches needed
- ✅ Cohesive and reusable
- ✅ Clear input/output contract
- ❌ NOT for single Task or Choice state

**Output:** List of sub-workflows with responsibilities

---

#### Step 4.2: Identify Pass State Services
**Goal:** Determine simple transformation services

**Process:**
1. Identify simple calculations
2. Identify data enrichment steps
3. Identify preparation steps
4. Ensure single transformation per Pass state

**Criteria for Pass State:**
- ✅ Single transformation
- ✅ Simple calculation
- ✅ Data enrichment
- ✅ Preparation step

**Output:** List of Pass state services

---

#### Step 4.3: Design Context Schema
**Goal:** Define configuration structure

**Process:**
1. Extract all policy values to context schema
2. Define hierarchical structure (policy, categories, runtime)
3. Use TypeScript/types for type safety
4. Create example context with actual values
5. Document access patterns

**Output:** Context schema definition with example data

**Key Principles:**
- All policy rules as data
- No hardcoded values in state machines
- Clear structure for easy updates

**Review Gate:**
- ✅ Present architecture design to stakeholders
- ✅ Validate context schema structure
- ✅ Confirm sub-workflow boundaries
- ✅ Review state machine design patterns
- ✅ Approve before proceeding to implementation

**Checkpoint:** Is the architecture design ready for implementation?

---

### Phase 5: Implementation

#### Step 5.1: Build Sub-Workflows
**Goal:** Create reusable workflow components

**Process:**
1. Start with one sub-workflow
2. Use Pass states for transformations
3. Use Choice states for decisions
4. Read from context (not hardcoded)
5. Test independently
6. Repeat for each sub-workflow

**Output:** Reusable sub-workflow definitions

**Best Practices:**
- Single responsibility per sub-workflow
- Clear input/output contracts
- Read from context
- Document with comments

---

#### Step 5.1b: Design for Human Readability & Debuggability
**Goal:** Create granular, visually traceable state machines

**Core Principle:** Every named business rule/logic MUST be a separate, identifiable state for visual execution replay and debugging.

**Anti-Pattern to Avoid:**
```json
❌ BAD: Complex composite expression hiding multiple unrelated checks
{
  "CheckEligibility": {
    "Type": "Choice",
    "Choices": [{
      "Condition": "{% $isWithinWindow($item) and $notRestricted($item) and not $hasDefects($item) and $hasPurchaseProof($item) %}",
      "Next": "Approve"
    }],
    "Default": "Reject"
  }
}
```
**Problems:**
- Can't see which specific check failed
- Can't replay execution visually to understand flow
- Can't profile/debug individual rules
- Can't unit test components independently
- No documentation of what each check means

**Correct Pattern:**
```json
✅ GOOD: Each business rule is a named state with clear documentation
{
  "CheckReturnWindowCompliance": {
    "Type": "Choice",
    "Comment": "Business Rule: Item must be within return window",
    "Choices": [{
      "Comment": "Item is outside the return window - reject immediately",
      "Condition": "{% not $isWithinWindow($data.item, $rootState.Context) %}",
      "Assign": {
        "result": "rejected",
        "reason": "Outside return window"
      },
      "Next": "CompleteEligibility"
    }],
    "Default": "CheckCategoryRestriction"
  },
  
  "CheckCategoryRestriction": {
    "Type": "Choice",
    "Comment": "Business Rule: Item category must not be restricted",
    "Choices": [{
      "Comment": "Item category is restricted - reject immediately",
      "Condition": "{% $isRestricted($data.item, $rootState.Context) %}",
      "Assign": {
        "result": "rejected",
        "reason": "Restricted category"
      },
      "Next": "CompleteEligibility"
    }],
    "Default": "CheckPhysicalRequirements"
  },
  
  "CheckPhysicalRequirements": {
    "Type": "Choice",
    "Comment": "Business Rule: Item must meet physical condition requirements",
    "Choices": [{
      "Comment": "Item has defects or damage - reject",
      "Condition": "{% $hasDefects($data.item) %}",
      "Assign": {
        "result": "rejected",
        "reason": "Physical defects detected"
      },
      "Next": "CompleteEligibility"
    }],
    "Default": "CheckPurchaseProof"
  },
  
  "CheckPurchaseProof": {
    "Type": "Choice",
    "Comment": "Business Rule: Must have valid purchase proof",
    "Choices": [{
      "Comment": "No valid purchase proof found - reject",
      "Condition": "{% not $hasPurchaseProof($data.item) %}",
      "Assign": {
        "result": "rejected",
        "reason": "No purchase proof"
      },
      "Next": "CompleteEligibility"
    }],
    "Default": "ApproveReturn"
  },
  
  "ApproveReturn": {
    "Type": "Pass",
    "Comment": "All checks passed - approve the return",
    "Assign": {
      "result": "approved"
    },
    "Next": "CompleteEligibility"
  }
}
```

**Benefits:**
- ✅ Each business rule has its own named state
- ✅ Comments on state and branches explain logic in plain English
- ✅ Assign on Choice Rules eliminates extra Pass states
- ✅ Visual execution replay shows exact failure point
- ✅ Can debug individual rules independently
- ✅ Easy to maintain and extend

---

**Recommended Patterns:**

**Pattern A: Serial States with Break Conditions**
Use when checks are dependent or you want fail-fast behavior:

```json
✅ GOOD: Serial checks with explicit break condition
{
  "InitializeEligibility": {
    "Type": "Pass",
    "Comment": "Initialize eligibility tracking",
    "Assign": {
      "eligibilityChecks": {
        "conditionMet": false,
        "failureReason": null
      }
    },
    "Next": "CheckReturnWindowCompliance"
  },
  
  "CheckReturnWindowCompliance": {
    "Type": "Choice",
    "Comment": "Business Rule: Item must be within return window",
    "Choices": [{
      "Comment": "Item is outside the return window - reject immediately",
      "Condition": "{% not $isWithinWindow($data.item, $rootState.Context) %}",
      "Assign": {
        "eligibilityChecks.conditionMet": true,
        "eligibilityChecks.failureReason": "Outside return window",
        "result": "rejected"
      },
      "Next": "CompleteEligibility"
    }],
    "Default": "CheckCategoryRestriction"
  },
  
  "CheckCategoryRestriction": {
    "Type": "Choice",
    "Comment": "Business Rule: Item category must not be restricted",
    "Choices": [{
      "Comment": "Item category is restricted - reject immediately",
      "Condition": "{% $isRestricted($data.item, $rootState.Context) %}",
      "Assign": {
        "eligibilityChecks.conditionMet": true,
        "eligibilityChecks.failureReason": "Restricted category",
        "result": "rejected"
      },
      "Next": "CompleteEligibility"
    }],
    "Default": "CheckPurchaseProof"
  },
  
  "CheckPurchaseProof": {
    "Type": "Choice",
    "Comment": "Business Rule: Must have valid purchase proof",
    "Choices": [{
      "Comment": "No valid purchase proof found - reject",
      "Condition": "{% not $hasPurchaseProof($data.item) %}",
      "Assign": {
        "eligibilityChecks.conditionMet": true,
        "eligibilityChecks.failureReason": "No purchase proof",
        "result": "rejected"
      },
      "Next": "CompleteEligibility"
    }],
    "Default": "MarkApproved"
  },
  
  "MarkApproved": {
    "Type": "Pass",
    "Comment": "All checks passed - approve the return",
    "Assign": {
      "result": "approved"
    },
    "Next": "CompleteEligibility"
  },
  
  "CompleteEligibility": {
    "Type": "Succeed"
  }
}
```

**Benefits:**
- ✅ Each business rule is explicitly named and visible
- ✅ Execution replay shows exactly which check failed
- ✅ Comment on each Choice explains the branch logic in plain English
- ✅ Assign on failure branch eliminates extra Pass states
- ✅ Can set breakpoints on specific rules
- ✅ Performance profiling per rule
- ✅ Easy to add logging/metrics per check
- ✅ More concise and readable

---

**Pattern B: Parallel States**
Use when checks are independent and can run simultaneously:

```json
✅ GOOD: Independent checks in parallel
{
  "ValidateEligibility": {
    "Type": "Parallel",
    "Comment": "Run independent eligibility checks in parallel",
    "Branches": [
      {
        "StartAt": "CheckWindowCompliance",
        "States": {
          "CheckWindowCompliance": {
            "Type": "Pass",
            "Comment": "Business Rule: Within return window",
            "Assign": {
              "windowCheck": {
                "passed": "{% $isWithinWindow($data.item, $rootState.Context) %}",
                "ruleName": "ReturnWindowCompliance",
                "failureMessage": "Item is outside the return window"
              }
            },
            "End": true
          }
        }
      },
      {
        "StartAt": "CheckCategoryRestrictions",
        "States": {
          "CheckCategoryRestrictions": {
            "Type": "Pass",
            "Comment": "Business Rule: Category not restricted",
            "Assign": {
              "restrictionCheck": {
                "passed": "{% not $isRestricted($data.item, $rootState.Context) %}",
                "ruleName": "CategoryRestriction",
                "failureMessage": "Item category is restricted for returns"
              }
            },
            "End": true
          }
        }
      },
      {
        "StartAt": "CheckPhysicalCondition",
        "States": {
          "CheckPhysicalCondition": {
            "Type": "Pass",
            "Comment": "Business Rule: Physical requirements met",
            "Assign": {
              "conditionCheck": {
                "passed": "{% $meetsPhysicalRequirements($data.item) %}",
                "ruleName": "PhysicalCondition",
                "failureMessage": "Item does not meet physical condition requirements"
              }
            },
            "End": true
          }
        }
      }
    ],
    "Next": "EvaluateAllChecks"
  },
  
  "EvaluateAllChecks": {
    "Type": "Choice",
    "Comment": "Determine overall eligibility based on all checks",
    "Choices": [{
      "Comment": "All checks passed - approve the return",
      "Condition": "{% $data.windowCheck.passed and $data.restrictionCheck.passed and $data.conditionCheck.passed %}",
      "Assign": {
        "result": "approved",
        "passedChecks": ["ReturnWindowCompliance", "CategoryRestriction", "PhysicalCondition"]
      },
      "Next": "ApproveReturn"
    }],
    "Default": "RejectReturn"
  },
  
  "RejectReturn": {
    "Type": "Pass",
    "Comment": "Collect all failure reasons for rejection",
    "Assign": {
      "result": "rejected",
      "failureReasons": "{% $map($filter([$data.windowCheck, $data.restrictionCheck, $data.conditionCheck], function($c) { $c.passed = false }), function($c) { $c.failureMessage }) %}"
    },
    "Next": "CompleteValidation"
  },
  
  "ApproveReturn": {
    "Type": "Succeed"
  },
  
  "CompleteValidation": {
    "Type": "Succeed"
  }
}
```

**Benefits:**
- ✅ Parallel execution for performance
- ✅ Each check is independently named and visible with clear comments
- ✅ Can see all failures, not just first failure
- ✅ Easy to add/remove checks
- ✅ Choice Rules with Assign eliminate extra Pass states
- ✅ Comments on branches explain routing logic

---

**Pattern C: Map States**
Use when applying same check across multiple items:

```json
✅ GOOD: Map state for item-level checks
{
  "ValidateAllItems": {
    "Type": "Map",
    "Comment": "Apply eligibility check to each item",
    "ItemsPath": "$.items",
    "ItemSelector": {
      "item.$": "$",
      "context.$": "$.context"
    },
    "MaxConcurrency": 5,
    "Iterator": {
      "StartAt": "CheckItemEligibility",
      "States": {
        "CheckItemEligibility": {
          "Type": "Task",
          "Resource": "ExecuteSubWorkflow",
          "Arguments": {
            "subWorkflow": "ItemEligibilityWorkflow",
            "input": "{% $data.item %}"
          },
          "End": true
        }
      }
    },
    "ResultPath": "$.itemResults",
    "Next": "SummarizeResults"
  }
}
```

**Benefits:**
- ✅ Clear iteration pattern
- ✅ Each item's execution is independently traceable
- ✅ Controlled concurrency
- ✅ Easy to debug individual item failures

---

**State Naming Conventions:**

```
Business Rules: Use descriptive, domain-specific names
✅ CheckReturnWindowCompliance
✅ ValidateCategoryEligibility
✅ VerifyPurchaseProof
❌ Check1, Check2, Check3
❌ DoValidation
```

```
Routing/Control: Use clear action verbs
✅ RouteByEligibility
✅ EvaluateWindowCheck
✅ MarkFailedRestriction
✅ AggregateResults
❌ Next, Process, Handle
```

```
Calculations: Use descriptive calculation names
✅ CalculateReturnWindow
✅ ComputeRefundAmount
✅ DetermineApplicableFees
❌ Calculate, Compute, DoMath
```

---

**Guideline: When to Use Which Pattern**

| Scenario | Pattern | Rationale |
|----------|---------|-----------|
| Dependent checks (order matters) | Serial with Break | Fail-fast, preserves dependency order |
| Independent checks | Parallel | Performance, see all failures |
| Same check across items | Map | Clear iteration, controlled concurrency |
| Simple transformation | Pass State | Direct assignment, no branching needed |
| Complex multi-step reusable logic | Sub-Workflow | Composability, single responsibility |

---

**Debugging & Traceability Benefits:**

1. **Visual Execution Replay:**
   - See exactly which states executed
   - See which branch was taken at each Choice
   - Identify bottlenecks visually

2. **Failure Diagnosis:**
   - Know exactly which business rule failed
   - See intermediate values at each step
   - Trace data transformations

3. **Performance Profiling:**
   - Measure execution time per state
   - Identify slow checks
   - Optimize specific rules

4. **Testing:**
   - Unit test individual checks
   - Mock specific state responses
   - Test edge cases per rule

**Checkpoint:** Is every business rule visible as a named state? Can execution be replayed visually?

---

#### Step 5.2: Build Main Orchestration Workflow
**Goal:** Compose sub-workflows into complete process

**Process:**
1. Define main workflow flow
2. Call sub-workflows via Task states
3. Use Pass states for simple transformations
4. Use Choice states for routing
5. Handle all paths (success and failure)
6. Add error handling

**Output:** Main orchestration workflow

**Best Practices:**
- Compose, don't duplicate
- Clear flow with comments
- Handle all edge cases
- Provide clear error messages

---

#### Step 5.3: Test & Validate
**Goal:** Ensure correctness and completeness

**Process:**
1. Test with different context configurations
2. Test all decision paths
3. Test edge cases
4. Verify policy coverage
5. Validate against original policy document

**Output:** Tested and validated state machines

---

## Key Patterns

### Pattern 1: Configuration via Context

**Problem:** Policy rules hardcoded in state machines make changes difficult

**Solution:** Pass all configuration via context at execution time

**Implementation:**
```json
{
  "GetReturnWindow": {
    "Type": "Pass",
    "Assign": {
      "window": "{% $rootState.Context.policy.returnWindows.default %}"
    }
  }
}
```

**Benefits:**
- Policy changes → Update context only
- Testable with different configurations
- Multi-tenant support

---

### Pattern 2: Sub-Workflow Composition

**Problem:** Complex logic duplicated or mixed with orchestration

**Solution:** Extract cohesive logic into reusable sub-workflows

**Implementation:**
```json
{
  "CalculateWindow": {
    "Type": "Task",
    "Resource": "ExecuteSubWorkflow",
    "Arguments": {
      "subWorkflow": "CalculateWindowWorkflow",
      "item": "{% $data.item %}"
    }
  }
}
```

**Benefits:**
- Reusable components
- Single responsibility
- Testable independently

---

### Pattern 3: Pass State Services

**Problem:** Calculations scattered or duplicated

**Solution:** Use Pass states for simple transformations

**Implementation:**
```json
{
  "CalculateStartDate": {
    "Type": "Pass",
    "Assign": {
      "startDate": "{% $calculateStartDate($data.purchase) %}"
    }
  }
}
```

**Benefits:**
- Single transformation per state
- Results stored in $data for reuse
- Simple and testable

---

## Change Impact Analysis

### Policy Value Change

**Example:** Change default return window from 90 to 100 days

**Current Approach (Hardcoded):**
- Update state machine in 6+ locations
- Risk of inconsistency
- Requires code changes

**Context-Based Approach:**
- Update context: `context.policy.returnWindows.default = 100`
- No state machine changes needed
- Single source of truth

**Impact:** 1 location (context) vs 6+ locations

---

### Policy Schema Change

**Example:** Add new restriction type

**Current Approach:**
- Update state machine logic
- Update multiple decision points
- Risk of missing locations

**Context-Based Approach:**
- Update context schema
- Add restriction to context data
- State machine automatically uses it (if designed generically)

**Impact:** Context schema + data vs state machine logic

---

### Logic Change

**Example:** Add new validation step

**Current Approach:**
- Update validation logic
- May affect multiple places

**Context-Based Approach:**
- Add new state to validation sub-workflow
- Update flow
- Configuration unchanged

**Impact:** State machine only (context unchanged)

---

## Validation Checklist

### Phase 1: Completeness & Clarity
- [ ] All policy statements converted to rules
- [ ] All rules have expressions
- [ ] All operations identified
- [ ] All decision points mapped
- [ ] All edge cases handled
- [ ] **All ambiguities documented (clarifications needed)**
- [ ] **All assumptions documented with rationale**
- [ ] **All conflicts identified with proposed resolutions**
- [ ] **All policy gaps identified**
- [ ] **Review Gate 1: Stakeholder approval obtained**

### Phase 2: SOLID Analysis
- [ ] No rule duplication identified (DRY)
- [ ] Single responsibility violations identified (SRP)
- [ ] Abstraction level issues identified
- [ ] Configuration vs logic separation identified
- [ ] **Version 2.0 - SOLID-Improved Model created**

### Phase 3: Policy Rewrite
- [ ] **Rewritten policy uses precision language (MUST/SHOULD/CAN/MAY)**
- [ ] **Top-down organization with references/appendix**
- [ ] **Example scenarios included**
- [ ] **Decision tables for complex logic**
- [ ] **Traceability matrix created**
- [ ] **Test cases extracted**
- [ ] **Review Gate 2: Stakeholder approval of rewritten policy**

### Phase 4: Architecture Design
- [ ] Context schema designed
- [ ] Sub-workflows identified
- [ ] Pass states identified
- [ ] Architecture patterns selected
- [ ] **Review Gate 3: Stakeholder approval of architecture**

### Phase 5: Implementation & Quality
- [ ] Sub-workflows are reusable
- [ ] Pass states are simple transformations
- [ ] All reads from context (not hardcoded)
- [ ] Clear flow with comments
- [ ] Error handling included
- [ ] **Every business rule is a named, visible state**
- [ ] **No complex composite expressions hiding multiple checks**
- [ ] **Appropriate use of Parallel/Map/Serial patterns**
- [ ] **State naming follows conventions**
- [ ] **Visual execution replay possible**

### Change Impact Validation
- [ ] Policy value change → Context update only
- [ ] Policy schema change → Context + maybe state machine
- [ ] Logic change → State machine only
- [ ] Clear separation of concerns
- [ ] **Traceability from policy to state maintained**

---

## Process Summary

```
Phase 1: Initial Extraction & Modeling
1. Extract Entities & Relationships
   ↓
2. Extract Business Rules as Predicates
   ↓
3. Map Rules to Operations
   ↓
4. Build Decision Trees
   ↓
5. Document Clarifications, Assumptions, Conflicts & Gaps
   ↓
   [REVIEW GATE 1: Stakeholder approval]
   ↓
   [FINALIZE: Version 1.0 - Initial Policy Model]
   ↓

Phase 2: SOLID Analysis
6. DRY Analysis
   ↓
7. SRP Analysis
   ↓
8. Abstraction Level Analysis
   ↓
   [CREATE: Version 2.0 - SOLID-Improved Model]
   ↓

Phase 3: Policy Rewrite
9. Generate Rewritten Policy Document (using Version 2.0)
   ↓
   [REVIEW GATE 2: Stakeholder approval of rewritten policy]
   ↓

Phase 4: Architecture Design
10. Design Context Schema
    ↓
11. Identify Sub-Workflows & Pass States
    ↓
12. Design for Human Readability (Granular States)
    ↓
    [OPTIONAL: Generate Visual Diagrams for Review]
    ↓
    [REVIEW GATE 3: Stakeholder approval of architecture]
    ↓

Phase 5: Implementation
13. Build Sub-Workflows (with granular, named states)
    ↓
14. Build Main Orchestration Workflow
    ↓
15. Test & Validate (against rewritten policy test cases)
```

**Critical Review Gates:**
- **Gate 1 (Post-Phase 1):** Resolve all ambiguities and finalize Version 1.0 before proceeding
- **Gate 2 (Post-Phase 3):** Validate rewritten policy as source of truth before architecture
- **Gate 3 (Post-Phase 4):** Approve architecture design before implementation
- **Gate 4 (Post-Phase 5):** Test against approved specification

---

## Key Insights

1. **Start with Modeling, Not Implementation**
   - Extract entities and rules first
   - Understand the domain before coding
   - Identify gaps early

2. **Surface Ambiguities Early (Review Gate 1)**
   - Document clarifications, assumptions, conflicts & gaps
   - Get stakeholder approval before proceeding
   - Finalize Version 1.0 as baseline
   - Create audit trail of decisions
   - Prevents costly rework later

3. **Analyze Before Rewriting (Phase 2)**
   - SOLID analysis catches design issues early
   - Create Version 2.0 with refactoring recommendations
   - Patterns emerge from analysis
   - Informs the rewrite process

4. **Create Authoritative Specification (Review Gate 2)**
   - Rewrite policy with precision language (MUST, SHOULD, CAN)
   - Use Version 2.0 insights to structure the rewrite
   - Use references/appendix to keep main policy readable
   - Enable non-technical validation
   - Serves as source of truth for implementation & testing

5. **Design Architecture Before Implementation (Review Gate 3)**
   - Review architecture design with stakeholders
   - Validate design decisions before coding
   - Catch structural issues early
   - Ensures alignment with business requirements

5. **Separate Configuration from Logic**
   - Configuration via context enables easy policy updates
   - Clear separation of concerns
   - Testable with different configurations

6. **Design for Debuggability**
   - Every business rule is a named, visible state
   - Use granular states, not complex composite expressions
   - Enable visual execution replay
   - Parallel/Map/Serial patterns for different scenarios

7. **Compose, Don't Duplicate**
   - Sub-workflows for reusable logic
   - Pass states for simple transformations
   - Single source of truth

8. **Incremental Development**
   - Build one sub-workflow at a time
   - Test as you go
   - Refine based on learnings

---

## Success Criteria

✅ **Completeness:** All policy statements captured  
✅ **Correctness:** Rules match policy exactly  
✅ **Clarity (Phase 1):** All ambiguities documented and resolved  
✅ **Precision (Phase 2):** Rewritten policy uses unambiguous language (MUST/SHOULD/CAN)  
✅ **Maintainability:** Policy changes require context updates only  
✅ **Testability:** Components can be tested independently  
✅ **Clarity:** Clear separation of configuration vs logic  
✅ **Reusability:** Sub-workflows can be reused  
✅ **Debuggability:** Every business rule is a named, visible state  
✅ **Traceability:** Policy changes can be traced to single location  
✅ **Reviewability:** Non-technical stakeholders can validate rewritten policy

---

## Anti-Patterns to Avoid

❌ **Hardcoding Policy Values**
- Policy rules should be in context, not state machines

❌ **Proceeding with Unresolved Ambiguities**
- Must complete Review Gate 1 before SOLID analysis
- Document all assumptions and get approval

❌ **Complex Composite Expressions**
```json
// BAD: Can't debug which check failed, no documentation
{
  "CheckEligibility": {
    "Type": "Choice",
    "Choices": [{
      "Condition": "{% $check1 and $check2 and not $check3 %}",
      "Next": "Approve"
    }]
  }
}

// GOOD: Each check is a named state with comments
{
  "CheckRule1": {
    "Type": "Choice",
    "Comment": "Business Rule: Description of rule 1",
    "Choices": [{
      "Comment": "Rule 1 failed - explain why",
      "Condition": "{% not $check1 %}",
      "Assign": { "result": "rejected", "reason": "Rule 1 failure" },
      "Next": "Complete"
    }],
    "Default": "CheckRule2"
  },
  "CheckRule2": {
    "Type": "Choice",
    "Comment": "Business Rule: Description of rule 2",
    "Choices": [{
      "Comment": "Rule 2 failed - explain why",
      "Condition": "{% not $check2 %}",
      "Assign": { "result": "rejected", "reason": "Rule 2 failure" },
      "Next": "Complete"
    }],
    "Default": "CheckRule3"
  }
}
```

❌ **Mixing Concerns**
- Don't mix physical restrictions with business rules
- Separate validation from processing

❌ **Duplication**
- Don't repeat rules in multiple places
- Use sub-workflows for reusable logic

❌ **Over-Abstraction**
- Don't create sub-workflows for single Task/Choice states
- Keep it simple

❌ **Under-Abstraction**
- Don't hardcode category lists
- Use configuration for policy data

❌ **Skipping Rewritten Policy Document**
- Non-technical stakeholders can't validate code
- Need authoritative specification for testing
- Miss opportunity to catch misinterpretations

❌ **Hidden Business Rules**
- Every named business rule must be a visible state
- Don't bury logic in utility functions without corresponding states

---

## Conclusion

This process provides a systematic approach to extracting business policies into maintainable, testable state machines. The key is:

1. **Model First** - Understand the domain before implementing (Version 1.0)
2. **Surface Ambiguities Early** - Review Gate 1 prevents costly rework
3. **Analyze Before Rewriting** - SOLID analysis creates Version 2.0 improvements
4. **Create Authoritative Spec** - Rewritten policy for stakeholder validation (Review Gate 2)
5. **Design Architecture** - Review architecture before implementation (Review Gate 3)
6. **Separate** - Configuration vs logic
7. **Design for Debugging** - Granular, named states for visual traceability
8. **Compose** - Build reusable components
9. **Incremental** - Build and test incrementally with clear version milestones

The result is state machines that are:
- Easy to maintain (policy changes = context updates)
- Easy to test (components are independent)
- Easy to understand (clear separation of concerns)
- Easy to extend (composable architecture)
- Easy to debug (every rule is visible and traceable)
- Easy to validate (stakeholders can review rewritten policy)

---

## Additional Best Practices & Considerations

### Versioning Strategy

**Rewritten Policy Document:**
- Use semantic versioning (e.g., v1.2.0)
- Track changes with rationale
- Maintain change log
- Link policy version to state machine version

**Context Schema:**
- Version context schema separately
- Document breaking vs non-breaking changes
- Provide migration guides for updates

### Visual Diagrams

**When to Generate:**
- After Phase 3 (architecture design)
- Before Phase 4 (implementation)
- For stakeholder review sessions

**What to Include:**
- Main workflow flow diagram
- Sub-workflow diagrams
- Decision tree visualizations
- State dependency graphs

**Tools:**
- Mermaid diagrams (for documentation)
- State machine visualization tools
- Draw.io/Lucidchart for stakeholder presentations

### Performance Considerations

**Parallel vs Serial Trade-offs:**
- Parallel: Better performance, but see all failures (useful for UX)
- Serial with break: Fail-fast, but less informative
- Choose based on: SLA requirements, user experience needs, resource constraints

**Map State Optimization:**
- Set appropriate `MaxConcurrency` based on backend capacity
- Monitor resource usage
- Consider batch processing for large item sets

### Monitoring & Observability

**State-Level Metrics:**
- Execution time per state
- Failure rates per business rule
- Most common rejection reasons
- Bottleneck identification

**Logging Strategy:**
- Log entry/exit for each named business rule state
- Include context values used in decisions
- Capture intermediate calculation results
- Enable replay debugging

### Maintenance Workflow

**When Policy Changes:**

1. **Minor Value Change** (e.g., window 90→100 days):
   - Update context only
   - Test with new values
   - Deploy context update

2. **New Rule Addition** (e.g., add restriction):
   - Update rewritten policy document
   - Update context schema/data
   - Add new state(s) to state machine
   - Update tests
   - Review with stakeholders

3. **Logic Change** (e.g., change eligibility flow):
   - Update rewritten policy document
   - Modify state machine
   - Context may remain unchanged
   - Update tests
   - Review with stakeholders

**Always:**
- Update traceability matrix
- Increment version
- Document in change log
- Update test cases

---

**See Also:**
- Context Schema Design
- State Machine Composition Patterns
- SOLID Principles Analysis
- Configuration via Context Guide
- Visual State Machine Debugging Guide
- Policy Versioning Best Practices

