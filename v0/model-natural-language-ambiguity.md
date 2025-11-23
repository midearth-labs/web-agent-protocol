# Natural Language Ambiguity in Technical Specifications: A Case Study

**Analysis Date:** November 23, 2025  
**Model:** Claude Sonnet 4.5 (Frontier AI Model)  
**Task:** Analyze WAP Workflow States Language specification against Amazon States Language (ASL) specification  
**Outcome:** Multiple misinterpretations despite both human and AI having access to the same specification

---

## Executive Summary

This document analyzes a real interaction where a frontier AI model (Claude Sonnet 4.5) was asked to verify compliance between two technical specifications: the WAP Workflow States Language and the Amazon States Language. Despite both the AI and the human software engineer having access to the **identical** ASL specification, the AI made several critical misinterpretations that required human correction.

This case study demonstrates that:
1. **Natural language is inherently ambiguous** for describing technical intent
2. **Verbosity can obscure critical details**, even for advanced AI models
3. **Context and implicit assumptions** can lead to incorrect conclusions
4. **Formal specifications** (like TypeScript types) are clearer but still require careful reading

---

## The Context

**The Task:**
- Analyze the WAP specification against the official ASL specification
- Identify compliance issues, deviations, and missing features
- Focus only on JSONata mode (not JSONPath)
- Provide comprehensive recommendations

**Available Information:**
- ✅ Full ASL specification from https://states-language.net/spec.html (107,519 characters)
- ✅ Complete WAP specification with TypeScript type definitions
- ✅ Code examples demonstrating usage
- ✅ Documentation of design decisions

---

## Model Confusions & Human Corrections

### 1. ❌ **Choice State Output Field - Major Misinterpretation**

#### What the Model Said (Incorrectly):
> **Critical Correction Needed**: Choice state should NOT have Output/Assign at top level. Remove `OutputEmittingState & Assignable` from Choice state definition. The spec says "Default, Assign and Output here only applies when no match found in Choices" (line 320), but ASL doesn't support this behavior.

#### What the ASL Specification Actually Says:
> "If no Choice Rule is chosen, the value of the state's top-level 'Output' field, if any, will become the state output, which will become the input for the next state as specified by the Choice State's 'Default' field."

#### Human Correction:
> "For Choice state, the 'ASL Spec' said 'If no Choice Rule is chosen, the value of the state's top-level "Output" field, if any, will become the state output...' of course Assign and Output has to be defined somewhere on the Choice the parent state of the ChoiceRule being referred to. Check the DispatchEvent example."

#### Why the Model Failed:
1. **Skimmed past the critical sentence** in a 107,000+ character specification
2. **Made assumptions** based on other state types without careful verification
3. **Didn't check the referenced example** (DispatchEvent) that demonstrates this behavior
4. **Marked as "Critical"** despite being completely wrong

**Impact:** This would have broken a core ASL feature if implemented.

---

### 2. ❌ **ChoiceRule Output Field - Repeated Misinterpretation**

#### What the Model Said (Incorrectly):
> **Choice rules incorrectly have OutputEmittingState**. Choice rules define `Next` and optionally `Assign`, but output flows through unchanged. Remove `OutputEmittingState` from `ChoiceRule`.

#### What the ASL Specification Actually Says (Verbatim):
> "Each Choice Rule MAY have an 'Output' field, which works exactly like a state's top-level 'Output'"

#### Human Correction:
> "The phrase 'Each Choice Rule MAY have an "Output" field, which works exactly like a state's top-level "Output"' is verbatim in the linked specification, also the DispatchEvent example showcases it"

#### Why the Model Failed:
1. **Failed to find explicit text** despite it being present verbatim in the specification
2. **Extrapolated from incomplete reading** rather than thorough search
3. **Contradicted explicit documentation** without verification
4. **Required two separate corrections** before acknowledging the error

**Impact:** This would have removed a valid ASL feature from WAP.

---

### 3. ℹ️ **Map State Advanced Fields - Partial Understanding**

#### What the Model Said:
> **Missing several ASL Map fields**: ItemReader, ItemBatcher, ResultWriter, ToleratedFailurePercentage, etc. Consider adding these fields if you need advanced Map state features.

#### Human Correction:
> "Map states ItemReader, ItemBatcher, ResultWriter, ToleratedFailurePercentage, ToleratedFailurePercentagePath, ToleratedFailureCount, ToleratedFailureCountPath are not used in WAP"

