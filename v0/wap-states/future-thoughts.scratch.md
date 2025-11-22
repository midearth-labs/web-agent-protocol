Parallel and Map could have BreakDeciders also?
e.g. if requesting approval from 5 people, once I get two I can stop and move on.


ADWE
The Pattern: Agent-Designed, Workflow-Executed (ADWE)
This represents a broader enterprise pattern:
AI designs the solution (leveraging planning capabilities)
Humans review and approve (maintaining control)
Workflows execute deterministically (reliability and auditability)

It's not about choosing "agents vs workflows." Real systems exist on a spectrum:
Compiled execution (WAP V2): Generate executable workflow with bound tool calls, zero interpretation overhead
Interpreted execution (traditional plan-and-execute): Generate plans as instructions, another process interprets them
Continuous interpretation (ReAct loops): Reason and act at each step, maximum flexibility and overhead

Most production systems mix these approaches. They use workflows for predictable parts and agents for dynamic parts. The key is matching the pattern to the problem.
For WAP's use case (web automation with human approval), compiled execution makes sense. For open-ended research or high-uncertainty environments, continuous interpretation is necessary.