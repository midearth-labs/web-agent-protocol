# Unified Reference System: Memory Management for Large Language Models

**A bidirectional reference architecture enabling stateless LLMs to efficiently manage context windows through garbage collection-inspired memory management**

*Reading time: 5 minutes*

---

## Executive Summary

The Unified Reference System (URS) applies classical computer science memory management principles to solve the context window problem in Large Language Models. Like how operating systems manage RAM through paging and virtual memory, URS manages LLM context through lightweight references and just-in-time retrieval, enabling Claude Sonnet 4.5 to work with terabytes of data within its 200K token context window.

**Key Innovation**: Bidirectional reference passing where both environment→LLM (data files) and LLM→environment (assistant outputs) are managed through the same memory system, with automatic garbage collection between conversational turns.

---

## The Problem: Context Window Exhaustion

Claude Sonnet 4.5 has a 200K token context window (~680,000 characters or 500 pages). When building agentic workflows, this fills rapidly:

- **Large datasets**: A 50MB CSV file = ~12.5M tokens (62x context limit)
- **Multi-file codebases**: 100 Python files × 500 lines each = ~300K tokens
- **Long conversations**: 20 turns × 5K tokens per response = 100K tokens
- **Agent outputs**: Comprehensive reports, documentation, analysis results

Traditional approaches fail:
- **Naive loading**: Crash on first large file
- **Selective loading**: Manual complexity, brittle logic
- **Summarization**: Lossy, cannot regenerate original
- **External databases**: Breaking LLM statelessness, added latency

---

## Computer Science Parallels

### Virtual Memory & Paging

```mermaid
graph TB
    subgraph "Traditional OS Memory Management"
        VM[Virtual Memory<br/>Process sees 4GB address space]
        PM[Physical RAM<br/>Only 1GB available]
        PF[Page Fault Handler]
        DS[Disk Storage<br/>Slower but larger]
        
        VM -->|Page not in RAM| PF
        PF -->|Swap in| DS
        PM -.->|Swap out| DS
    end
    
    subgraph "URS Context Management"
        CW[Context Window<br/>LLM sees 200K tokens]
        AC[Active Context<br/>~50K tokens used]
        RH[Reference Handler]
        RS[Reference Store<br/>Unlimited capacity]
        
        CW -->|Reference not retrieved| RH
        RH -->|Retrieve| RS
        AC -.->|Auto-prune| RS
    end
    
    style VM fill:#e1f5ff
    style CW fill:#e1f5ff
    style PM fill:#fff4e1
    style AC fill:#fff4e1
    style DS fill:#f0f0f0
    style RS fill:#f0f0f0
```

**Analogy**: 
- Virtual memory = Full conversation history with references
- Physical RAM = Active context window (200K tokens)
- Page table = Reference metadata catalog
- Page fault = `retrieve_context()` call
- Swap out = Auto-pruning on turn boundary

### JVM Garbage Collection

URS implements a **generational garbage collection** strategy similar to JVM's G1GC:

| JVM Concept | URS Equivalent | Trigger |
|-------------|----------------|---------|
| Young Generation | Current turn data | Auto-prune on user message |
| Old Generation | Reference metadata | Never pruned (permanent) |
| Eden Space | Newly retrieved data | Pruned if not re-requested |
| Full GC | Manual `retrieve_context` | Explicit user need |
| Mark & Sweep | Metadata survives, data pruned | Turn boundary |

```mermaid
graph LR
    subgraph "Turn N"
        T1[User Message] --> R1[Retrieve refs A, B]
        R1 --> D1[Data in context:<br/>A: 50K tokens<br/>B: 30K tokens]
        D1 --> P1[Process & Respond]
    end
    
    subgraph "Turn N+1 - GC Triggered"
        T2[User Message] --> GC[Auto-Prune:<br/>Remove A, B data]
        GC --> M1[Metadata remains:<br/>A: metadata ~50 tokens<br/>B: metadata ~50 tokens]
        M1 --> R2{Need A or B?}
        R2 -->|Yes| RE[Re-retrieve]
        R2 -->|No| NE[Continue without]
    end
    
    T1 -.-> T2
    
    style GC fill:#ff9999
    style M1 fill:#99ff99
```

### Database Query Optimization

URS's just-in-time retrieval mirrors database query planning:

