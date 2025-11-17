# Reference-Based Context Engineering: Moving Data Outside the LLM's Attention Budget

*How to enable AI agents to work with massive datasets with reduces context rot and hallucinations*

---

## The Context Window Paradox

Imagine an AI agent tasked with copying 50GB of data from one location to another, or analyzing a spreadsheet with millions of rows. Traditional approaches would either fail (hitting context limits) or degrade performance as the agent struggles to maintain coherence across thousands of tokens of intermediate data.

This is the fundamental challenge of **context engineering**: LLMs have finite attention budgets, and every token we add to the context window competes for that attention. As [Anthropic's research](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) has shown, even as context windows grow larger, we still face **context rot**—the model's ability to accurately recall information decreases as context length increases.

But here's the key insight: **the environment's memory is orders of magnitude larger than the LLM's context window**. Why are we forcing the LLM to carry all this data in its attention budget when we can simply store it outside and let the agent reference it on demand?

## Beyond Prompt Engineering: Reference-Based Context Management

In their excellent article on [effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), Anthropic outlines strategies like compaction, structured note-taking, and multi-agent architectures. These are powerful techniques, but there's a complementary approach that addresses a different dimension of the problem: **reference-based data passing**.

The core idea is simple: instead of passing large data payloads directly through the LLM's context window, agents can pass lightweight **references** (like IDs or pointers) that point to data stored in the environment. The LLM can always retrieve the raw data when needed, but it doesn't have to carry it around in its attention budget.

### How It Works

Consider a typical agent workflow:

**Traditional Approach:**
```
Agent → Tool Call → Returns 1MB of data → Stored in context → Agent processes → Next tool call → Returns another 1MB → Context now 2MB...
```

**Reference-Based Approach:**
```
Agent → Tool Call → Returns reference ID "ref_123" (50 bytes) → Agent processes reference → Next tool call passes "ref_123" → Tool resolves reference internally → Returns new reference "ref_456" (50 bytes)
```

The agent maintains full control—it can request the actual data at any time using a `retrieve_reference` call—but by default, it works with lightweight references that don't consume the precious attention budget.

## Implementation: Pydantic Discriminated Unions

The implementation leverages Pydantic's discriminated unions to create a clean API where tools can accept either values or references transparently. Here's how it works:

```python
class ValueModel(BaseModel):
    type: Literal["value"] = "value"
    data: str

class ReferenceModel(BaseModel):
    type: Literal["reference"] = "reference"
    ref_id: str

ReferenceOrValue = Annotated[
    Union[ValueModel, ReferenceModel],
    Field(discriminator='type')
]
```

Tools accept `ReferenceOrValue` types, meaning they can work with either direct values (for small data) or references (for large data). The LLM chooses the appropriate mode based on data size and context constraints. See the [full implementation notebook](https://github.com/midearth-labs/web-agent-protocol/blob/main/v0/urs/notebooks/pass-context-references.ipynb) for complete examples.

## Real-World Benefits

### 1. Massive Data Operations

An agent can orchestrate operations on datasets that are orders of magnitude larger than the context window:

- **Data Migration**: Copy 50GB from source to destination without ever loading the data into context
- **ETL Pipelines**: Transform and move terabytes of data while the agent only sees reference IDs
- **Batch Processing**: Process millions of records where the agent coordinates the workflow but never sees the raw data

### 2. Tool Result Management

When tools return large results—like entire database query results, file contents, or API responses—these can be stored as references:

```python
# Agent calls analytical tool
result = analyze_spreadsheet(spreadsheet_id="large_file.xlsx")
# Returns: {"type": "reference", "ref_id": "analysis_result_123"}

# Agent passes reference to visualization tool
visualize(data={"type": "reference", "ref_id": "analysis_result_123"})
# Tool internally resolves reference, processes data, returns new reference
```

The agent maintains full visibility and control but doesn't pay the token cost of carrying the data.

### 3. Intermediate Data Storage

Complex workflows often generate intermediate results that are only needed later. With references, these can be stored outside the context:

- **Multi-step Analysis**: Store intermediate calculations, retrieve only when needed
- **Pipeline Orchestration**: Keep transformation results between stages without context bloat
- **Error Recovery**: Maintain checkpoints and intermediate states for rollback capabilities

### 4. External Transformations

Data transformations can happen entirely outside the LLM's context window. The agent coordinates the workflow, but actual data processing happens in the environment:

- **Format Conversions**: Convert between data formats without loading into context
- **Data Validation**: Run validation rules on large datasets externally
- **Aggregations**: Compute statistics, summaries, and aggregations in the environment

## Privacy, Compliance, and PII Protection

Perhaps one of the most significant benefits of reference-based context engineering is its ability to address privacy, compliance, and Personally Identifiable Information (PII) concerns—critical requirements for healthcare (HIPAA), finance (PCI-DSS), and other regulated industries.

### The Privacy Problem with Traditional Approaches

When sensitive data flows through an LLM's context window, it creates several compliance challenges:

- **Data Transmission**: PII and PHI (Protected Health Information) are sent to the LLM provider's infrastructure
- **Context Persistence**: Data may be logged, cached, or used for training, creating compliance risks
- **Access Control**: Once data is in the context, it's difficult to enforce fine-grained access controls
- **Audit Trails**: Tracking who accessed what data becomes challenging when data is embedded in prompts

### How References Solve This

Reference-based passing fundamentally changes the privacy model:

**1. Data Never Leaves Your Environment**

With references, sensitive data never enters the LLM's context window. The agent works with opaque reference IDs like `"ref_patient_12345"` instead of actual patient records. The LLM provider never sees the sensitive data—only your environment does.

```python
# Instead of this (PII in context):
analyze_patient({
    "name": "John Doe",
    "ssn": "123-45-6789",
    "diagnosis": "Condition X"
})

# Use this (only reference ID):
analyze_patient({
    "type": "reference",
    "ref_id": "patient_record_abc123"
})
```

**2. Access Control at the Environment Level**

Since data resolution happens in your environment, you can enforce access controls, encryption, and audit logging at the point of access:

- **Role-Based Access Control (RBAC)**: Check permissions when resolving references
- **Encryption**: Store sensitive data encrypted, decrypt only when needed
- **Audit Logging**: Log every reference resolution with user, timestamp, and purpose
- **Data Minimization**: Resolve only the specific fields needed, not entire records

**3. HIPAA Compliance**

For healthcare applications, reference-based passing enables HIPAA-compliant agent workflows:

- **Minimum Necessary**: Agents only retrieve the specific data needed for each operation
- **Access Logging**: Every reference access can be logged for compliance audits
- **Data Isolation**: Patient data remains in your HIPAA-compliant infrastructure
- **Business Associate Agreements**: Since data never goes to the LLM provider, BAAs may not be required for the LLM service itself

**4. Selective Data Retrieval**

The agent can request only the data it needs, when it needs it:

```python
# Agent requests specific fields, not entire record
retrieve_reference({
    "reference_id": "patient_123",
    "fields": ["diagnosis", "medications"]  # Only retrieve what's needed
})
```

This supports the principle of data minimization—a core requirement of GDPR, HIPAA, and other privacy regulations.

**5. De-identification and Anonymization**

References enable sophisticated privacy-preserving patterns:

- **Anonymized References**: Store anonymized data separately, reference both original and anonymized versions
- **Pseudonymization**: Use pseudonymous reference IDs that can be mapped back only with proper authorization
- **Differential Privacy**: Apply privacy-preserving transformations at reference resolution time

**6. Compliance by Design**

The architecture itself enforces privacy:

- **No Data Leakage**: Impossible for sensitive data to accidentally appear in context
- **Explicit Retrieval**: Agent must explicitly request data, creating clear audit trails
- **Environment Control**: All data access happens in your controlled environment
- **Regulatory Alignment**: Architecture aligns with privacy-by-design principles

### Real-World Privacy Use Cases

**Healthcare Analytics**
An agent analyzing patient outcomes can work with thousands of patient records using references. The LLM never sees PHI—it only sees reference IDs and aggregated results. When it needs specific data, it requests it through controlled, audited channels.

**Financial Services**
An agent processing loan applications can work with credit reports, income statements, and other sensitive financial data via references. The actual PII remains in the bank's secure infrastructure, with access logged for compliance.

**Customer Support**
An agent handling support tickets can reference customer records without exposing full customer profiles. It retrieves only the specific information needed to resolve each ticket, minimizing data exposure.

**Research and Analytics**
Researchers can use agents to analyze datasets containing PII while keeping the actual data in secure, access-controlled environments. The agent orchestrates analysis workflows using references, and results can be aggregated or anonymized before being returned.

### The Compliance Advantage

Reference-based passing doesn't just make compliance *possible*—it makes it *easier*:

- **Clear Boundaries**: Data either stays in your environment (references) or is explicitly retrieved (audited)
- **Reduced Risk**: No risk of accidental data exposure in prompts or context
- **Simplified Auditing**: Every data access is explicit and logged
- **Regulatory Alignment**: Architecture supports privacy-by-design principles

This approach is particularly valuable for organizations that need to use AI agents but are constrained by regulatory requirements. It enables the power of agentic AI while maintaining the privacy and compliance standards that regulated industries require.

## Integration with Anthropic's Context Engineering Strategies

This approach complements rather than replaces Anthropic's techniques:

- **Compaction**: References reduce the need for compaction by keeping data out of context in the first place
- **Structured Note-Taking**: References can point to structured notes stored in the environment
- **Multi-Agent Architectures**: Sub-agents can pass references to each other, maintaining clean context windows while sharing data

As Anthropic notes in their [code execution with MCP article](https://www.anthropic.com/engineering/code-execution-with-mcp), the Model Context Protocol enables rich interactions between agents and their environment. Reference-based passing extends this by making data exchange token-efficient.

## Future Possibilities

The reference-based approach opens up several exciting directions:

### 1. Lazy Evaluation

References could enable lazy evaluation patterns where tool calls aren't executed until the data is actually needed. The agent could build up a dependency graph of references, and the environment could optimize execution order or skip unnecessary operations entirely.

### 2. JSONPath and Deterministic Transformations

For structured data like JSON, exposing JSONPath capabilities via transformer tools could move many deterministic transformations outside the LLM. The agent could specify transformations declaratively:

```python
transform(
    source={"type": "reference", "ref_id": "data_123"},
    operation="jsonpath",
    path="$.users[*].email"
)
```

This keeps the LLM focused on orchestration while deterministic operations happen efficiently in the environment.

### 3. Backtracking and Transaction Management

References enable powerful state management patterns:

- **Exploration**: Agents can explore different paths, storing intermediate states as references, and backtrack when needed
- **Transactions**: Reference-based operations can be wrapped in transactions, with rollback capabilities
- **Checkpointing**: Save agent state at key decision points, enabling recovery and continuation

### 4. Batch Execution

A particularly interesting possibility: the agent could build up a graph of operations using references, and the environment could execute the entire graph in one optimized batch operation. This combines the flexibility of agentic orchestration with the efficiency of batch processing.

## The Path Forward

Context engineering is evolving from prompt optimization to holistic context management. As [Anthropic's research](https://claude.com/blog/context-management) shows, treating context as a finite, precious resource is essential for building capable agents.

Reference-based data passing represents a natural extension of this thinking: if the environment can store data more efficiently than the LLM can, why not leverage that? The agent maintains full control and visibility—it can always retrieve the raw data—but it doesn't have to pay the attention cost of carrying it around.

This approach is particularly powerful for:
- **Data-intensive workflows**: ETL, migration, analysis
- **Long-running agents**: Operations that span hours or days
- **Multi-step processes**: Complex pipelines with many intermediate states
- **Resource-constrained scenarios**: When token costs or context limits are concerns
- **Privacy-sensitive applications**: Healthcare (HIPAA), finance (PCI-DSS), and other regulated industries where PII/PHI must remain in controlled environments

The implementation is straightforward—using Pydantic discriminated unions, we can create tools that transparently support both value and reference modes. The LLM naturally learns to use references for large data and values for small data, optimizing its own context usage.

For a complete working example with Google Gemini, see this [implementation notebook](https://github.com/midearth-labs/web-agent-protocol/blob/main/v0/urs/notebooks/pass-context-references.ipynb).

## Conclusion

As AI agents tackle increasingly complex and data-intensive tasks, context engineering becomes critical. Reference-based data passing offers a practical way to scale agent capabilities without hitting context limits or suffering from context rot.

The key insight is simple: **the environment is the agent's extended memory**. By storing data outside the LLM's attention budget and passing lightweight references instead, we enable agents to work with datasets of any size while maintaining the flexibility and control that makes agents powerful.

This isn't a replacement for careful prompt engineering, compaction, or structured note-taking—it's a complementary technique that addresses a fundamental constraint: the finite nature of attention. As we build more capable agents, techniques like this will be essential for scaling to real-world problems.

---

*For more on context engineering, see Anthropic's excellent resources:*
- *[Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)*
- *[Context Management](https://claude.com/blog/context-management)*
- *[Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)*

