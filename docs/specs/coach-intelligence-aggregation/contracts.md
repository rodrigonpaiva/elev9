# Coach Intelligence Aggregation - Conceptual Contract

## 1. Purpose

This document defines the conceptual contract for the Coach Intelligence Aggregate. It does not define TypeScript or DTO code. It defines the meaning, ownership, visibility, freshness, fallback, and security boundaries of the canonical response.

The contract MUST be shared through `packages/types` and consumed by `packages/api-client` and mobile.

## 2. Contract Principles

- The contract MUST be deterministic and user-scoped.
- The contract MUST be readable by mobile without additional cross-context orchestration.
- The contract MUST carry explicit availability and freshness semantics.
- The contract MUST keep internal reasoning and prompt content out of the public payload.
- The contract MUST preserve backward compatibility during rollout.

## 3. Conceptual Sections

| Section                         | Conceptual fields                                                                             | Purpose                                                | Owner                   | Required                                                             | Optional                                              | Fallback                                                     | Freshness    | Visibility                                                         | Security classification                    |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ | ------------ | ------------------------------------------------------------------ | ------------------------------------------ |
| Aggregate envelope              | `aggregateId`, `requestId`, `generatedAt`, `sourceVersion`, `rolloutState`                    | Correlate and version the response                     | AI aggregate use case   | Yes                                                                  | `sourceVersion`, `rolloutState`                       | Preserve request id and generatedAt even on partial fallback | Request-time | Visible                                                            | Public-safe                                |
| Ownership / routing metadata    | `primaryExpert`, `participatingExperts`, `supportingExperts`                                  | Show which coach domains contributed                   | Composition service     | Yes                                                                  | `supportingExperts` when only one expert participated | Empty list if no supporting experts exist                    | Request-time | Visible                                                            | Public-safe, expert names only if approved |
| Summary                         | `summary`, `currentFocus`, `currentRisk`, `topRecommendation`                                 | Provide the user-facing coach summary                  | Composition + mapper    | Yes                                                                  | `currentRisk` if no risk exists                       | Neutral summary when signal density is low                   | Request-time | Visible                                                            | Public-safe                                |
| Key findings                    | `keyFindings[]`                                                                               | Surface structured conclusions                         | Composition service     | Yes                                                                  | `metadata` per finding                                | Empty list when no signals are strong enough                 | Request-time | Visible                                                            | Public-safe                                |
| Recommendations                 | `recommendations[]`                                                                           | Surface deterministic action guidance                  | Composition service     | Yes                                                                  | `metadata` per recommendation                         | Empty list only if no safe recommendation exists             | Request-time | Visible                                                            | Public-safe                                |
| Risks                           | `risks[]`, `currentRisk`                                                                      | Communicate safety or caution                          | Composition + policy    | Yes when risk exists                                                 | `currentRisk` may be null                             | Omit if no risk exists                                       | Request-time | Visible                                                            | Public-safe, safety-sensitive              |
| Confidence                      | `confidence`                                                                                  | Communicate certainty level                            | Composition policy      | Yes                                                                  | `policyConfidence`, `runtimeCompleteness` metadata    | Lowest safe confidence when inputs are sparse                | Request-time | Visible                                                            | Public-safe                                |
| Conflicts                       | `conflicts[]`                                                                                 | Expose deterministic contradiction records             | Composition policy      | Yes                                                                  | `resolution`, `metadata`                              | Empty list when no conflicts exist                           | Request-time | Visible                                                            | Public-safe                                |
| Evidence                        | `evidence[]`                                                                                  | Provide evidence-backed support for conclusions        | Explainability service  | Yes when a rationale is exposed                                      | `detail`, `metadata`                                  | Empty list if explanation is summary-only                    | Request-time | Visible in safe form                                               | Restricted but client-safe summary only    |
| Explainability                  | `decisionReasons[]`, `recommendationReasons[]`, `riskExplanations[]`, `confidenceExplanation` | Explain why the aggregate chose its outputs            | Explainability service  | Yes                                                                  | `policyRestrictions`, `missingEvidence`               | Safe summary-only explanation if evidence is insufficient    | Request-time | Visible in safe form                                               | Restricted                                 |
| Availability                    | `availability[]`, `sectionStatus[]`                                                           | Tell the client what is present, partial, or missing   | Aggregate assembler     | Yes                                                                  | `sourceState`, `degradationReason`                    | Mark section missing or partial                              | Request-time | Visible                                                            | Public-safe                                |
| Freshness                       | `freshness[]`, `asOf`, `sourceTimestamps[]`                                                   | Tell the client how current each section is            | Aggregate assembler     | Yes                                                                  | `cachedAt`, `ageMs`                                   | Use request-time freshness when source time is absent        | Request-time | Visible                                                            | Public-safe                                |
| Warnings                        | `warnings[]`, `safetyLevel`                                                                   | Surface cautions without leaking internals             | Composition + persona   | Conditional                                                          | `reasonCode`, `affectedSections`                      | Empty list when no warning exists                            | Request-time | Visible                                                            | Public-safe, safety-sensitive              |
| Personalization / communication | `persona`, `communicationRules`                                                               | Shape the message style expected by the prompt builder | Persona engine          | Conditional for prompt assembly, not necessarily all mobile surfaces | `technicalDepth`, `encouragementLevel`                | Safe default profile when personalization is absent          | Request-time | Internal to prompt builder, safe subset to client only if approved | Restricted                                 |
| Traceability metadata           | `traceId`, `correlationId`, `debugRef`                                                        | Support observability and replay                       | Observability service   | Yes internally                                                       | `debugRef` for debug-only surfaces                    | Omit from public payload unless approved                     | Request-time | Internal-only by default                                           | Internal-only                              |
| Contract metadata               | `contractVersion`, `featureFlags`, `fallbackMode`                                             | Manage rollout and compatibility                       | Aggregate gate / mapper | Yes                                                                  | `fallbackMode`                                        | Preserve legacy-compatible metadata only                     | Request-time | Visible only if safe                                               | Public-safe                                |