```sql
-- Traditional approach: Load everything
SELECT * FROM huge_table;  -- Loads 10M rows into memory

-- URS approach: Metadata-driven decisions
EXPLAIN SELECT COUNT(*), AVG(price) FROM huge_table;  -- Metadata query
-- Returns: 10M rows, avg: $45.50, no data loaded

-- Only retrieve when necessary
SELECT * FROM huge_table WHERE category = 'electronics' LIMIT 10;
```

---

## Architecture: Bidirectional Reference System

### Core Components

```mermaid
graph TB
    subgraph "LLM Layer - Claude Sonnet 4.5"
        LLM[Stateless Orchestrator<br/>200K context window]
        META[Metadata Catalog<br/>Always visible]
        DECIDE[Retrieval Decision<br/>Based on metadata]
    end
    
    subgraph "Environment Layer"
        REFSTORE[Reference Store<br/>Unlimited capacity]
        PRUNER[Auto-Pruner<br/>Triggered on user messages]
        SCHEMA[Schema Validator<br/>Structured outputs]
    end
    
    subgraph "Tool Layer"
        TOOLS[Tools receive values only<br/>Reference-agnostic]
    end
    
    USER[User] -->|Message| PRUNER
    PRUNER -->|Clean context| LLM
    LLM -.->|Always visible| META
    LLM -->|Survey metadata| DECIDE
    DECIDE -->|retrieve_context| REFSTORE
    REFSTORE -->|Return data| LLM
    LLM -->|Tool calls with refs| TOOLS
    LLM -->|Large responses| REFSTORE
    REFSTORE -.->|Store metadata| META
    
    style LLM fill:#e1f5ff
    style PRUNER fill:#ff9999
    style META fill:#99ff99
    style REFSTORE fill:#f0f0f0
```

### Bidirectional Flow

**Direction 1: Environment → LLM (Data Files)**
```
1. Tool creates reference: read_file("data.csv", return_mode="reference", ref_id="sales_2024")
2. Environment stores 50MB file, returns metadata (~50 tokens)
3. LLM decides: Can I answer from metadata? → No
4. LLM requests: retrieve_context(["sales_2024"])
5. Environment injects 12.5M tokens into context
6. Next user message → Auto-prune removes data, keeps metadata
```

**Direction 2: LLM → Environment (Assistant Outputs)**
```
1. LLM generates large report (5K tokens)
2. LLM decides: This should be a reference (user may ask follow-ups)
3. LLM calls: assistant_response(content={value: report}, ref_id="market_analysis_q1")
4. Environment stores report, returns metadata (~100 tokens)
5. User sees: Summary + download link
6. Follow-up question → LLM retrieves report if needed
```

---

## Implementation with Claude Sonnet 4.5

### Structured Outputs for Metadata

Claude Sonnet 4.5's structured output feature (`anthropic-beta: structured-outputs-2025-11-13`) guarantees schema-compliant metadata:

```python
from anthropic import Anthropic
import json

client = Anthropic(api_key="...")

# Define metadata schema for references
ReferenceMetadata = {
    "type": "object",
    "properties": {
        "reference": {"type": "string"},
        "data_type": {"type": "string", "enum": ["csv", "json", "image", "code", "document"]},
        "size_bytes": {"type": "integer"},
        "row_count": {"type": "integer"},
        "summary": {"type": "string"},
        "key_entities": {
            "type": "array",
            "items": {"type": "string"}
        },
        "sample_data": {"type": "string"}
    },
    "required": ["reference", "data_type", "size_bytes", "summary"],
    "additionalProperties": False
}

# Tool definition with strict schema
tools = [
    {
        "name": "read_file",
        "description": "Read a file and return as reference",
        "input_schema": {
            "type": "object",
            "properties": {
                "filepath": {"type": "string"},
                "return_mode": {"type": "string", "enum": ["value", "reference"]},
                "ref_id": {"type": "string"}
            },
            "required": ["filepath", "return_mode"]
        },
        "strict": True  # Guaranteed schema compliance
    },
    {
        "name": "retrieve_context",
        "description": "Retrieve full data for references",
        "input_schema": {
            "type": "object",
            "properties": {
                "ref_ids": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["ref_ids"]
        },
        "strict": True
    },
    {
        "name": "assistant_response",
        "description": "Store large assistant output as reference",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "ref_id": {"type": "string"},
                "metadata": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["report", "code", "analysis", "document"]},
                        "summary": {"type": "string"},
                        "key_points": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["type", "summary"]
                }
            },
            "required": ["content", "ref_id", "metadata"]
        },
        "strict": True
    }
]
```

