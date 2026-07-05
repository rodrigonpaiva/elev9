# ADR-008 — AI Coach Streaming Infrastructure

## Status

Accepted

## Context

The AI Coach already shipped with a synchronous chat contract, deterministic fallback, optional OpenAI assistance, safety controls, reliability controls, and internal observability.

As the coach experience expanded, we needed a way to stream responses token-by-token without changing the public synchronous API or duplicating coach logic. The new transport had to remain additive:

- `POST /ai/chat` must keep working exactly as before
- the same chat use-case must power both sync and stream modes
- safety must run before any stream is opened
- reliability and observability must remain shared
- deterministic fallback must remain available

## Decision

Add a dedicated streaming transport for coach chat while reusing the existing sync pipeline.

The implementation now follows this shape:

```txt
Controller
→ CreateCoachChatUseCase
→ AiPromptBuilder
→ AiSafetyService
→ AiLlmService
→ AiLlmReliabilityService
→ OpenAiLlmProvider
→ OpenAI Responses API
```

The stream route is additive:

- it reuses the same `CreateCoachChatUseCase`
- it can emit deltas as they are produced
- it still persists the final assistant message and conversation memory through the same flow
- it falls back to the synchronous execution path when streaming is disabled or unsupported
- it cancels the OpenAI request when the client disconnects

Streaming is gated by `AI_LLM_STREAMING_ENABLED`, provider capability metadata, and model capability metadata. When the stream cannot be used, the system executes the synchronous path instead of inventing a separate chat implementation.

## Consequences

### Positive

- the coach can feel responsive without changing the stable sync API
- the backend keeps one business flow for chat persistence and memory updates
- the same safety, reliability, and observability layers protect both modes
- mobile can adopt streaming later without a backend rewrite
- feature gating keeps the transport opt-in

### Negative

- the transport layer becomes more complex than plain JSON responses
- cancellation and partial-output handling require explicit control flow
- the controller must support SSE-style or chunked response handling

## Trade-offs

Streaming improves perceived latency and user experience, but it introduces partial-response semantics that do not exist in the synchronous path.

The design chooses to keep business behavior centralized and let transport complexity live at the edges:

- chat composition stays in the use-case layer
- OpenAI event handling stays in the provider layer
- HTTP streaming stays in the controller layer

That keeps the system maintainable and preserves the deterministic fallback path.

## Future Extensions

This ADR leaves room for:

- richer stream event types
- voice-first coaching
- typed incremental tool responses
- realtime transport upgrades
- long-term memory surfaced through stream events

Those are future transport or interaction changes, not current product behavior.
