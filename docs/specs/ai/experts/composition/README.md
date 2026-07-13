# Expert Composition Specification

## 1. Overview

`CoachExpertCompositionService` is the deterministic internal layer that merges routed expert outputs into a single structured intelligence object.

It exists to reconcile multiple specialists after execution without changing the public chat contract, generating prompts, or producing conversational text.

The composition engine is internal-only and does not mutate data, call OpenAI, or invent missing behavioral evidence.

---

## 2. Composition Contract

The composition layer consumes:

- routing decision
- ordered expert results
- ordered expert contributions
- policy metadata
- runtime metadata
- execution metadata

The resulting unified object is then forwarded to the persona engine and explainability layer before prompt assembly.

It emits an immutable unified object containing:

- `primaryExpert`
- `participatingExperts`
- `summary`
- `keyFindings`
- `recommendations`
- `risks`
- `confidence`
- `conflicts`
- `supportingExperts`
- `metadata`

---

## 3. Behavioral Analysis Lifecycle

1. The router selects the participating experts.
2. Each selected expert produces deterministic structured output.
3. The composition engine reads trusted results and contributions only.
4. The engine merges recommendations, risks, confidence, and conflicts deterministically.
5. The unified intelligence object is passed forward to the persona engine, then to the explainability layer, then to the prompt builder as internal metadata only.
6. The explainability layer derives evidence-only structured metadata from the same trusted inputs.

The final coach response remains outside this layer.

---

## 4. Recommendation Merge Model

Recommendations are merged deterministically:

- duplicates are removed by code
- primary expert recommendations are ordered first
- safety-critical recommendations come next
- supporting recommendations follow
- informational recommendations are last

Blocked recommendations are excluded if policy metadata marks them as blocked.

---

## 5. Risk Merge Model

Risk is merged deterministically with the following priority:

```txt
CRITICAL
HIGH
MEDIUM
LOW
UNKNOWN
```

The unified risk becomes the highest applicable level across participating experts.
Source expert ids are retained for traceability.

---

## 6. Confidence Merge Model

Confidence is computed from trusted backend evidence only:

- expert confidence
- routing confidence
- policy approval
- runtime completeness
- execution completeness

The engine never fabricates confidence when signals are sparse.

---

## 7. Conflict Detection and Resolution

The engine detects deterministic conflicts such as:

- workout push vs recovery rest
- workout alignment vs goal alignment mismatch
- nutrition alignment vs goal alignment mismatch

Conflict resolution is deterministic and prefers:

1. safety
2. policy
3. primary expert
4. higher confidence
5. earlier execution order

Conflicts are never hidden.

---

## 8. Runtime Integration

When selected:

```txt
Runtime
↓
Expert Router
↓
Expert Execution
↓
Expert Composition Engine
↓
Coach Persona Engine
↓
Prompt Builder
```

The composition result is internal-only and does not alter the public API or mobile contract.

---

## 9. Related Docs

- [AI Specs Index](../../README.md)
- [Expert Router](../router/README.md)
- [Coach Persona](../../persona/README.md)
- [Explainability](../../explainability/README.md)
- [Expert Observability](../observability/README.md)
- [Prompt Builder](../../prompt-builder/README.md)
- [Agent Execution](../../agent-execution/README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
