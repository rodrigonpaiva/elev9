# ADR-010 — AI Agent Platform Core Architecture

## Status

Accepted

## Context

The Elev9 Coach AI module already has a deterministic-first conversational stack with optional OpenAI-assisted replies, prompt governance, streaming, safety, reliability, observability, and replay/debug surfaces.

As the internal AI platform evolves, the team needs a stable foundation for agent-oriented orchestration without changing public APIs, mobile contracts, prompt content, or the current fallback behavior.

The next step is to introduce agent primitives internally first so the chat pipeline can evolve from:

```txt
User asks question
→ Prompt Builder
→ LLM
→ Reply
```

to an internal agent runtime model:

```txt
User asks question
→ Agent Runtime
→ Intent Classification
→ Working Memory
→ Session Memory
→ Conversation Memory
→ Agent Context
→ Agent Plan
→ Agent Actions
→ Agent Result
→ LLM Reply
```

This should happen without exposing the orchestration surface externally. The platform needs the structure first, not a tool graph.

## Decision

Introduce an internal-only agent runtime foundation inside the `ai` module.

The foundation includes:

- internal agent request, context, plan, step, action, action result, response, runtime metadata, and memory scope types
- deterministic intent classification and a centralized context selection policy
- a centralized policy engine and registry that govern context, tool, memory, and LLM decisions
- an internal `AgentContextOrchestrator` that decides which domains to load before prompt construction
- an internal `AgentToolRegistry` that catalogs internal capabilities without executing them yet
- a deterministic planning engine and plan validator that build an immutable execution snapshot
- step tracking for internal observability
- a minimal `AgentRuntime` wrapper around the existing chat orchestration path
- a disabled-by-default feature flag: `AI_AGENT_RUNTIME_ENABLED=false`
- bounded step tracking via `AI_AGENT_MAX_STEPS=6`
- a deterministic multi-step execution engine that runs bounded ordered plan steps without recursive planning

The agent runtime wraps the existing conversational flow. It does not replace it, and it does not change the public `POST /ai/chat` contract or the mobile response shape.

Tool execution is explicitly postponed. Actions remain declarative only.

### Context orchestrator vs context builder

The new orchestration layer is intentionally split in two:

- the `AgentContextOrchestrator` classifies intent, selects domains, and requests only the required slices
- the existing context builder and chat loader keep the actual loading logic and normalization concerns

This keeps the orchestration policy deterministic and centralized while preserving the existing loading implementations.

### Tool registry vs tool execution

The registry is intentionally metadata-only in this phase:

- it catalogs the internal capabilities that could be executed later
- it allows the runtime to reason about candidate and selected tools without dispatching them
- it keeps execution postponed until the safety, reliability, and orchestration story is ready
- it avoids changing the public API or introducing external tool protocols before the platform needs them

Future execution can be layered on top of the same catalog without reworking the runtime shape again.

### Policy engine and governance

The policy layer is the single source of truth for runtime authorization:

- it decides which context domains may load
- it decides which tools may be considered or executed
- it decides when the LLM may be called
- it decides when deterministic fallback is required
- it reuses the existing safety layer instead of duplicating it
- it keeps cost, latency, and memory-gating rules centralized

This keeps runtime decisions auditable and prevents scattered `if`/`else` governance logic across the agent stack.

### Planning engine vs execution

The planning engine is also internal-first and deterministic:

- it receives the classified intent, selected context domains, and candidate/selected tool metadata
- it chooses an execution strategy without LLM reasoning
- it produces an ordered, immutable plan snapshot
- it validates and normalizes the plan before the runtime records it
- it does not execute tools and it does not replace the existing chat flow

This keeps the execution graph explicit while preserving the current deterministic fallback behavior.

### Memory layer vs conversation memory

The memory layer is intentionally split into deterministic scopes:

- `Working Memory` lasts for a single agent execution
- `Session Memory` tracks bounded short-term state across the conversation
- `Conversation Memory` continues to reuse the existing persisted summary and repository

This keeps the current memory model deterministic while postponing semantic retrieval until the platform actually needs it.

### Tool execution pipeline

