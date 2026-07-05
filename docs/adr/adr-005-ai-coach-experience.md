# ADR-005 — AI Coach Experience

## Status

Accepted

## Context

Elev9 originally exposed coaching through separate surfaces: dashboard signals, coach feedback, and chat. That was useful, but it still made the product feel like a collection of features instead of one coaching experience.

The shipped mobile implementation now has a broader coach layer:

- Coach Home
- Coach Conversation
- Daily Briefing
- Coach Memory Timeline
- Coach Insights
- Ask Coach
- Weekly Review
- Goal Guidance
- Smart Notifications

The product needed one clear primary experience that ties those surfaces together and explains what matters today, why it matters, what to do next, and how the coach is helping.

## Decision

Make the AI Coach the primary contextual experience in mobile.

The coach layer composes existing bounded contexts rather than duplicating them:

- `training`
- `nutrition`
- `recovery`
- `goals`
- `habits`
- `personalization`
- `notifications`
- `progress`

The coach experience is split into focused surfaces instead of one monolithic chat screen:

- Coach Home for today’s coaching summary
- Conversation for contextual back-and-forth
- Daily Briefing for the morning interpretation of the day
- Memory Timeline for durable behavioral recall
- Insights for explainable recommendations
- Ask Coach for one-tap contextual prompts
- Weekly Review for week-level reflection
- Goal Guidance for long-horizon strategy
- Notifications for proactive nudges

The UI remains calm and premium. When conversational generation uses OpenAI, it is wrapped in a safety layer and a reliability layer with prompt sanitization, PII redaction, output validation, timeout, retry, circuit breaker, kill switch, structured logging, and deterministic fallback. The coach never exposes raw prompts, internal reasoning, or debug internals.

The current production implementation also includes an observability and cost-control layer so LLM requests can be traced, token usage can be counted, estimated cost can be tracked, and request-level guardrails can be enforced without changing the public API.
The chat surface also exposes an additive streaming transport on top of the same conversational use-case, while keeping the synchronous contract intact.
Prompt versions are governed internally through a registry, deterministic canary rollout, rollback configuration, and internal evaluation runner.

## Trade-offs

### Benefits

- one coherent coaching model across mobile
- lower user friction than a chatbot-first flow
- clearer explanation of recommendations
- easier reuse of shared read models
- stronger product identity
- operational visibility into LLM usage and cost

### Costs

- more coach-specific screens to maintain
- more coordination across read models
- more navigation surfaces to keep consistent

## Consequences

- the mobile app now has a clear coaching center of gravity
- dashboard, workout, nutrition, recovery, and profile can route into the same coach system
- explainability must stay consistent across every coach surface
- LLM availability must remain non-blocking because deterministic fallback is the source of truth for product continuity
- future AI additions should extend the existing coach shell instead of replacing it
- request traces, token accounting, and cost guardrails become first-class internal concerns

## Future Extensions

The current architecture leaves room for:

- voice conversations
- speech-to-text
- text-to-speech
- long-term memory
- emotional coaching
- multimodal inputs
- wearable-driven coaching
- calendar-aware coaching

These are future extensions, not current product behavior.