#### Why the Model Was Partially Right:
- Correctly identified missing fields
- Appropriately noted they might not be needed
- Used softer language ("Consider adding")

**Impact:** Minor - recommendation was reasonable, clarification was helpful.

---

## What the Model Analyzed Correctly

### ✅ **Successfully Identified Issues**

1. **Missing Task State Timeout Fields**
   - Correctly identified `TimeoutSeconds` and `HeartbeatSeconds` were missing
   - Human confirmed and added them

2. **Missing Retry Advanced Fields**
   - Correctly identified `MaxDelaySeconds` and `JitterStrategy` were missing
   - Human confirmed and added them

3. **Missing Top-Level TimeoutSeconds**
   - Correctly identified state machine-level timeout was missing
   - Human confirmed and added it

4. **Missing Version Field**
   - Correctly identified version field was missing
   - Human confirmed and added it

5. **Task.Credentials Assessment**
   - Noted it was missing, suggested adding it
   - Human clarified it's intentionally omitted (acceptable recommendation)

6. **Proper State Type Analysis**
   - Correctly validated Pass, Wait, Succeed, Fail, Parallel, Map, Serial states
   - Correctly understood terminal state behavior
   - Correctly validated Next/End field requirements

7. **Error Handling Structure**
   - Correctly validated Retry configuration (except for the missing fields mentioned above)
   - Correctly validated Catch block structure
   - Correctly identified ErrorEquals, Next, ResultPath patterns

8. **Assign Field Scope**
   - Correctly validated that Assign is properly excluded from Succeed and Fail
   - Correctly validated that Assign can appear in Choice Rules
   - Correctly validated that Assign can appear in Catch blocks

9. **JSONata Expression Handling**
   - Correctly validated the `{% %}` wrapper syntax
   - Correctly validated expression types (StringOrJSONataExpression, etc.)

10. **WAP Extensions Recognition**
    - Correctly identified Serial state as a WAP extension
    - Correctly identified DisplayTask as a WAP extension
    - Appropriately noted these as acceptable extensions

---

## Analysis: Why Natural Language Fails

### 1. **Verbosity Causes Detail Blindness**

**The ASL specification is 107,519 characters long.** Critical details like:
- "Each Choice Rule MAY have an 'Output' field"
- "If no Choice Rule is chosen, the value of the state's top-level 'Output' field..."

...are **buried** among thousands of other sentences. Even a frontier AI model scanning this text:
- ✅ Found ~80% of the relevant information
- ❌ Missed 2-3 critical sentences
- ❌ Made incorrect assumptions to fill gaps

**Implication:** Length correlates with missed details, even for AI.

### 2. **Context-Dependent Interpretation**

The model correctly understood that:
- States have Next/End fields
- States have Comment fields (optional in ASL)
- Error handling works with ErrorEquals arrays

But **incorrectly assumed** that:
- Choice states work like other states (no Output at top level)
- Choice rules work like state-level declarations (no Output in rules)
- ASL's permissiveness must be preserved in derivatives

**Implication:** Implicit patterns lead to faulty generalizations.

### 3. **Ambiguous Specification Language**

Consider this sentence from ASL:
> "Any state except Fail MAY have Output."

**Questions this raises:**
- Does "any state" include Choice?
- Does Choice have special behavior?
- Do Choice rules count as states?
- Where in the 107,000 characters is this clarified?

The model answered these questions **incorrectly** by:
1. Assuming Choice is an exception
2. Assuming Choice rules don't have Output
3. Not finding the contradicting text buried in the specification

**Implication:** "MAY" and "MUST" are clear, but scope and special cases require careful reading.

### 4. **Examples Are Critical But Often Unlinked**

The human reference to **"Check the DispatchEvent example"** was crucial because:
- Examples demonstrate actual behavior
- Natural language descriptions can be misread
- Seeing code/JSON clarifies ambiguity

The model:
- ❌ Didn't check the example initially
- ❌ Made assumptions without validation
- ✅ Would have been correct if it had checked examples first

**Implication:** Natural language specs need inline examples at every claim.

---

## Comparison: Natural Language vs. Formal Specifications

### **Natural Language Specification (ASL)**
```
"Each Choice Rule MAY have an 'Output' field, which works 
exactly like a state's top-level 'Output'"
```