The first execution phase is deliberately read-only and internal:

- it only runs when both `AI_AGENT_RUNTIME_ENABLED=true` and `AI_AGENT_TOOLS_ENABLED=true`
- it executes selected internal tools from the validated plan
- it enforces bounded execution, per-tool timeouts, and deterministic skipping
- it records normalized tool results in internal metadata only
- it does not expose raw tool payloads to mobile clients
- it keeps write actions out of scope until the execution boundary is proven stable

This creates a safe execution seam for write-capable orchestration without changing the public chat contract.

### Multi-step execution engine

The runtime now includes an internal execution engine that:

- consumes a validated plan snapshot
- executes a deterministic ordered list of steps
- refreshes working memory after each step
- stops on critical failure
- preserves the existing public response shape

It is intentionally not autonomous:

- it does not create new plans while executing
- it does not recurse
- it does not parallelize steps
- it does not bypass the current prompt/safety/reliability stack

### Agent observability and trace model

The runtime also maintains an internal trace model for each request:

- one trace is created per agent execution
- the trace records intent, context selection, policy decisions, planning, execution steps, tool selection, memory snapshots, and fallback usage
- the trace stores only sanitized metadata, not raw prompts, raw user messages, raw assistant messages, API keys, JWTs, or bearer tokens
- the trace is retained in bounded in-memory storage with deterministic count and TTL pruning
- the trace is internal-only and does not change the public chat response shape or mobile contracts

The trace layer keeps the platform ready for additional observability backends without adding an external dependency today.

### Ordered pipeline

```txt
User
↓
Agent Runtime
↓
Policy Engine
↓
Working Memory
↓
Session Memory
↓
Context Orchestrator
↓
Planning Engine
↓
Execution Engine
↓
Tool Pipeline
↓
Prompt Builder
↓
Safety
↓
Reliability
↓
Observability
↓
OpenAI / Deterministic Fallback
↓
Persistence
↓
Conversation Memory
```

## Rationale

### Why internal first

Agent orchestration is a structural change, but the product already has a stable public chat contract. Keeping the runtime internal lets the team evolve the architecture without exposing unfinished behavior to clients.

### Why tool execution is postponed

Tool execution introduces additional safety, reliability, and failure-mode complexity. The platform needs the agent scaffolding, deterministic planning, and observability hooks before any tool graph is introduced.

The registry therefore exists as catalog metadata only. It gives the runtime a stable discovery surface while leaving execution for a later phase.

### Why the default is disabled

The existing deterministic chat path is already production-safe. Defaulting the agent runtime off preserves the current behavior, reduces rollout risk, and keeps upgrades opt-in.

### Why keep the current chat flow

The current prompt builder, safety layer, reliability layer, observability layer, and deterministic fallback already work. The agent runtime should wrap that system first, not replace it.

## Consequences

### Positive

- the platform gains internal agent primitives without exposing new public API surface
- the chat pipeline is ready for expanded tool orchestration
  - the tool registry gives the runtime a stable internal capability catalog
  - the planning engine creates an immutable, validated execution snapshot for orchestration
  - the memory layer separates working, session, and conversation memory without semantic retrieval
  - the tool execution pipeline can be introduced behind feature flags without changing the public response shape
  - deterministic step tracking improves observability
  - deterministic multi-step execution keeps the runtime bounded and debuggable
  - feature-flagged rollout keeps behavior stable by default
  - the runtime can absorb write or external tool execution without reworking the chat contract
  - the runtime can be released behind feature flags once the production hardening checklist is green

### Negative

- the AI module now carries an additional internal abstraction layer
- plan and context modeling must remain consistent with the existing chat flow
- step tracking and runtime metadata need to stay internal-only until the platform is ready
- semantic memory is still intentionally postponed until the deterministic memory layers prove out

## Relationship To Existing ADRs

- ADR-004 established the conversational coach architecture
- ADR-008 established additive streaming on the same use case
- ADR-009 established deterministic rollout and prompt governance
- this ADR now also anchors the internal tool registry and planning layers that support execution planning

This ADR extends that path with internal agent scaffolding, but keeps the same deterministic-first posture.