### Auto-Pruning Implementation

```python
class ConversationManager:
    def __init__(self):
        self.reference_store = {}  # Unlimited storage
        self.metadata_catalog = {}  # Always in context
        
    def process_turn(self, user_message, conversation_history):
        # STEP 1: Auto-prune retrieved data
        pruned_history = self._prune_retrieved_data(conversation_history)
        
        # STEP 2: Build context with metadata catalog
        context = self._build_context(pruned_history, self.metadata_catalog)
        
        # STEP 3: Send to Claude (< 200K tokens)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=8000,
            messages=context + [{"role": "user", "content": user_message}],
            tools=tools
        )
        
        return response
    
    def _prune_retrieved_data(self, history):
        """Remove retrieve_context calls and their data responses"""
        pruned = []
        skip_next = False
        
        for msg in history:
            if skip_next:
                skip_next = False
                continue
                
            if self._is_retrieve_call(msg):
                skip_next = True  # Skip the data response too
                continue
                
            pruned.append(msg)
        
        return pruned
    
    def _build_context(self, history, metadata):
        """Inject metadata catalog as always-visible system context"""
        metadata_prompt = self._format_metadata_catalog(metadata)
        
        return [
            {"role": "system", "content": f"Available references:\n{metadata_prompt}"},
            *history
        ]
    
    def _format_metadata_catalog(self, metadata):
        """Format metadata for efficient token usage"""
        catalog = []
        for ref_id, meta in metadata.items():
            catalog.append(f"- {ref_id}: {meta['data_type']}, "
                          f"{meta['size_bytes']:,} bytes, "
                          f"{meta['summary']}")
        return "\n".join(catalog)
```

### Token Efficiency Example

**Scenario**: Analyzing 5 CSV files (250MB total)

**Without URS**:
```
Initial load: 250MB × 2,500 tokens/MB = 625,000 tokens
Status: ❌ CRASH (exceeds 200K limit by 3x)
```

**With URS**:
```
Turn 1: Load all files as references
- 5 files × 50 tokens metadata = 250 tokens
- Status: ✅ 0.125% of context used

Turn 2: "Count records in each file"
- Metadata has row_count fields
- No retrieval needed
- Response: 250 tokens (metadata only)
- Status: ✅ 0.25% of context used

Turn 3: "Show top 10 products by revenue"
- retrieve_context(["sales_2024"])  # Only 1 file needed
- 50MB × 2,500 = 125,000 tokens
- Status: ✅ 62.5% of context used (within limit)

Turn 4: "Now analyze customer demographics"
- Auto-prune: sales_2024 data removed
- retrieve_context(["customers_2024"])
- 40MB × 2,500 = 100,000 tokens
- Status: ✅ 50% of context used

Total operations: 4 analyses across 250MB dataset
Peak context usage: 62.5% (125K/200K tokens)
Without URS: Would crash on initial load
```

---

## Real-World Use Case: Document Analysis Pipeline

### Scenario
A legal firm needs Claude to analyze 1,000 court documents (2GB total) to find precedents for a current case.

### Traditional Approach
```
Load all documents → CRASH (2GB = 5M tokens vs 200K limit)
```

### URS Approach

```mermaid
sequenceDiagram
    participant User
    participant Claude
    participant Environment
    
    User->>Claude: Analyze 1000 legal docs for patent precedents
    
    rect rgb(255, 240, 240)
    Note over Claude: Turn 1: Setup
    Claude->>Environment: bulk_read_files(*.pdf, return_mode="reference")
    Environment->>Claude: 1000 refs with metadata (50K tokens total)
    Note over Claude: Metadata shows: case names, dates, court levels, topics
    end
    
    rect rgb(240, 255, 240)
    Note over Claude: Turn 2: Metadata filtering
    User->>Claude: Focus on Federal Circuit cases from 2015-2025
    Claude->>Claude: Filter metadata: 147 cases match
    Claude->>User: Found 147 relevant cases (no retrieval needed)
    end
    
    rect rgb(240, 240, 255)
    Note over Claude: Turn 3: Deep analysis
    User->>Claude: Analyze those 147 cases in detail
    Claude->>Environment: retrieve_context([case_1, case_2, ... case_147])
    Environment->>Claude: 147 docs = 180K tokens
    Note over Claude: Within 200K limit!
    Claude->>Claude: Analyze precedents, extract holdings
    Claude->>Environment: assistant_response(analysis, ref_id="patent_analysis")
    Environment->>Claude: Stored as reference (metadata: 100 tokens)
    Claude->>User: Summary + link to full analysis
    end
    
    rect rgb(255, 255, 240)
    Note over Claude: Turn 4: Follow-up (auto-pruned)
    User->>Claude: Compare with current case details
    Note over Claude: 147 case docs auto-pruned
    Claude->>Environment: retrieve_context(["patent_analysis"])
    Environment->>Claude: 5K token analysis (small, efficient)
    Claude->>User: Comparative analysis
    end
```

