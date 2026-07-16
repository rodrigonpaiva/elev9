# Coach Intelligence Aggregation - Runtime Flow

## 1. Purpose

This document describes the runtime flows for the Coach Intelligence Aggregate defined in [architecture.md](./architecture.md). It is intentionally operational: the goal is to make execution deterministic, observable, and implementable without ambiguity.

## 2. Runtime Overview

```mermaid
flowchart TD
  Request[Authenticated request] --> Flag[Feature flag / rollout gate]
  Flag --> Load[Context loading]
  Load --> Compose[Expert composition]
  Compose --> Persona[Persona guidance]
  Persona --> Explain[Structured explainability]
  Explain --> Map[Contract mapping]
  Map --> Observe[Observability completion]
  Observe --> Response[Shared response]
  Flag --> Legacy[Legacy compatibility path]
  Legacy --> Response
```

## 3. Successful Request

### Actors

- Mobile Coach hook or any authenticated client
- `CoachIntelligenceController`
- `GetCoachIntelligenceUseCase`
- `CoachIntelligenceContextAssembler`
- `CoachExpertCompositionService`
- `CoachPersonaEngineService`
- `CoachExplainabilityService`
- `CoachExpertObservabilityService`
- `CoachIntelligenceResponseMapper`

### Sequence

```mermaid
sequenceDiagram
  participant Client as Authenticated client
  participant Controller as CoachIntelligenceController
  participant UseCase as GetCoachIntelligenceUseCase
  participant Assembler as CoachIntelligenceContextAssembler
  participant Compose as CoachExpertCompositionService
  participant Persona as CoachPersonaEngineService
  participant Explain as CoachExplainabilityService
  participant Observe as CoachExpertObservabilityService
  participant Mapper as CoachIntelligenceResponseMapper

  Client->>Controller: GET /ai/coach-intelligence
  Controller->>UseCase: validated request
  UseCase->>Observe: start trace
  UseCase->>Assembler: load source contexts in parallel
  Assembler-->>UseCase: normalized context snapshot
  UseCase->>Compose: compose unified intelligence
  Compose-->>UseCase: unified coach intelligence
  UseCase->>Persona: build persona guidance
  Persona-->>UseCase: persona guidance
  UseCase->>Explain: build structured explanation
  Explain-->>UseCase: explanation
  UseCase->>Mapper: map to shared contract
  Mapper-->>UseCase: public response contract
  UseCase->>Observe: complete trace
  UseCase-->>Controller: response DTO
  Controller-->>Client: 200 OK
```

### Expected response

- `200 OK`
- canonical Coach Intelligence Aggregate
- section-level freshness and availability metadata
- no prompt contents, no chain-of-thought, no internal policy metadata

## 4. Partial Failure

Partial failure occurs when one or more optional source contexts are unavailable but the aggregate can still be assembled safely.

### Required behavior

- the request MUST still return `200 OK` when a safe aggregate can be built;
- the missing section MUST be marked as `PARTIAL` or `MISSING`;
- fallback fields MUST be explicit;
- mobile MUST not infer missing sections by parsing internal errors.

### Sequence

```mermaid
sequenceDiagram
  participant Client as Authenticated client
  participant Controller as CoachIntelligenceController
  participant UseCase as GetCoachIntelligenceUseCase
  participant Assembler as CoachIntelligenceContextAssembler
  participant Source as Optional source adapter
  participant Compose as CoachExpertCompositionService
  participant Observe as CoachExpertObservabilityService

  Client->>Controller: GET /ai/coach-intelligence
  Controller->>UseCase: request
  UseCase->>Observe: start trace
  UseCase->>Assembler: load all contexts
  Assembler->>Source: request optional context
  Source-->>Assembler: unavailable / timeout / empty
  Assembler-->>UseCase: partial snapshot with section status
  UseCase->>Compose: compose from available sources
  Compose-->>UseCase: safe partial aggregate
  UseCase->>Observe: record partial failure and fallback
  UseCase-->>Controller: 200 with partial sections
  Controller-->>Client: 200 OK
```

### Failure behavior

- optional source failure never exposes raw infrastructure errors to the client;
- the aggregate remains deterministic for the same source snapshot and flag state;
- observability MUST record which section failed and whether fallback was used.

## 5. Missing Context

Missing context means a source domain has no data for the current user or the current time slice.

### Examples

- no current goal;
- no personalization snapshot;
- no notification history;
- no recovery snapshot for the requested period.

### Required behavior

- missing context is not an infrastructure failure;
- missing context MUST be represented as an explicit empty or unavailable section;
- the response SHOULD remain 200 if the aggregate can be safely assembled;
- the client MUST see a stable empty-state signal, not a hidden exception.

### Sequence