## 4. Section Notes

### 4.1 Aggregate Envelope

This section binds the entire response to a request and version. It MUST exist even when some sections are partial.

### 4.2 Ownership / Routing Metadata

This section describes who contributed to the aggregate. It MUST remain structured and deterministic. It MUST NOT leak internal routing internals or policies.

### 4.3 Summary

This is the shortest user-facing reading of the aggregate. It MUST be stable across screens and MUST derive from backend-owned composition, not mobile heuristics.

### 4.4 Key Findings

Each finding SHOULD be a code-like structured conclusion. It MUST be safe to render without reconstruction.

### 4.5 Recommendations

Each recommendation MUST be deterministic, deduplicated, and ordered by the rules in the specification. It MUST NOT be rewritten by mobile.

### 4.6 Risks

Risk output MUST include the highest applicable risk and its sources. The contract MUST keep risk severity explicit.

### 4.7 Confidence

Confidence MUST be deterministic and derived from evidence, policy, and runtime completeness.

### 4.8 Conflicts

Conflicts MUST be preserved, not hidden. Resolution MUST be deterministic and explainable at the metadata level.

### 4.9 Evidence and Explainability

The public contract MAY expose a safe evidence summary, but it MUST NOT expose chain-of-thought, prompt text, hidden policies, or internal planning steps.

### 4.10 Availability and Freshness

The client MUST be able to distinguish:

- available sections;
- partially available sections;
- missing sections;
- stale sections.

### 4.11 Warnings

Warnings are safety-sensitive. They MUST be explicit and MUST NOT be inferred from hidden logic.

### 4.12 Personalization / Communication

The aggregate MAY include communication guidance when it is needed to render or prompt the Coach experience. This remains restricted and MUST be safe for the consuming surface.

### 4.13 Traceability Metadata

Trace data is internal by default. If exposed at all, it MUST be filtered and explicitly approved.

### 4.14 Contract Metadata

Feature-flag and compatibility metadata help rollout and rollback but MUST not leak implementation detail.

## 5. Fallback Semantics

- If a section is unavailable, the contract MUST represent that state explicitly.
- If a section is stale, the contract MUST include freshness metadata.
- If a safe fallback is used, the contract MUST say so in metadata.
- If no safe fallback exists for the primary insight, the aggregate MUST fail rather than invent a conclusion.

## 6. Security Classification Summary

- Public-safe: summary, recommendations, key findings, risk labels, availability, freshness.
- Restricted: evidence summaries, explainability fields, personalization guidance.
- Internal-only: trace ids, debug references, replay metadata, policy internals.