**Results**:
- Processed 2GB of documents within 200K context window
- 4 conversational turns
- Peak context: 180K tokens (90% utilization)
- Zero crashes, zero manual memory management

---

## Advanced Pattern: Generational Caching

Inspired by CPU caches (L1/L2/L3), URS can implement tiered retrieval:

```python
class TieredReferenceSystem:
    def __init__(self):
        self.l1_cache = {}  # Hot data (current turn) - in context
        self.l2_cache = {}  # Warm data (recent turns) - metadata only
        self.l3_store = {}  # Cold data (old turns) - full pruned
        
    def retrieve_with_promotion(self, ref_id):
        """
        Promote frequently accessed references through cache tiers
        Similar to cache line promotion in CPU caches
        """
        if ref_id in self.l1_cache:
            # Already in context, no-op
            return self.l1_cache[ref_id]
        
        if ref_id in self.l2_cache:
            # Recent access, promote to L1
            data = self.l3_store[ref_id]
            self.l1_cache[ref_id] = data
            return data
        
        # Cold start, load from store
        data = self.l3_store[ref_id]
        self.l2_cache[ref_id] = self.get_metadata(ref_id)
        self.l1_cache[ref_id] = data
        return data
```

---

## Performance Characteristics

### Time Complexity

| Operation | Without URS | With URS |
|-----------|-------------|----------|
| Load 100MB file | O(n) - crashes if > 200K tokens | O(1) - metadata only (~50 tokens) |
| Pass file to tool | O(n) - full data in context | O(1) - reference pointer |
| Switch contexts | O(n) - manual cleanup | O(1) - auto-prune |
| Multi-file analysis | O(n×m) - all files in context | O(k) - only needed files, k < n |

### Space Complexity

| Scenario | Context Usage Without URS | Context Usage With URS |
|----------|---------------------------|------------------------|
| 10 CSV files (500MB) | 1.25M tokens (❌ crash) | 500 tokens metadata |
| 50 code files (2.5MB) | 150K tokens | 2.5K tokens metadata |
| 20-turn conversation | 100K tokens (cumulative) | 5K tokens (auto-pruned) |
| Large assistant report | 5K tokens per turn × 10 = 50K | 100 tokens metadata × 10 = 1K |

---

## Implementation Checklist

Building URS requires:

✅ **Reference Store**: Persistent key-value store (Redis, S3, filesystem)  
✅ **Metadata Extractor**: Generate summaries, samples, schemas from data  
✅ **Auto-Pruner**: Middleware that intercepts user messages  
✅ **Retrieval Handler**: Batch fetch multiple references efficiently  
✅ **Tool Adapter**: Convert references to values before tool execution  
✅ **Structured Output Schemas**: Define metadata formats with Claude's structured outputs  
✅ **Context Monitor**: Track token usage, warn on approaching limits  

---

## Conclusion

The Unified Reference System demonstrates that classical CS memory management principles—virtual memory, garbage collection, caching—translate effectively to LLM context management. By treating the context window as a scarce resource (like RAM) and implementing bidirectional reference passing with automatic garbage collection, we enable Claude Sonnet 4.5 to work with effectively unlimited data while staying within its 200K token limit.

**Key Takeaway**: The future of agentic AI isn't just smarter models—it's smarter memory architectures that let models work with human-scale data within machine-scale constraints.

---

## References

- [Claude Sonnet 4.5 Documentation](https://docs.claude.com/en/docs/about-claude/models/overview)
- [Structured Outputs API](https://docs.claude.com/en/docs/build-with-claude/structured-outputs)
- [Context Window Limits](https://support.claude.com/en/articles/7996856-what-is-the-maximum-prompt-length)
- Virtual Memory (Tanenbaum, Modern Operating Systems)
- Garbage Collection (Jones & Lins, The Garbage Collection Handbook)
- Database Query Optimization (Ramakrishnan & Gehrke, Database Management Systems)