```mermaid
sequenceDiagram
  participant Assembler as CoachIntelligenceContextAssembler
  participant Goal as Goal source adapter
  participant UseCase as GetCoachIntelligenceUseCase

  Assembler->>Goal: load current goal
  Goal-->>Assembler: no current goal
  Assembler-->>UseCase: goal section = missing
  UseCase->>UseCase: choose neutral or fallback recommendation
  UseCase-->>UseCase: aggregate remains valid
```

## 6. Feature Flag Disabled

### Required behavior

When the aggregate is disabled:

- the backend MUST use the legacy compatibility path;
- the client MUST continue to receive a valid Coach response;
- no rollout-specific metadata MUST leak to mobile;
- the aggregate implementation SHOULD still be testable through internal validation.

### Sequence

```mermaid
sequenceDiagram
  participant Client as Authenticated client
  participant Controller as CoachIntelligenceController
  participant Gate as CoachIntelligenceGateService
  participant Legacy as Legacy compatibility path
  participant Response as Shared response

  Client->>Controller: GET /ai/coach-intelligence
  Controller->>Gate: evaluate flag state
  Gate-->>Controller: disabled
  Controller->>Legacy: use existing compatibility result
  Legacy-->>Response: legacy coach payload
  Controller-->>Client: 200 OK
```

### Notes

- the disabled state is not an error;
- the disabled state is a release-control decision;
- the fallback path MUST preserve current mobile behavior.

## 7. Timeout

Timeout applies to any source adapter or internal stage that exceeds the configured budget.

### Required behavior

- timeout in optional sources SHOULD degrade to partial data;
- timeout in the primary safe insight path MAY become a 5xx if no safe fallback exists;
- timeout MUST be observed and recorded;
- timeout MUST NOT cause an infinite retry loop.

### Sequence

```mermaid
sequenceDiagram
  participant UseCase as GetCoachIntelligenceUseCase
  participant Adapter as Source adapter
  participant Observe as CoachExpertObservabilityService

  UseCase->>Adapter: load source context
  Adapter--x UseCase: timeout
  UseCase->>Observe: record timeout and section status
  UseCase->>UseCase: choose fallback or partial aggregate
```

## 8. Fallback

Fallback is deterministic and backend-owned.

### Decision rules

- primary coach insight fallback SHOULD prefer the current coach decision if safe;
- optional section fallback SHOULD prefer explicit empty-state metadata;
- recommendation fallback MUST never invent new guidance;
- fallback MUST preserve ordering and risk semantics.

### Sequence

```mermaid
sequenceDiagram
  participant UseCase as GetCoachIntelligenceUseCase
  participant Compose as CoachExpertCompositionService
  participant Mapper as CoachIntelligenceResponseMapper

  UseCase->>Compose: compose available sources
  Compose-->>UseCase: partial result
  UseCase->>UseCase: apply deterministic fallback policy
  UseCase->>Mapper: map fallback-aware aggregate
  Mapper-->>UseCase: response DTO
```

## 9. Observability

The runtime MUST record:

- request started;
- context loading started and completed;
- source counts and source failures;
- partial or fallback usage;
- composition duration;
- persona duration;
- explainability duration;
- response completion;
- replay parity where available.

Observability MUST be internal-only. It MUST NOT surface prompts, raw messages, or policy internals to the client.

### Sequence

```mermaid
sequenceDiagram
  participant UseCase as GetCoachIntelligenceUseCase
  participant Observe as CoachExpertObservabilityService
  participant Trace as Internal trace store

  UseCase->>Observe: start trace
  UseCase->>Observe: complete trace
  Observe->>Trace: persist bounded trace metadata
```

## 10. Replay

Replay is an internal validation flow. It is not a new public feature.

### Required behavior

- replay MUST use the same deterministic aggregate logic where possible;
- replay SHOULD compare persisted trace metadata with recalculated output;
- replay results MUST stay internal unless explicitly approved;
- replay MUST not leak prompts or hidden reasoning.

### Sequence

```mermaid
sequenceDiagram
  participant Internal as Internal validator
  participant Trace as CoachExpertObservabilityService
  participant UseCase as GetCoachIntelligenceUseCase
  participant Compare as Replay comparison

  Internal->>Trace: load trace metadata
  Internal->>UseCase: rerun deterministic aggregation
  UseCase-->>Internal: recalculated aggregate
  Internal->>Compare: compare persisted vs recalculated
  Compare-->>Internal: parity result
```

## 11. Response

The response MUST:

- be stable for the same source snapshot and flag state;
- include the canonical sections defined in `contracts.md`;
- preserve safe empty and partial states;
- be consumable by the mobile app without additional cross-context composition.

The response MUST NOT:

- expose chain-of-thought;
- expose prompt contents;
- expose internal policy reasoning;
- expose raw source-module internals;
- require mobile to merge multiple coach contexts manually.

