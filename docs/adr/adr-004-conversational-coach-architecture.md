# ADR-004 — Conversational Coach Architecture

## Status

Accepted

## Context

The Elev9 Coach product evolved from static or lightly contextual feedback toward a conversational coaching layer.

The initial product loop was centered on:

- recovery-aware dashboard signals
- deterministic coach feedback
- explainability metadata
- internal debug and replay infrastructure

That foundation was useful, but it did not provide a direct conversational surface for the user to interact with the coach in a context-aware way.

The product now needs a conversational layer that is still:

- deterministic
- explainable
- safe
- easy to debug
- aligned with recovery and nutrition heuristics

This ADR documents the current conversational architecture as an internal product capability. It is not a commitment to LLM-first orchestration, semantic memory, or streaming chat.

## Decision

The conversational coaching pipeline is structured as:

```txt
User Message
→ Authenticated User
→ UserHealthContext
→ CoachChatReplyGenerator
→ Deterministic Reply
→ Message Persistence
→ Chat History
```

The backend remains the source of truth for:

- user authentication
- health context composition
- deterministic conversational replies
- conversation persistence
- history retrieval

The current conversational experience is exposed through:

- `POST /ai/chat`
- `GET /ai/chat/history`
- `CoachChatScreen`

## Conversational Entities

### CoachConversation

`CoachConversation` represents a conversation thread owned by a user profile.

Responsibilities:

- identify the conversation scope for the user
- provide the persistence anchor for chat messages
- keep the conversation layer separated from public coach feedback history

Current fields:

- `id`
- `userProfileId`
- `createdAt`
- `updatedAt`

### CoachMessage

`CoachMessage` represents a single message in a coach conversation.

Responsibilities:

- persist the user message
- persist the assistant reply
- preserve chronological message history

Current fields:

- `id`
- `conversationId`
- `role`
- `content`
- `createdAt`

The supported roles are:

- `user`
- `assistant`

## Deterministic-First Strategy

The chat layer does not use an LLM in the current implementation.

This is intentional. The design prioritizes:

- predictability
- explainability
- lower operational risk
- easier debugging
- alignment with the existing deterministic recovery layer

The reply generator reuses `UserHealthContext` and interprets the current state through small, testable heuristics.

## Relationship With Existing Adaptive Systems

The conversational layer is not isolated from the rest of the product.

It is built on top of the same adaptive signals used elsewhere in the system:

- `UserHealthContext`
- `fatigueLevel`
- `recoveryTrend`
- nutrition guidance
- daily check-ins
- adaptive dashboard signals

That means the chat experience can respond consistently with the rest of the product without duplicating the domain model.

## Safety Constraints

The current chat layer deliberately avoids:

- medical claims
- autonomous diagnosis
- long-term memory
- streaming
- replay
- generative orchestration

The responses are conversational, but they remain bounded by the same safe reduced context used throughout the product.

## Rationale

### Why deterministic first

The product needs a conversational experience that can be tested and debugged before introducing probabilistic generation.

### Why reuse UserHealthContext

The health context already aggregates the user state needed for recovery-aware and nutrition-aware interactions.

Reusing it keeps conversational behavior aligned with the rest of the adaptive system.

### Why persistence matters now

Persisting conversations and messages makes it possible to:

- retrieve history
- preserve continuity
- debug conversation behavior
- evolve toward richer interaction patterns later

### Why no LLM yet

An LLM is not required to validate the first conversational loop.

Introducing it too early would make the behavior harder to reason about and would weaken the current explainability model.

## Consequences

### Positive

- direct conversational surface for the user
- deterministic and explainable replies
- simple history retrieval
- aligned with existing adaptive coaching
- easier debugging and future evolution

### Negative

- chat behavior remains simple
- no multi-turn memory beyond persistence
- no streaming UX
- no LLM-powered reasoning yet

## Future Directions

Potential future extensions, explicitly not implemented:

- LLM integration
- LangGraph orchestration
- semantic memory
- conversation replay
- evaluation engine
- multi-agent routing
- streaming
- voice interface

These ideas are future architecture options, not current product capabilities.

## Relationship With ADRs

### ADR-002

`ADR-002 — Recovery & Adaptive Coaching System` establishes the deterministic recovery foundation that feeds the conversational layer.

### ADR-003

`ADR-003 — Coach Feedback Explainability & Replay System` establishes the traceability and debug model that informed the broader adaptive coaching architecture.

### ADR-004

This ADR extends that architecture into the conversational surface.

It keeps the product aligned around:

- deterministic behavior
- explainability
- reduced safe context
- debug-friendly persistence

## Technical Notes

### Current Endpoints

- `POST /ai/chat`
- `GET /ai/chat/history`

### Current Modules

- `ai`
- `dashboard`
- `mobile`
- `users`

### Current Components

- `BuildUserHealthContextService`
- `CoachChatReplyGenerator`
- `CoachConversationRepository`
- `CoachMessageRepository`
- `CoachChatScreen`

### Shared Contracts

The conversational layer is exposed through shared contracts in:

- `packages/types`
- `packages/api-client`

## Summary

The Conversational Coach Architecture adds a deterministic, context-aware chat layer to Elev9 Coach.

It expands the adaptive coaching system from feedback generation into direct interaction, while keeping the implementation explainable, testable, and aligned with the recovery-first foundation of the product.
