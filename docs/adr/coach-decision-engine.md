# ADR — Coach Decision Engine

## Status

Proposed

## Context

Elev9 already produces several high-signal read models:

- `RecoverySnapshot`
- `NutritionRecommendation`
- `AdaptiveTrainingRecommendation`
- `CoachFeedback`
- `CoachChat`
- `ConversationMemory`
- `UserHealthContext`

Today these outputs are consumed independently by dashboard, AI feedback, chat, and debug flows.
That creates duplicated heuristics, inconsistent language, and replay/debug gaps.

The product needs a single deterministic coaching decision that can be consumed by:

- Dashboard
- CoachFeedback
- CoachChat
- ConversationMemory
- Explainability and replay flows

## Decision

Introduce a central read model:

```ts
CoachDecision
```

The MVP will persist one decision per user per day and expose current/today/history/replay reads.
The engine will remain deterministic-first.
LLM is allowed only as a language layer, not as the source of truth for decision content.

The engine will own:

- `CoachDecision`
- `CoachDecisionInfluence`
- formula versioning
- daily persistence
- replay comparison

The engine will consume existing signals from:

- `recovery`
- `nutrition`
- `training`
- `progress`
- `ai` context

The MVP will not replace `CoachChat`.
The MVP will not remove the existing `CoachFeedback` flow.
The MVP will create a canonical decision layer that downstream features can adopt progressively.

## Why Deterministic First

Coaching guidance must be:

- explainable
- replayable
- versioned
- safe without LLM availability
- stable across retries and reads

LLM can improve phrasing, but it must not decide the canonical priority or actions.

## Why Persist Decisions

Persisting the decision provides:

- daily stable state
- history and trend analysis
- idempotent reads
- replay/debug support
- shared consumption by dashboard and AI surfaces

## Read Model Contract

```ts
{
  id: string;
  userProfileId: string;
  date: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  adaptiveTrainingRecommendationId?: string;
  priority: 'recovery' | 'nutrition' | 'training' | 'consistency' | 'motivation';
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluence[];
  sourceContext: object;
  formulaVersion: string;
  generatedBy: 'deterministic' | 'llm_assisted';
  llmMetadata?: {
    provider?: string;
    model?: string;
    used: boolean;
    failed?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Consequences

### Positive

- one canonical coaching decision per day
- simpler downstream consumers
- stable replay/debug surface
- versionable and testable decision logic
- LLM becomes optional and non-blocking

### Negative

- adds persistence and repository complexity
- requires strict boundary between decision and language
- day-boundary behavior must be explicit
- legacy feedback/chat heuristics will coexist during migration

## LLM Strategy

The LLM may:

- rephrase the headline
- rephrase the summary
- rephrase the action items

The LLM must not:

- change `priority`
- change `influences`
- change `sourceContext`
- change `formulaVersion`
- introduce new business actions

If the LLM fails, the deterministic decision remains valid and readable.

## Integration Strategy

1. `recovery`, `nutrition`, `training`, and `progress` produce stable signals.
2. `CoachDecision` consumes those signals and produces the daily decision.
3. `dashboard` reads the decision for the day.
4. `CoachFeedback` derives readable guidance from the decision.
5. `CoachChat` uses the decision as the primary coaching context.
6. `ConversationMemory` stores summaries and references, not raw internal context.
7. `UserHealthContext` continues to aggregate inputs but no longer acts as the final decision layer.

## Related Specs

- [build-coach-decision](../specs/ai/coach-decision/build-coach-decision/README.md)
- [get-current-coach-decision](../specs/ai/coach-decision/get-current-coach-decision/README.md)
- [get-today-coach-decision](../specs/ai/coach-decision/get-today-coach-decision/README.md)
- [get-coach-decision-history](../specs/ai/coach-decision/get-coach-decision-history/README.md)
- [replay-coach-decision](../specs/ai/coach-decision/replay-coach-decision/README.md)