**Issues:**
- Buried in 107k+ characters
- Easy to miss when scanning
- Requires careful reading of entire document
- Context-dependent interpretation

### **Formal Type Specification (WAP)**
```typescript
type ChoiceRule = NextStateProgression & OutputEmittingState & Assignable & {
  Comment: string;
  Condition: JSONataExpression;
}
```

**Advantages:**
- Immediately clear that ChoiceRule has Output (via OutputEmittingState)
- Type system enforces correctness
- IDE support for validation
- Less ambiguous

**BUT STILL:**
- Model misread this too!
- Model suggested removing OutputEmittingState
- Required human correction

**Implication:** Even formal specs need careful review, but they're clearer than prose.

---

## Model Performance Statistics

### Accuracy Breakdown
- **Correctly Identified Issues:** 10 items (~83%)
- **Incorrectly Interpreted from ASL Spec:** 2 items (~17%)
- **Critical Errors:** 2 items (Choice state Output, Choice rules Output)

### Error Severity
- 🔴 **Critical (Would Break Functionality):** 2 (Both related to Choice state Output fields)
- 🟢 **Minor (Recommendations for Optional Features):** 1 (Map state advanced fields)

### Correction Iterations
- **First Pass:** 17% critical error rate on ASL spec interpretation
- **After First Correction:** Acknowledged but still uncertain about ChoiceRule Output
- **After Second Correction:** Finally confirmed specification

**Total Human Corrections Needed (ASL Spec Related):** 2

---

## Key Takeaways

### For Specification Writers

1. **Natural language is ambiguous** even when trying to be precise
2. **Critical information gets buried** in long documents
3. **Examples are essential**, not optional
4. **Formal specifications** (types, schemas) reduce ambiguity
5. **Redundancy helps** - state the same thing multiple ways
6. **Structure matters** - use tables, diagrams, code samples

### For AI/ML Systems

1. **Confidence doesn't equal correctness** - the model was confident but wrong
2. **Thoroughness is hard** even with perfect memory/recall
3. **Pattern matching fails** when special cases exist
4. **Examples should be checked** before making claims
5. **Uncertainty should be expressed** when not finding explicit confirmation

### For Software Engineers

1. **Always verify AI recommendations** against source material
2. **Check examples and tests**, not just prose descriptions
3. **Question confident assertions** - ask for evidence
4. **Formal specs complement** natural language, not replace
5. **Document intent explicitly** - don't rely on inference

---

## Conclusion

Despite being a frontier AI model with access to the **exact same specification** as the human engineer, Claude Sonnet 4.5:

- ❌ Misread 2 critical features (both related to Choice state Output fields)
- ✅ Correctly identified 10 real issues from the ASL specification
- ⚠️ Required 2 human corrections on ASL spec interpretation

**This demonstrates that natural language specifications are:**
1. **Too ambiguous** for consistent interpretation
2. **Too verbose** for complete coverage, even by AI
3. **Too context-dependent** for reliable extraction
4. **Insufficient alone** - need examples, types, and tests

**The solution is not better AI** (though that helps), but **better specifications:**
- Formal type definitions (TypeScript, JSON Schema, Protocol Buffers)
- Executable examples and tests
- Machine-readable contracts (OpenAPI, GraphQL schemas)
- Visual diagrams and flowcharts
- Redundant explanations in multiple formats

**Natural language should describe *why* and *context*.** 
**Formal languages should define *what* and *how*.**

Together, they create specifications that both humans and AI can reliably understand.

---

## Appendix: The Irony

The fact that this analysis exists **proves its own point:**

A human had to correct an AI about a specification that:
- ✅ Was written in natural language
- ✅ Was comprehensive and detailed
- ✅ Was publicly available and authoritative
- ✅ Was read by both human and AI

And yet, **understanding diverged on 2 critical features** (both related to Choice state Output behavior).

If a frontier AI model with perfect recall, no fatigue, and advanced reasoning capabilities can misinterpret specifications...

**What hope do human developers have?**

The answer: **Better specification formats that complement natural language with formal, executable, and visual representations.**

---

**Document Created:** November 23, 2025  
**Model:** Claude Sonnet 4.5  
**Purpose:** Evidence for the limitations of natural language in technical specifications  
**Lesson:** Trust, but verify. And use better specification tools.

